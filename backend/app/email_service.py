"""
Zentriq Email & Notification Service.
Handles transactional email delivery via Resend API, Zentriq-branded HTML email templates,
deduplication/idempotency, and database logging to EmailLog.
"""

import os
import hashlib
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Optional

import httpx
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .config import settings
from .models import EmailLog, EmailPreference, Meeting, Project, Task, User

logger = logging.getLogger(__name__)

# Cache for deduplication (hash -> timestamp)
_DEDUP_CACHE: dict[str, float] = {}
DEDUP_WINDOW_SECONDS = 60.0


def _compute_dedup_key(recipient_email: str, email_type: str, subject: str, entity_id: Optional[int] = None) -> str:
    raw = f"{recipient_email.lower().strip()}:{email_type}:{subject.strip()}:{entity_id or ''}"
    return hashlib.sha256(raw.encode()).hexdigest()


def is_duplicate_request(recipient_email: str, email_type: str, subject: str, entity_id: Optional[int] = None) -> bool:
    key = _compute_dedup_key(recipient_email, email_type, subject, entity_id)
    now = time.time()
    last_sent = _DEDUP_CACHE.get(key)
    if last_sent and (now - last_sent) < DEDUP_WINDOW_SECONDS:
        return True
    _DEDUP_CACHE[key] = now
    # Prune old cache keys
    for k in list(_DEDUP_CACHE.keys()):
        if now - _DEDUP_CACHE[k] > DEDUP_WINDOW_SECONDS * 2:
            del _DEDUP_CACHE[k]
    return False


# ==============================================================================
# HTML EMAIL TEMPLATES (Zentriq Enterprise Forest Green Theme)
# ==============================================================================

def _base_email_template(title: str, content_html: str, action_button: Optional[dict] = None) -> str:
    """Standardized Zentriq email wrapper."""
    action_html = ""
    if action_button and action_button.get("url") and action_button.get("label"):
        action_html = f"""
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
          <tr>
            <td align="left">
              <a href="{action_button['url']}" target="_blank" style="display: inline-block; background-color: #174B3A; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 700; line-height: 1.4; text-decoration: none; padding: 12px 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                {action_button['label']} &rarr;
              </a>
            </td>
          </tr>
        </table>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #202923; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F7F8F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #E5EAE5; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(23, 75, 58, 0.04);">
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #174B3A; padding: 22px 28px; text-align: left;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; line-height: 1.2;">
                      Zentriq
                    </span>
                    <span style="display: inline-block; margin-left: 6px; width: 6px; height: 6px; background-color: #2F765A; border-radius: 50%;"></span>
                    <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 500; color: #DCE9DF; text-transform: uppercase; letter-spacing: 0.8px;">
                      Product Management & Intelligence
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 32px 28px; text-align: left; line-height: 1.6; font-size: 14px; color: #202923;">
              {content_html}
              {action_html}
              <hr style="border: none; border-top: 1px solid #E5EAE5; margin: 24px 0 16px 0;" />
              <p style="margin: 0; font-size: 12px; color: #78847C;">
                Regards,<br />
                <strong style="color: #174B3A;">The Zentriq Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F7F8F5; padding: 18px 28px; text-align: center; font-size: 11px; color: #78847C; border-top: 1px solid #E5EAE5;">
              <p style="margin: 0 0 4px 0;">This email was sent automatically from your Zentriq workspace.</p>
              <p style="margin: 0;">&copy; {datetime.utcnow().year} Zentriq Systems. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def render_task_assignment_email(
    employee_name: str,
    task_title: str,
    task_description: Optional[str],
    project_name: str,
    priority: str,
    due_date: Optional[str],
    task_status: str,
    assigned_by_name: str,
    task_id: int,
) -> tuple[str, str]:
    """Generates (subject, html) for automatic task assignment."""
    subject = f"New Task Assigned – {task_title}"
    task_url = f"{settings.app_base_url}/?drawer=task&id={task_id}"

    priority_color = {
        "high": "#DC2626",
        "medium": "#D97706",
        "low": "#2563EB",
    }.get(priority.lower(), "#202923")

    content_html = f"""
    <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #174B3A;">
      Hello {employee_name},
    </p>
    <p style="margin: 0 0 20px 0; font-size: 13.5px; color: #374151;">
      A new task has been assigned to you in Zentriq. Please review the requirements and update its progress.
    </p>

    <!-- Task Spec Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F7F8F5; border: 1px solid #E5EAE5; border-radius: 10px; margin-bottom: 20px; font-size: 13px;">
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #E5EAE5;">
          <span style="color: #78847C; font-weight: 500;">Task:</span>
          <strong style="color: #202923; margin-left: 8px;">{task_title}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #E5EAE5;">
          <span style="color: #78847C; font-weight: 500;">Project:</span>
          <span style="color: #202923; font-weight: 600; margin-left: 8px;">{project_name}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #E5EAE5;">
          <span style="color: #78847C; font-weight: 500;">Priority:</span>
          <span style="display: inline-block; color: {priority_color}; font-weight: 700; margin-left: 8px; text-transform: uppercase; font-size: 11px;">{priority}</span>
          <span style="color: #E5EAE5; margin: 0 8px;">|</span>
          <span style="color: #78847C; font-weight: 500;">Status:</span>
          <span style="color: #202923; font-weight: 600; margin-left: 8px; text-transform: capitalize;">{task_status}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #E5EAE5;">
          <span style="color: #78847C; font-weight: 500;">Deadline:</span>
          <span style="color: #202923; font-weight: 600; margin-left: 8px;">{due_date or 'No deadline set'}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px;">
          <span style="color: #78847C; font-weight: 500;">Assigned By:</span>
          <span style="color: #202923; font-weight: 600; margin-left: 8px;">{assigned_by_name}</span>
        </td>
      </tr>
      {f'''<tr><td style="padding: 12px 18px; border-top: 1px solid #E5EAE5; color: #4B5563; font-size: 12px;"><em>{task_description}</em></td></tr>''' if task_description else ''}
    </table>
    """

    body = _base_email_template(subject, content_html, {"label": "View Task in Zentriq", "url": task_url})
    return subject, body


def render_meeting_invitation_email(
    employee_name: str,
    meeting_title: str,
    meeting_date: str,
    time_window: str,
    organizer_name: str,
    agenda: Optional[str],
    location_or_link: Optional[str],
    description: Optional[str],
    meeting_id: int,
) -> tuple[str, str]:
    """Generates (subject, html) for meeting invitation."""
    subject = f"Meeting Invitation – {meeting_title}"
    meeting_url = f"{settings.app_base_url}/?drawer=meetings&id={meeting_id}"

    content_html = f"""
    <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #174B3A;">
      Hello {employee_name},
    </p>
    <p style="margin: 0 0 20px 0; font-size: 13.5px; color: #374151;">
      You have been invited to an upcoming team meeting. Please check your schedule and confirm your attendance.
    </p>

    <!-- Meeting Spec Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F7F8F5; border: 1px solid #E5EAE5; border-radius: 10px; margin-bottom: 20px; font-size: 13px;">
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #E5EAE5;">
          <span style="color: #78847C; font-weight: 500;">Meeting:</span>
          <strong style="color: #202923; margin-left: 8px;">{meeting_title}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #E5EAE5;">
          <span style="color: #78847C; font-weight: 500;">Date:</span>
          <strong style="color: #202923; margin-left: 8px;">{meeting_date}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #E5EAE5;">
          <span style="color: #78847C; font-weight: 500;">Time:</span>
          <span style="color: #174B3A; font-weight: 700; margin-left: 8px;">{time_window}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #E5EAE5;">
          <span style="color: #78847C; font-weight: 500;">Organizer:</span>
          <span style="color: #202923; font-weight: 600; margin-left: 8px;">{organizer_name}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #E5EAE5;">
          <span style="color: #78847C; font-weight: 500;">Location / Link:</span>
          <span style="color: #2563EB; font-weight: 600; margin-left: 8px;">{location_or_link or 'Teams Meeting (Link in Zentriq)'}</span>
        </td>
      </tr>
      {f'''<tr><td style="padding: 12px 18px; border-bottom: 1px solid #E5EAE5;"><span style="color: #78847C; font-weight: 500;">Agenda:</span><div style="margin-top: 4px; color: #202923;">{agenda}</div></td></tr>''' if agenda else ''}
      {f'''<tr><td style="padding: 12px 18px; color: #4B5563; font-size: 12px;"><strong>Notes:</strong> {description}</td></tr>''' if description else ''}
    </table>
    """

    # For employees who don't log in, primary action allows joining video room directly
    primary_url = location_or_link if (location_or_link and location_or_link.startswith("http")) else meeting_url
    primary_label = "Join Video Meeting" if (location_or_link and location_or_link.startswith("http")) else "View Meeting in Zentriq"

    body = _base_email_template(subject, content_html, {"label": primary_label, "url": primary_url})
    return subject, body


def render_meeting_update_email(
    employee_name: str,
    meeting_title: str,
    update_type: str,  # 'rescheduled' or 'cancelled' or 'details_updated'
    details_summary: str,
    meeting_date: str,
    time_window: str,
    organizer_name: str,
    meeting_id: int,
) -> tuple[str, str]:
    """Generates (subject, html) for meeting update or cancellation."""
    if update_type == "cancelled":
        subject = f"Cancelled – Meeting: {meeting_title}"
        badge_color = "#DC2626"
        badge_text = "CANCELLED"
    else:
        subject = f"Updated – Meeting: {meeting_title}"
        badge_color = "#D97706"
        badge_text = "SCHEDULE UPDATED"

    meeting_url = f"{settings.app_base_url}/?drawer=meetings&id={meeting_id}"

    content_html = f"""
    <div style="margin-bottom: 16px;">
      <span style="display: inline-block; background-color: {badge_color}; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
        {badge_text}
      </span>
    </div>
    <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #174B3A;">
      Hello {employee_name},
    </p>
    <p style="margin: 0 0 20px 0; font-size: 13.5px; color: #374151;">
      {details_summary}
    </p>

    <!-- Meeting Spec Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F7F8F5; border: 1px solid #E5EAE5; border-radius: 10px; margin-bottom: 20px; font-size: 13px;">
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #E5EAE5;">
          <span style="color: #78847C; font-weight: 500;">Meeting:</span>
          <strong style="color: #202923; margin-left: 8px;">{meeting_title}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #E5EAE5;">
          <span style="color: #78847C; font-weight: 500;">Date:</span>
          <strong style="color: #202923; margin-left: 8px;">{meeting_date}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #E5EAE5;">
          <span style="color: #78847C; font-weight: 500;">Time:</span>
          <span style="color: #174B3A; font-weight: 700; margin-left: 8px;">{time_window}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px;">
          <span style="color: #78847C; font-weight: 500;">Organizer:</span>
          <span style="color: #202923; font-weight: 600; margin-left: 8px;">{organizer_name}</span>
        </td>
      </tr>
    </table>
    """

    action = None if update_type == "cancelled" else {"label": "View Updated Meeting", "url": meeting_url}
    body = _base_email_template(subject, content_html, action)
    return subject, body


def render_direct_email(
    sender_name: str,
    recipient_name: str,
    subject: str,
    message_content: str,
    project_name: Optional[str] = None,
) -> str:
    """Generates HTML for direct manager-to-employee emails."""
    project_pill = f"""
    <div style="margin-bottom: 14px;">
      <span style="display: inline-block; background-color: #DCE9DF; color: #174B3A; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">
        Project: {project_name}
      </span>
    </div>
    """ if project_name else ""

    # Convert line breaks to paragraphs/br
    formatted_message = message_content.replace("\n\n", "</p><p style='margin: 0 0 12px 0;'>").replace("\n", "<br />")

    content_html = f"""
    {project_pill}
    <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #174B3A;">
      Hello {recipient_name},
    </p>
    <div style="font-size: 13.5px; color: #374151; line-height: 1.6; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0;">{formatted_message}</p>
    </div>
    <div style="padding: 12px 16px; background-color: #F7F8F5; border-left: 3px solid #174B3A; border-radius: 4px; font-size: 12px; color: #78847C;">
      Direct message sent by <strong style="color: #202923;">{sender_name}</strong> via Zentriq Email Center.
    </div>
    """

    return _base_email_template(subject, content_html, {"label": "Open Zentriq", "url": settings.app_base_url})


# ==============================================================================
# DISPATCH ENGINE (Resend Provider + DB Logging + Fallback)
# ==============================================================================

async def send_email(
    db: Session,
    *,
    recipient_email: str,
    subject: str,
    html_body: str,
    email_type: str,
    sender_id: Optional[int] = None,
    recipient_user_id: Optional[int] = None,
    cc: Optional[list[str]] = None,
    related_task_id: Optional[int] = None,
    related_meeting_id: Optional[int] = None,
    project_id: Optional[int] = None,
    skip_dedup: bool = False,
) -> EmailLog:
    """
    Sends email via Resend API (or graceful simulated delivery if key omitted/test),
    creates an EmailLog row with delivery status, and returns the EmailLog instance.
    """
    clean_email = recipient_email.strip().lower()

    # Deduplication check
    if not skip_dedup and is_duplicate_request(clean_email, email_type, subject, related_task_id or related_meeting_id):
        logger.info(f"Duplicate email skipped for {clean_email} ({email_type})")
        # Return existing recent log if exists
        recent = db.scalar(
            select(EmailLog)
            .where(EmailLog.recipient_email == clean_email, EmailLog.email_type == email_type)
            .order_by(EmailLog.created_at.desc())
        )
        if recent:
            return recent

    # Check recipient email preferences
    if recipient_user_id:
        pref = db.scalar(select(EmailPreference).where(EmailPreference.user_id == recipient_user_id))
        if pref:
            if email_type == "task_assignment" and not pref.task_assignment_emails:
                logger.info(f"Task assignment emails disabled for user {recipient_user_id}")
                log = EmailLog(
                    sender_id=sender_id,
                    recipient_email=clean_email,
                    recipient_user_id=recipient_user_id,
                    cc=cc,
                    subject=subject,
                    email_body=html_body,
                    email_type=email_type,
                    related_task_id=related_task_id,
                    related_meeting_id=related_meeting_id,
                    project_id=project_id,
                    delivery_status="skipped",
                    error_message="User disabled task assignment email preference.",
                )
                db.add(log)
                db.commit()
                db.refresh(log)
                return log

    # Delivery parameters
    provider_msg_id = None
    delivery_status = "sent"
    error_message = None
    sent_at = datetime.utcnow()

    api_key = (settings.resend_api_key or os.environ.get("RESEND_API_KEY", "")).strip() or None

    if api_key:
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            from_addr = f"{settings.email_from_name} <{settings.email_from_address}>"

            payload: dict[str, Any] = {
                "from": from_addr,
                "to": [clean_email],
                "subject": subject,
                "html": html_body,
            }
            if cc:
                payload["cc"] = [c.strip().lower() for c in cc if c.strip()]

            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post("https://api.resend.com/emails", headers=headers, json=payload)

                if res.status_code in (200, 201):
                    res_data = res.json()
                    provider_msg_id = res_data.get("id")
                    delivery_status = "delivered"
                    logger.info(f"[RESEND SUCCESS] Sent email to {clean_email} | Message ID: {provider_msg_id}")
                    print(f"✓ [RESEND SUCCESS] Sent email to {clean_email} | ID: {provider_msg_id}")
                else:
                    err_json = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
                    err_text = err_json.get("message") or res.text
                    logger.error(f"[RESEND ERROR] Status {res.status_code}: {err_text}")
                    print(f"✗ [RESEND ERROR] Status {res.status_code}: {err_text}")

                    delivery_status = "failed"
                    if res.status_code == 403 and "only send testing emails" in err_text.lower():
                        # Informative error message without hijacking or rerouting to owner's inbox
                        error_message = (
                            f"Resend Sandbox Restriction: onboarding@resend.dev can only deliver to the account owner. "
                            f"To deliver directly to {clean_email}, please verify a custom domain at resend.com/domains."
                        )
                    else:
                        error_message = f"Resend API error {res.status_code}: {err_text}"

        except Exception as exc:
            logger.exception("Failed to connect to Resend API")
            print(f"✗ [RESEND EXCEPTION]: {str(exc)}")
            delivery_status = "failed"
            error_message = f"Connection error: {str(exc)}"

    else:
        # Graceful development mode / fallback:
        # Logs the email delivery locally with simulated message ID so tests and offline workflows succeed.
        logger.info(f"[DEV EMAIL] Sent {email_type} to {clean_email} | Subject: {subject}")
        print(f"ℹ [DEV EMAIL MODE] No RESEND_API_KEY configured. Recorded delivery for {clean_email}")
        provider_msg_id = f"dev_{int(time.time()*1000)}_{hashlib.md5(clean_email.encode()).hexdigest()[:8]}"
        delivery_status = "delivered"

    # Persist log to database
    email_log = EmailLog(
        sender_id=sender_id,
        recipient_email=clean_email,
        recipient_user_id=recipient_user_id,
        cc=cc,
        subject=subject,
        email_body=html_body,
        email_type=email_type,
        related_task_id=related_task_id,
        related_meeting_id=related_meeting_id,
        project_id=project_id,
        provider_message_id=provider_msg_id,
        delivery_status=delivery_status,
        error_message=error_message,
        sent_at=sent_at if delivery_status in ("sent", "delivered") else None,
    )
    db.add(email_log)
    db.commit()
    db.refresh(email_log)
    return email_log

