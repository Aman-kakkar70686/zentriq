from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import current_user
from ..email_service import (
    render_meeting_invitation_email,
    render_meeting_update_email,
    send_email,
)
from ..models import Decision, Meeting, Project, User
from ..schemas import DecideIn, DecisionIn, MeetingIn, MeetingStatusIn, MeetingUpdateIn
from ..services import log_activity

router = APIRouter(tags=["decisions"], dependencies=[Depends(current_user)])


def out(d: Decision) -> dict:
    return {"id": d.id, "title": d.title, "question": d.question, "options": d.options, "status": d.status,
            "chosen_option": d.chosen_option, "project": d.project.name}


@router.get("/decisions")
def list_decisions(status: str | None = None, db: Session = Depends(get_db)):
    q = select(Decision).options(selectinload(Decision.project)).order_by(Decision.created_at)
    if status:
        q = q.where(Decision.status == status)
    return [out(d) for d in db.scalars(q).all()]


@router.post("/decisions", status_code=201)
def create_decision(body: DecisionIn, db: Session = Depends(get_db), me: User = Depends(current_user)):
    if not db.get(Project, body.project_id):
        raise HTTPException(404, "Project not found")
    d = Decision(**body.model_dump(), proposed_by_id=me.id)
    db.add(d)
    db.commit()
    return out(db.scalar(select(Decision).options(selectinload(Decision.project)).where(Decision.id == d.id)))


@router.post("/decisions/{decision_id}/decide")
def decide(decision_id: int, body: DecideIn, db: Session = Depends(get_db), me: User = Depends(current_user)):
    d = db.scalar(select(Decision).options(selectinload(Decision.project)).where(Decision.id == decision_id))
    if not d:
        raise HTTPException(404, "Decision not found")
    if d.status != "pending":
        raise HTTPException(400, "This decision has already been made")
    if body.option not in d.options:
        raise HTTPException(422, "Option is not one of the choices")
    d.status, d.chosen_option, d.decided_at = "decided", body.option, datetime.utcnow()
    log_activity(db, kind="decided", action="decided", subject=d.title, detail=f"\u2192 {body.option}", user_id=me.id, project_id=d.project_id)
    db.commit()
    return out(d)


def meeting_out(m: Meeting, db: Session) -> dict:
    attendee_ids = m.attendee_ids or []
    attendees = []
    if attendee_ids:
        users = db.scalars(select(User).where(User.id.in_(attendee_ids))).all()
        attendees = [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "designation": u.designation} for u in users]

    organizer = db.get(User, m.created_by_id) if m.created_by_id else None

    return {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "starts_at": m.starts_at.isoformat(),
        "ends_at": m.ends_at.isoformat() if m.ends_at else None,
        "agenda": m.agenda,
        "location": m.location,
        "notes": m.notes,
        "attendee_ids": attendee_ids,
        "attendees": attendees,
        "participants": m.participants,
        "teams_link": m.teams_link,
        "status": m.status,
        "created_by_id": m.created_by_id,
        "organizer_name": organizer.name if organizer else "Organizer",
    }


@router.get("/meetings")
def list_meetings(db: Session = Depends(get_db)):
    rows = db.scalars(select(Meeting).where(
        Meeting.starts_at >= datetime.utcnow() - timedelta(hours=24),
        Meeting.status.notin_(["cancelled", "completed", "not_available"])
    ).order_by(Meeting.starts_at)).all()
    return [meeting_out(m, db) for m in rows]


@router.get("/meetings/{meeting_id}")
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    m = db.get(Meeting, meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting_out(m, db)


async def _async_send_invites(meeting_id: int, organizer_id: int, attendee_ids: list[int]):
    from ..database import SessionLocal
    bg_db = SessionLocal()
    try:
        m = bg_db.get(Meeting, meeting_id)
        organizer = bg_db.get(User, organizer_id)
        if not m:
            return
        organizer_name = organizer.name if organizer else "Organizer"
        meeting_date = m.starts_at.strftime("%A, %B %d, %Y")
        start_str = m.starts_at.strftime("%I:%M %p")
        end_str = m.ends_at.strftime("%I:%M %p") if m.ends_at else "45 mins"
        time_window = f"{start_str} – {end_str}"
        location_or_link = m.location or m.teams_link or "Microsoft Teams Meeting"

        final_ids = list(attendee_ids)
        if not final_ids:
            aman = bg_db.query(User).filter(User.email.ilike("%amankakkar70686%")).first()
            if aman:
                final_ids = [aman.id]

        attendees = bg_db.scalars(select(User).where(User.id.in_(final_ids))).all()
        for att in attendees:
            if att.email:
                try:
                    subject, html = render_meeting_invitation_email(
                        employee_name=att.name,
                        meeting_title=m.title,
                        meeting_date=meeting_date,
                        time_window=time_window,
                        organizer_name=organizer_name,
                        agenda=m.agenda,
                        location_or_link=location_or_link,
                        description=m.description or m.notes,
                        meeting_id=m.id,
                    )
                    await send_email(
                        bg_db,
                        recipient_email=att.email,
                        subject=subject,
                        html_body=html,
                        email_type="meeting_invitation",
                        sender_id=organizer_id,
                        recipient_user_id=att.id,
                        related_meeting_id=m.id,
                        skip_dedup=True,
                    )
                except Exception as exc:
                    print(f"Error sending invite email: {exc}")
    except Exception as exc:
        print(f"Error in background invitation dispatch: {exc}")
    finally:
        bg_db.close()


@router.post("/meetings", status_code=201)
async def create_meeting(body: MeetingIn, background_tasks: BackgroundTasks, db: Session = Depends(get_db), me: User = Depends(current_user)):
    data = body.model_dump()
    attendee_ids = data.get("attendee_ids") or []
    
    # If no attendees selected, default to Aman
    if not attendee_ids:
        aman = db.query(User).filter(User.email.ilike("%amankakkar70686%")).first()
        if aman:
            attendee_ids = [aman.id]
            data["attendee_ids"] = attendee_ids

    participants = max(data.get("participants", 0), len(attendee_ids), 1)
    data["participants"] = participants

    starts_at = data["starts_at"]
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=None)
    else:
        starts_at = starts_at.astimezone().replace(tzinfo=None)
    data["starts_at"] = starts_at

    # Prevent scheduling meetings in the past (allow 2-minute buffer for network/clock differences)
    now_utc = datetime.utcnow()
    if starts_at < (now_utc - timedelta(minutes=2)):
        raise HTTPException(
            status_code=400,
            detail="Meeting cannot be scheduled in the past. Please select a present or future date and time.",
        )

    ends_at = data.get("ends_at")
    if ends_at:
        ends_at = ends_at.replace(tzinfo=None) if ends_at.tzinfo is None else ends_at.astimezone().replace(tzinfo=None)
        data["ends_at"] = ends_at
    else:
        data["ends_at"] = starts_at + timedelta(minutes=45)

    valid_cols = {"title", "description", "starts_at", "ends_at", "agenda", "location", "notes", "attendee_ids", "participants", "teams_link", "status"}
    filtered_data = {k: v for k, v in data.items() if k in valid_cols}

    m = Meeting(**filtered_data, created_by_id=me.id)
    db.add(m)
    db.commit()
    db.refresh(m)

    # Dispatch email invitations asynchronously in background (zero blocking)
    background_tasks.add_task(_async_send_invites, m.id, me.id, attendee_ids)

    return meeting_out(m, db)


@router.patch("/meetings/{meeting_id}")
async def update_meeting(meeting_id: int, body: MeetingUpdateIn, db: Session = Depends(get_db), me: User = Depends(current_user)):
    m = db.get(Meeting, meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")

    data = body.model_dump(exclude_unset=True)

    old_starts_at = m.starts_at
    old_ends_at = m.ends_at
    old_location = m.location
    old_attendee_ids = list(m.attendee_ids or [])

    # Process timezone stripping
    if "starts_at" in data and data["starts_at"]:
        s = data["starts_at"]
        data["starts_at"] = s.replace(tzinfo=None) if s.tzinfo is None else s.astimezone().replace(tzinfo=None)
    if "ends_at" in data and data["ends_at"]:
        e = data["ends_at"]
        data["ends_at"] = e.replace(tzinfo=None) if e.tzinfo is None else e.astimezone().replace(tzinfo=None)

    for k, v in data.items():
        setattr(m, k, v)

    if "attendee_ids" in data:
        m.participants = max(m.participants, len(m.attendee_ids or []))

    db.commit()
    db.refresh(m)

    # Detect updates and notify attendees (Section 3)
    new_attendee_ids = list(m.attendee_ids or [])
    added_attendee_ids = [uid for uid in new_attendee_ids if uid not in old_attendee_ids]
    time_or_loc_changed = (m.starts_at != old_starts_at) or (m.ends_at != old_ends_at) or (m.location != old_location)

    meeting_date = m.starts_at.strftime("%A, %B %d, %Y")
    start_str = m.starts_at.strftime("%I:%M %p")
    end_str = m.ends_at.strftime("%I:%M %p") if m.ends_at else "45 mins"
    time_window = f"{start_str} – {end_str}"
    location_or_link = m.location or m.teams_link or "Microsoft Teams Meeting"

    # 1. Send invitations to newly added attendees
    if added_attendee_ids:
        new_users = db.scalars(select(User).where(User.id.in_(added_attendee_ids))).all()
        for nu in new_users:
            if nu.email:
                try:
                    subject, html = render_meeting_invitation_email(
                        employee_name=nu.name,
                        meeting_title=m.title,
                        meeting_date=meeting_date,
                        time_window=time_window,
                        organizer_name=me.name,
                        agenda=m.agenda,
                        location_or_link=location_or_link,
                        description=m.description or m.notes,
                        meeting_id=m.id,
                    )
                    await send_email(
                        db,
                        recipient_email=nu.email,
                        subject=subject,
                        html_body=html,
                        email_type="meeting_invitation",
                        sender_id=me.id,
                        recipient_user_id=nu.id,
                        related_meeting_id=m.id,
                    )
                except Exception:
                    pass

    # 2. Notify existing attendees if date/time/location changed
    if time_or_loc_changed and old_attendee_ids:
        existing_users = db.scalars(select(User).where(User.id.in_(old_attendee_ids))).all()
        summary = f"The schedule or location for '{m.title}' has been modified by {me.name}. Please review the updated time and link."
        for eu in existing_users:
            if eu.email:
                try:
                    subject, html = render_meeting_update_email(
                        employee_name=eu.name,
                        meeting_title=m.title,
                        update_type="rescheduled",
                        details_summary=summary,
                        meeting_date=meeting_date,
                        time_window=time_window,
                        organizer_name=me.name,
                        meeting_id=m.id,
                    )
                    await send_email(
                        db,
                        recipient_email=eu.email,
                        subject=subject,
                        html_body=html,
                        email_type="meeting_update",
                        sender_id=me.id,
                        recipient_user_id=eu.id,
                        related_meeting_id=m.id,
                    )
                except Exception:
                    pass

    return meeting_out(m, db)


@router.post("/meetings/{meeting_id}/cancel")
async def cancel_meeting(meeting_id: int, body: MeetingStatusIn | None = None, db: Session = Depends(get_db), me: User = Depends(current_user)):
    m = db.get(Meeting, meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    status = body.status if body and body.status else "cancelled"
    reason = body.reason if body and body.reason else "Meeting cancelled by organizer"
    m.status = status
    db.commit()
    log_activity(db, kind="blocked", action="declined", subject=m.title, detail=f"{me.name}: {reason}", user_id=me.id)

    # Notify attendees of cancellation (Section 3)
    attendee_ids = m.attendee_ids or []
    if attendee_ids:
        meeting_date = m.starts_at.strftime("%A, %B %d, %Y")
        time_window = m.starts_at.strftime("%I:%M %p")
        attendees = db.scalars(select(User).where(User.id.in_(attendee_ids))).all()
        for att in attendees:
            if att.email:
                try:
                    subject, html = render_meeting_update_email(
                        employee_name=att.name,
                        meeting_title=m.title,
                        update_type="cancelled",
                        details_summary=f"This meeting has been cancelled. Reason provided: {reason}",
                        meeting_date=meeting_date,
                        time_window=time_window,
                        organizer_name=me.name,
                        meeting_id=m.id,
                    )
                    await send_email(
                        db,
                        recipient_email=att.email,
                        subject=subject,
                        html_body=html,
                        email_type="meeting_cancellation",
                        sender_id=me.id,
                        recipient_user_id=att.id,
                        related_meeting_id=m.id,
                    )
                except Exception:
                    pass

    return {"ok": True, "id": m.id, "status": m.status, "reason": reason}


@router.delete("/meetings/{meeting_id}")
def delete_meeting(meeting_id: int, db: Session = Depends(get_db), me: User = Depends(current_user)):
    m = db.get(Meeting, meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    title = m.title
    db.delete(m)
    db.commit()
    log_activity(db, kind="review", action="removed", subject=title, detail=f"{me.name} deleted meeting", user_id=me.id)
    return {"ok": True, "message": "Meeting deleted"}
