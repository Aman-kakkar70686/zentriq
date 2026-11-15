import os
import sys
import asyncio
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import Base, engine, SessionLocal
from app.models import User, Project, Task, Meeting, EmailLog, EmailPreference
from app.security import hash_password
from app.schemas import TaskIn, TaskPatch, MeetingIn, MeetingUpdateIn, EmailSendIn, EmailPreferenceIn
from app.routers import tasks as tasks_router
from app.routers import decisions as decisions_router
from app.routers import email as email_router

async def run_tests():
    print("=" * 60)
    print("ZENTRIQ — EMAIL & NOTIFICATION CENTER TEST SUITE")
    print("=" * 60)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Setup test users: Manager (Aman) and Employees (Rahul, Arjun)
    print("\n[1] Verifying / Setting up test users...")
    manager = db.query(User).filter(User.email == "aman@zentriq.dev").first()
    if not manager:
        manager = User(name="Aman Kakkar", email="aman@zentriq.dev", password_hash=hash_password("pw"), role="Product Manager")
        db.add(manager)

    dev_user = db.query(User).filter(User.email == "rahul@zentriq.dev").first()
    if not dev_user:
        dev_user = User(name="Rahul Sharma", email="rahul@zentriq.dev", password_hash=hash_password("pw"), role="Developer")
        db.add(dev_user)

    qa_user = db.query(User).filter(User.email == "arjun@zentriq.dev").first()
    if not qa_user:
        qa_user = User(name="Arjun Verma", email="arjun@zentriq.dev", password_hash=hash_password("pw"), role="QA Tester")
        db.add(qa_user)

    proj = db.query(Project).first()
    if not proj:
        proj = Project(name="Zentriq Core Platform", owner_id=manager.id)
        db.add(proj)

    db.commit()
    db.refresh(manager)
    db.refresh(dev_user)
    db.refresh(qa_user)
    db.refresh(proj)

    print(f"  Manager: {manager.name} ({manager.email}) [Role: {manager.role}]")
    print(f"  Developer: {dev_user.name} ({dev_user.email}) [Role: {dev_user.role}]")
    print(f"  QA Tester: {qa_user.name} ({qa_user.email}) [Role: {qa_user.role}]")
    print(f"  Project: {proj.name}")

    # 2. Test Task Creation with Assignee -> Automatic Task Assignment Email
    print("\n[2] Testing Task Assignment Automatic Email Dispatch...")
    initial_log_count = db.query(EmailLog).count()
    
    new_task = await tasks_router.create_task(
        body=TaskIn(
            project_id=proj.id,
            title="Implement OAuth2 Token Refresh",
            description="Ensure refresh token rotation works correctly across mobile and web clients.",
            assignee_id=dev_user.id,
            priority="high",
            status="planned",
            due_date=(datetime.utcnow() + timedelta(days=5)).date()
        ),
        db=db,
        me=manager
    )
    print(f"  Created Task: ID={new_task.id}, Title='{new_task.title}', Assignee={dev_user.name}")

    # Verify EmailLog was created for dev_user
    task_email = db.query(EmailLog).filter(
        EmailLog.related_task_id == new_task.id,
        EmailLog.email_type == "task_assigned"
    ).order_by(EmailLog.id.desc()).first()

    assert task_email is not None, "FAILED: Task assignment email log was not generated!"
    assert task_email.recipient_email == dev_user.email, f"Expected {dev_user.email}, got {task_email.recipient_email}"
    assert "OAuth2 Token Refresh" in task_email.subject
    assert task_email.delivery_status in ["delivered", "sent", "pending"]
    print(f"  ✓ Task assignment email successfully logged to {task_email.recipient_email} [Status: {task_email.delivery_status}]")

    # 3. Test Task Assignee Reassignment -> Automatic Email to New Assignee
    print("\n[3] Testing Task Assignee Change Email Trigger...")
    updated_task = await tasks_router.update_task(
        task_id=new_task.id,
        body=TaskPatch(assignee_id=qa_user.id),
        db=db,
        me=manager
    )
    reassigned_email = db.query(EmailLog).filter(
        EmailLog.related_task_id == new_task.id,
        EmailLog.recipient_email == qa_user.email
    ).order_by(EmailLog.id.desc()).first()

    assert reassigned_email is not None, "FAILED: Reassignment email log not found!"
    assert reassigned_email.recipient_email == qa_user.email
    print(f"  ✓ Reassignment email successfully sent to new assignee {qa_user.email}")

    # 4. Test Meeting Creation with Attendees -> Automatic Meeting Invitation Emails
    print("\n[4] Testing Meeting Creation with Attendees -> Invitation Emails...")
    meeting_start = datetime.utcnow() + timedelta(days=2, hours=10)
    meeting_end = meeting_start + timedelta(minutes=45)

    created_meeting_res = await decisions_router.create_meeting(
        body=MeetingIn(
            title="Sprint 4 QA & Release Review",
            description="Review sprint deliverables, unresolved edge cases, and QA signoff.",
            starts_at=meeting_start,
            ends_at=meeting_end,
            agenda="1. Sprint user stories review\n2. QA regression results\n3. Go/No-go release decision",
            location="Microsoft Teams",
            notes="Please review the QA matrix prior to attending.",
            attendee_ids=[dev_user.id, qa_user.id],
            is_teams=True
        ),
        db=db,
        me=manager
    )
    meeting_id = created_meeting_res["id"]
    print(f"  Created Meeting ID={meeting_id}, Title='{created_meeting_res['title']}' with 2 attendees")

    meeting_invites = db.query(EmailLog).filter(
        EmailLog.related_meeting_id == meeting_id,
        EmailLog.email_type == "meeting_invitation"
    ).all()

    assert len(meeting_invites) >= 2, f"Expected at least 2 invites, got {len(meeting_invites)}"
    invitee_emails = [inv.recipient_email for inv in meeting_invites]
    assert dev_user.email in invitee_emails
    assert qa_user.email in invitee_emails
    print(f"  ✓ Meeting invitations successfully sent to {invitee_emails}")

    # 5. Test Meeting Update (Rescheduling) -> Update Emails
    print("\n[5] Testing Meeting Update Email Dispatch...")
    rescheduled_start = meeting_start + timedelta(hours=2)
    rescheduled_end = rescheduled_start + timedelta(minutes=45)

    await decisions_router.update_meeting(
        meeting_id=meeting_id,
        body=MeetingUpdateIn(
            starts_at=rescheduled_start,
            ends_at=rescheduled_end,
            location="Executive Boardroom 4A & Microsoft Teams"
        ),
        db=db,
        me=manager
    )

    update_emails = db.query(EmailLog).filter(
        EmailLog.related_meeting_id == meeting_id,
        EmailLog.email_type == "meeting_updated"
    ).all()
    assert len(update_emails) >= 2, f"Expected meeting update emails for attendees, got {len(update_emails)}"
    print(f"  ✓ Meeting reschedule notices dispatched to attendees ({[u.recipient_email for u in update_emails]})")

    # 6. Test Meeting Cancellation -> Cancellation Emails
    print("\n[6] Testing Meeting Cancellation Email Dispatch...")
    await decisions_router.cancel_meeting(
        meeting_id=meeting_id,
        body={"status": "cancelled", "reason": "Conflict resolved offline"},
        db=db,
        me=manager
    )

    cancellation_emails = db.query(EmailLog).filter(
        EmailLog.related_meeting_id == meeting_id,
        EmailLog.email_type == "meeting_cancelled"
    ).all()
    assert len(cancellation_emails) >= 2, f"Expected cancellation emails, got {len(cancellation_emails)}"
    print(f"  ✓ Meeting cancellation notices sent to attendees ({[c.recipient_email for c in cancellation_emails]})")

    # 7. Test Direct Email Endpoint (/emails/send)
    print("\n[7] Testing Direct Email Sending (/emails/send)...")
    direct_res = await email_router.send_direct_email(
        payload=EmailSendIn(
            to=[dev_user.email],
            cc=[qa_user.email],
            subject="Architecture Review: Security Headers",
            message="Please review the proposed Content-Security-Policy headers for the staging deployment.",
            email_type="direct",
            project_id=proj.id
        ),
        db=db,
        me=manager
    )
    assert direct_res["success"] is True
    print(f"  ✓ Direct email sent successfully: Log ID={direct_res['log_id']}, Mode={direct_res.get('mode')}")

    # 8. Test Deduplication / Idempotency Window
    print("\n[8] Testing Deduplication / Idempotency Window (60 seconds)...")
    duplicate_res = await email_router.send_direct_email(
        payload=EmailSendIn(
            to=[dev_user.email],
            subject="Architecture Review: Security Headers",
            message="Please review the proposed Content-Security-Policy headers for the staging deployment.",
            email_type="direct",
            project_id=proj.id
        ),
        db=db,
        me=manager
    )
    assert duplicate_res.get("deduplicated") is True, "Expected repeated send to be deduplicated!"
    print(f"  ✓ Idempotency confirmed: repeated message flagged as deduplicated without double delivery.")

    # 9. Test Permissions: Employee restricted from sending external email
    print("\n[9] Testing Role-Based Security: Employee sending to external domain...")
    try:
        await email_router.send_direct_email(
            payload=EmailSendIn(
                to=["external-investor@venturefirm.com"],
                subject="Confidential Roadmap",
                message="Here is our preview roadmap.",
                email_type="direct"
            ),
            db=db,
            me=dev_user  # Developer role
        )
        assert False, "Developer should not have been allowed to send external emails!"
    except Exception as exc:
        print(f"  ✓ Expected permission error caught: {exc.detail}")

    # 10. Test Email Metrics & Logs Querying
    print("\n[10] Testing Email Metrics & Audit Logs...")
    metrics = await email_router.get_email_metrics(db=db, me=manager)
    print(f"  Metrics: Total Sent={metrics['total_sent']}, Delivered={metrics['delivered']}, Failed={metrics['failed']}, Delivery Rate={metrics['delivery_rate']}%")
    assert metrics["total_sent"] > 0
    assert "by_type" in metrics

    logs_res = await email_router.list_email_logs(limit=10, db=db, me=manager)
    assert logs_res["total"] > 0
    print(f"  Audit Trail: Retrieved {len(logs_res['logs'])} records (Total: {logs_res['total']})")

    # 11. Test Email Retry
    print("\n[11] Testing Email Retry Endpoint...")
    sample_log = logs_res["logs"][0]
    retry_res = await email_router.retry_email_log(log_id=sample_log["id"], db=db, me=manager)
    assert retry_res["success"] is True
    print(f"  ✓ Email Log ID={sample_log['id']} retried successfully.")

    # 12. Test Email Preferences (GET & PUT)
    print("\n[12] Testing Email & Notification Preferences...")
    pref_res = await email_router.get_email_preferences(db=db, me=dev_user)
    assert "preferences" in pref_res

    updated_pref = await email_router.update_email_preferences(
        payload=EmailPreferenceIn(
            notify_task_assigned=True,
            notify_meeting_invite=True,
            notify_meeting_update=False,
            notify_direct_email=True,
            email_digest=True
        ),
        db=db,
        me=dev_user
    )
    assert updated_pref["preferences"]["notify_meeting_update"] is False
    assert updated_pref["preferences"]["email_digest"] is True
    print(f"  ✓ Email preferences updated and verified for {dev_user.name}")

    print("\n" + "=" * 60)
    print("ALL EMAIL & NOTIFICATION CENTER TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_tests())
