import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import current_user
from ..email_service import render_direct_email, send_email
from ..models import EmailLog, EmailPreference, Meeting, Project, Task, User
from ..schemas import EmailPreferenceIn, EmailSendIn

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/emails", tags=["emails"], dependencies=[Depends(current_user)])


def is_privileged_user(user: User) -> bool:
    """Checks if user has manager or admin privileges."""
    r = (user.role or "").lower()
    return any(p in r for p in ["manager", "admin", "lead", "owner"])


def email_log_out(log: EmailLog) -> dict:
    sender_name = log.sender.name if log.sender else "System"
    recipient_name = log.recipient.name if log.recipient else log.recipient_email
    task_title = log.task.title if log.task else None
    meeting_title = log.meeting.title if log.meeting else None
    project_name = log.project.name if log.project else None

    return {
        "id": log.id,
        "sender_id": log.sender_id,
        "sender_name": sender_name,
        "recipient_email": log.recipient_email,
        "recipient_user_id": log.recipient_user_id,
        "recipient_name": recipient_name,
        "cc": log.cc or [],
        "subject": log.subject,
        "email_body": log.email_body,
        "email_type": log.email_type,
        "related_task_id": log.related_task_id,
        "related_task_title": task_title,
        "related_meeting_id": log.related_meeting_id,
        "related_meeting_title": meeting_title,
        "project_id": log.project_id,
        "project_name": project_name,
        "provider_message_id": log.provider_message_id,
        "delivery_status": log.delivery_status,
        "error_message": log.error_message,
        "sent_at": log.sent_at.isoformat() if log.sent_at else None,
        "created_at": log.created_at.isoformat(),
    }


# ==============================================================================
# 1. DIRECT EMAIL COMPOSER (SECTION 4)
# ==============================================================================

@router.post("/send", status_code=status.HTTP_201_CREATED)
async def compose_and_send_email(
    body: EmailSendIn,
    db: Session = Depends(get_db),
    me: User = Depends(current_user),
):
    """
    Direct Email Composer endpoint.
    Validates recipients, enforces RBAC for external addresses,
    and sends direct emails to all selected recipients.
    """
    recipients_to_send: list[tuple[str, Optional[int], str]] = []  # (email, user_id, name)
    is_privileged = is_privileged_user(me)

    # Gather user IDs and email addresses from both typed fields and raw `to`
    target_user_ids = list(body.recipient_user_ids or [])
    target_emails = [e.strip().lower() for e in (body.recipient_emails or []) if e and e.strip()]

    # If `to` was passed, parse emails, user IDs, or names
    if body.to:
        for item in body.to:
            if isinstance(item, int):
                if item not in target_user_ids:
                    target_user_ids.append(item)
            elif isinstance(item, str):
                cleaned = item.strip()
                if not cleaned:
                    continue
                if "@" in cleaned:
                    clean_addr = cleaned.lower()
                    if clean_addr not in target_emails:
                        target_emails.append(clean_addr)
                elif cleaned.isdigit():
                    uid = int(cleaned)
                    if uid not in target_user_ids:
                        target_user_ids.append(uid)
                else:
                    # User name lookup
                    u = db.scalar(select(User).where(func.lower(User.name) == cleaned.lower()))
                    if u and u.id not in target_user_ids:
                        target_user_ids.append(u.id)

    # 1. Resolve internal user recipients
    if target_user_ids:
        users = db.scalars(select(User).where(User.id.in_(target_user_ids))).all()
        for u in users:
            if u.email:
                u_email = u.email.strip().lower()
                if not any(r[0] == u_email for r in recipients_to_send):
                    recipients_to_send.append((u_email, u.id, u.name))

    # 2. Resolve external / raw email recipients
    if target_emails:
        if not is_privileged:
            # Check if any external email does not belong to an internal user
            existing_user_emails = {e.lower().strip() for e in db.scalars(select(User.email)).all() if e}
            unauthorized_externals = [e for e in target_emails if e not in existing_user_emails]
            if unauthorized_externals:
                raise HTTPException(
                    status.HTTP_403_FORBIDDEN,
                    "Only Managers and Administrators have permission to send emails to external non-team addresses.",
                )

        for e in target_emails:
            clean = e.strip().lower()
            if not any(r[0] == clean for r in recipients_to_send):
                u = db.scalar(select(User).where(func.lower(User.email) == clean))
                uid = u.id if u else None
                uname = u.name if u else clean.split("@")[0].capitalize()
                recipients_to_send.append((clean, uid, uname))

    if not recipients_to_send:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Please select at least one valid recipient.",
        )

    project_name = None
    if body.project_id:
        p = db.get(Project, body.project_id)
        project_name = p.name if p else None

    # Parse CC
    cc_list = [c.strip().lower() for c in (body.cc or []) if c.strip()]

    sent_logs = []
    errors = []

    for email_addr, uid, uname in recipients_to_send:
        try:
            html = render_direct_email(
                sender_name=me.name,
                recipient_name=uname,
                subject=body.subject,
                message_content=body.message,
                project_name=project_name,
            )

            log_entry = await send_email(
                db,
                recipient_email=email_addr,
                subject=body.subject,
                html_body=html,
                email_type="direct_email",
                sender_id=me.id,
                recipient_user_id=uid,
                cc=cc_list if cc_list else None,
                related_task_id=body.related_task_id,
                related_meeting_id=body.related_meeting_id,
                project_id=body.project_id,
                skip_dedup=True,
            )
            sent_logs.append(email_log_out(log_entry))
        except Exception as exc:
            logger.error(f"Failed to send direct email to {email_addr}: {exc}")
            errors.append(f"{email_addr}: {str(exc)}")

    return {
        "ok": True,
        "sent_count": len(sent_logs),
        "failed_count": len(errors),
        "logs": sent_logs,
        "errors": errors,
        "message": f"Successfully processed email to {len(sent_logs)} recipient(s).",
    }


# ==============================================================================
# 2. EMAIL CENTER DASHBOARD & HISTORY LOGS (SECTION 5)
# ==============================================================================

@router.get("/metrics")
def get_email_metrics(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    me: User = Depends(current_user),
):
    """
    Computes dashboard metrics from actual database records:
    Total Emails Sent, Successfully Delivered, Failed Emails, Pending Emails.
    """
    q = select(EmailLog)
    is_privileged = is_privileged_user(me)

    if not is_privileged:
        # Non-managers only see metrics for emails they sent or received
        q = q.where(or_(EmailLog.sender_id == me.id, EmailLog.recipient_user_id == me.id, EmailLog.recipient_email == me.email))

    if project_id:
        q = q.where(EmailLog.project_id == project_id)

    logs = db.scalars(q).all()

    total_count = len(logs)
    delivered_count = sum(1 for l in logs if l.delivery_status in ("delivered", "sent"))
    failed_count = sum(1 for l in logs if l.delivery_status == "failed")
    pending_count = sum(1 for l in logs if l.delivery_status == "pending")

    return {
        "total_sent": total_count,
        "delivered": delivered_count,
        "failed": failed_count,
        "pending": pending_count,
    }


@router.get("/logs")
def list_email_logs(
    email_type: Optional[str] = None,
    delivery_status: Optional[str] = None,
    project_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    me: User = Depends(current_user),
):
    """
    Lists email history logs with role-based visibility and filters.
    """
    q = select(EmailLog).options(
        selectinload(EmailLog.sender),
        selectinload(EmailLog.recipient),
        selectinload(EmailLog.task),
        selectinload(EmailLog.meeting),
        selectinload(EmailLog.project),
    )

    is_privileged = is_privileged_user(me)

    if not is_privileged:
        # Role-based restriction: employees can only see their own emails
        q = q.where(
            or_(
                EmailLog.sender_id == me.id,
                EmailLog.recipient_user_id == me.id,
                EmailLog.recipient_email == me.email,
            )
        )

    if email_type and email_type != "all":
        q = q.where(EmailLog.email_type == email_type)

    if delivery_status and delivery_status != "all":
        q = q.where(EmailLog.delivery_status == delivery_status)

    if project_id:
        q = q.where(EmailLog.project_id == project_id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.where(
            or_(
                EmailLog.subject.ilike(term),
                EmailLog.recipient_email.ilike(term),
                EmailLog.email_body.ilike(term),
            )
        )

    total_query = select(func.count(EmailLog.id)).select_from(q.subquery())
    total = db.scalar(total_query) or 0

    logs = db.scalars(q.order_by(EmailLog.created_at.desc()).offset(offset).limit(limit)).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [email_log_out(l) for l in logs],
    }


@router.get("/logs/{log_id}")
def get_email_log_detail(
    log_id: int,
    db: Session = Depends(get_db),
    me: User = Depends(current_user),
):
    """Retrieves full details of a single email log."""
    log = db.scalar(
        select(EmailLog)
        .options(
            selectinload(EmailLog.sender),
            selectinload(EmailLog.recipient),
            selectinload(EmailLog.task),
            selectinload(EmailLog.meeting),
            selectinload(EmailLog.project),
        )
        .where(EmailLog.id == log_id)
    )
    if not log:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Email record not found")

    is_privileged = is_privileged_user(me)
    if not is_privileged and log.sender_id != me.id and log.recipient_user_id != me.id and log.recipient_email != me.email:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied to this email log.")

    return email_log_out(log)


@router.post("/logs/{log_id}/retry")
async def retry_failed_email(
    log_id: int,
    db: Session = Depends(get_db),
    me: User = Depends(current_user),
):
    """Retries sending a failed email log."""
    log = db.get(EmailLog, log_id)
    if not log:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Email record not found")

    is_privileged = is_privileged_user(me)
    if not is_privileged and log.sender_id != me.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the sender or an administrator can retry this email.")

    retried_log = await send_email(
        db,
        recipient_email=log.recipient_email,
        subject=log.subject,
        html_body=log.email_body,
        email_type=log.email_type,
        sender_id=me.id,
        recipient_user_id=log.recipient_user_id,
        cc=log.cc,
        related_task_id=log.related_task_id,
        related_meeting_id=log.related_meeting_id,
        project_id=log.project_id,
        skip_dedup=True,
    )

    return {
        "ok": True,
        "delivery_status": retried_log.delivery_status,
        "error_message": retried_log.error_message,
        "log": email_log_out(retried_log),
    }


# ==============================================================================
# 3. TEAM RECIPIENTS & PREFERENCES (SECTION 4 & 6)
# ==============================================================================

@router.get("/recipients")
def list_email_recipients(
    db: Session = Depends(get_db),
    me: User = Depends(current_user),
):
    """
    Returns the team directory for recipient selection dropdowns.
    """
    users = db.scalars(select(User).order_by(User.name)).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role or "Member",
            "designation": u.designation or "Team Member",
            "availability_status": u.availability_status or "available",
        }
        for u in users
    ]


@router.get("/preferences")
def get_user_email_preferences(
    db: Session = Depends(get_db),
    me: User = Depends(current_user),
):
    """Retrieves current user email notification preferences."""
    pref = db.scalar(select(EmailPreference).where(EmailPreference.user_id == me.id))
    if not pref:
        pref = EmailPreference(user_id=me.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return {
        "task_assignment_emails": pref.task_assignment_emails,
        "meeting_invitation_emails": pref.meeting_invitation_emails,
        "meeting_update_emails": pref.meeting_update_emails,
    }


@router.put("/preferences")
def update_user_email_preferences(
    body: EmailPreferenceIn,
    db: Session = Depends(get_db),
    me: User = Depends(current_user),
):
    """Updates current user email notification preferences."""
    pref = db.scalar(select(EmailPreference).where(EmailPreference.user_id == me.id))
    if not pref:
        pref = EmailPreference(user_id=me.id)
        db.add(pref)

    pref.task_assignment_emails = body.task_assignment_emails
    pref.meeting_invitation_emails = body.meeting_invitation_emails
    pref.meeting_update_emails = body.meeting_update_emails
    pref.updated_at = datetime.utcnow()
    db.commit()

    return {
        "ok": True,
        "message": "Preferences updated.",
        "preferences": {
            "task_assignment_emails": pref.task_assignment_emails,
            "meeting_invitation_emails": pref.meeting_invitation_emails,
            "meeting_update_emails": pref.meeting_update_emails,
        },
    }

