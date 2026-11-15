"""Rule-based logic behind the Overview screen. No AI, just queries and simple rules."""
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .config import settings
from .models import STAGE_LABELS, STAGES, ActivityLog, Decision, Meeting, Project, Task, User


def log_activity(db: Session, *, kind, action, subject, detail=None, user_id=None, project_id=None, task_id=None):
    db.add(ActivityLog(kind=kind, action=action, subject=subject, detail=detail,
                       user_id=user_id, project_id=project_id, task_id=task_id))


def task_out(t: Task) -> dict:
    return {
        "id": t.id, "title": t.title, "description": t.description, "status": t.status,
        "priority": t.priority, "due_date": t.due_date.isoformat() if t.due_date else None,
        "project_id": t.project_id, "project": t.project.name if t.project else None,
        "assignee_id": t.assignee_id, "assignee": t.assignee.name if t.assignee else None,
        "assignee_email": t.assignee.email if t.assignee else None,
        "is_blocked": t.is_blocked, "blocked_reason": t.blocked_reason,
        "blocked_days": _days_blocked(t) if t.is_blocked else 0,
        "task_type": getattr(t, "task_type", "feature") or "feature",
        "qa_status": getattr(t, "qa_status", None),
        "bug_severity": getattr(t, "bug_severity", None),
    }


def _days_blocked(t: Task) -> int:
    if not t.blocked_since:
        return 1
    return max(1, (datetime.utcnow() - t.blocked_since).days)


def _plural(n: int, word: str) -> str:
    return f"{n} {word}" + ("" if n == 1 else "s")


def activity_out(a: ActivityLog) -> dict:
    return {"id": a.id, "kind": a.kind, "actor": a.user.name if a.user else None, "action": a.action,
            "subject": a.subject, "detail": a.detail, "created_at": a.created_at.isoformat()}


def team_capacity(db: Session) -> dict:
    users = db.scalars(select(User).order_by(User.id)).all()
    open_tasks = db.scalars(select(Task).where(Task.status != "shipped")).all()
    members, signal = [], None
    for u in users:
        dots = []
        for t in (x for x in open_tasks if x.assignee_id == u.id):
            if t.is_blocked:
                dots.append("blocked")
            elif t.status == "review":
                dots.append("review")
            elif t.status in ("building", "ready"):
                dots.append("active")
            else:
                dots.append("upcoming")
        members.append({"id": u.id, "name": u.name, "count": len(dots), "dots": dots})
    near = [m for m in members if m["count"] >= settings.capacity_limit - 1]
    if near:
        top = max(near, key=lambda m: m["count"])
        signal = {"level": "warn", "text": f"{top['name']} is approaching capacity"}
    else:
        signal = {"level": "ok", "text": "Team capacity looks healthy"}
    return {"members": members, "signal": signal, "limit": settings.capacity_limit}


def build_overview(db: Session, me: User) -> dict:
    now, today = datetime.utcnow(), date.today()
    tasks = db.scalars(select(Task).options(selectinload(Task.project), selectinload(Task.assignee))).all()
    open_tasks = [t for t in tasks if t.status != "shipped"]
    awake = lambda t: not t.snoozed_until or t.snoozed_until <= now

    blocked_all = [t for t in open_tasks if t.is_blocked]
    blocked = sorted([t for t in blocked_all if awake(t)], key=lambda t: t.blocked_since or now)
    reviews = [t for t in open_tasks if t.status == "review" and not t.is_blocked and awake(t)]
    decisions = db.scalars(
        select(Decision).options(selectinload(Decision.project), selectinload(Decision.proposed_by))
        .where(Decision.status == "pending").order_by(Decision.created_at)).all()

    # --- My Focus: blocked first, then a decision, then a review, then the rest, then what's moving
    def f_blocked(t):
        d = _days_blocked(t)
        return {"id": f"task-{t.id}", "kind": "blocked", "ref": t.id, "title": t.title, "project": t.project.name,
                "context": f"Blocked by {t.blocked_reason}", "owner": f"Owner {t.assignee.name}" if t.assignee else None,
                "meta": f"{_plural(d, 'day')} blocked", "days": d, "action": "Open task",
                "detail": f"{t.title} is waiting on {t.blocked_reason}. It can move again once that is resolved.",
                "resolve": "Mark unblocked"}

    def f_decision(d):
        ctx = f"{d.proposed_by.name} proposed: \u201c{d.proposal}\u201d" if d.proposed_by and d.proposal else d.question
        return {"id": f"decision-{d.id}", "kind": "decision", "ref": d.id, "title": d.title, "project": d.project.name,
                "context": ctx, "owner": None, "meta": None, "action": "Review decision",
                "detail": "Options: " + " or ".join(d.options) + ".", "resolve": "Go to decision"}

    def f_review(t):
        return {"id": f"task-{t.id}", "kind": "review", "ref": t.id, "title": t.title, "project": t.project.name,
                "context": "Ready for your review", "owner": f"Submitted by {t.assignee.name}" if t.assignee else None,
                "meta": None, "action": "Review", "detail": t.description or "Open the task to see its details.",
                "resolve": "Approve"}

    fb, fd, fr = [f_blocked(t) for t in blocked], [f_decision(d) for d in decisions], [f_review(t) for t in reviews]
    since = now - timedelta(hours=24)
    done_today = db.scalars(select(ActivityLog).where(ActivityLog.kind == "completed", ActivityLog.created_at >= since)).all()
    by_project: dict[int, int] = {}
    for a in done_today:
        if a.project_id:
            by_project[a.project_id] = by_project.get(a.project_id, 0) + 1
    moving = []
    if by_project:
        pid = max(by_project, key=by_project.get)
        p = db.get(Project, pid)
        moving.append({"id": f"project-{pid}", "kind": "moving", "ref": pid, "title": p.name, "project": p.name,
                       "context": f"{_plural(by_project[pid], 'task')} completed today", "owner": None, "meta": None,
                       "action": "View progress", "detail": "Open the project to see its progress.", "resolve": None})
    head = [x for x in (fb[:1] + fd[:1] + fr[:1])]
    focus = head + fb[1:] + fd[1:] + fr[1:] + moving

    # --- Next best action
    if blocked:
        t = blocked[0]
        nba = {"kind": "blocked", "title": f"Resolve {t.title} blocker",
               "text": f"{t.blocked_reason} has been blocking it for {_plural(_days_blocked(t), 'day')}.",
               "action": "Open Task", "target": {"type": "task", "id": t.id}}
    elif decisions:
        nba = {"kind": "decision", "title": f"Decide: {decisions[0].title}", "text": decisions[0].question,
               "action": "Review", "target": {"type": "decision", "id": decisions[0].id}}
    elif reviews:
        nba = {"kind": "review", "title": f"Review {reviews[0].title}", "text": "It is waiting for your approval.",
               "action": "Review", "target": {"type": "task", "id": reviews[0].id}}
    else:
        nba = {"kind": "clear", "title": "You're all clear", "text": "Nothing is waiting on you.", "action": None, "target": None}

    # --- Flow
    counts = {s: 0 for s in STAGES}
    for t in tasks:
        counts[t.status] = counts.get(t.status, 0) + 1
    flow = [{"key": s, "label": STAGE_LABELS[s], "count": counts[s]} for s in STAGES]
    in_progress = [f for f in flow if f["key"] in ("planned", "building", "review", "ready")]  # shipped/ideas can't be bottlenecks
    top = max(in_progress, key=lambda f: f["count"])
    bottleneck = top["label"] if top["count"] else None

    # --- Project pulse
    week, prev = now - timedelta(days=7), now - timedelta(days=14)
    pulse = []
    for p in db.scalars(select(Project).where(Project.status == "active").order_by(Project.id)).all():
        pt = [t for t in tasks if t.project_id == p.id]
        shipped = sum(1 for t in pt if t.status == "shipped")
        overdue = sum(1 for t in pt if t.status != "shipped" and t.due_date and t.due_date < today)
        logs = db.scalars(select(ActivityLog).where(ActivityLog.project_id == p.id, ActivityLog.kind == "completed",
                                                    ActivityLog.created_at >= prev)).all()
        this_w, last_w = sum(1 for a in logs if a.created_at >= week), sum(1 for a in logs if a.created_at < week)
        momentum = "up" if this_w > last_w else "down" if this_w < last_w else "flat"
        pulse.append({"id": p.id, "name": p.name, "progress": round(100 * shipped / len(pt)) if pt else 0,
                      "status": "At Risk" if overdue else "On Track", "momentum": momentum,
                      "momentum_label": {"up": "Accelerating", "down": "Slowing", "flat": "Stable"}[momentum],
                      "note": f"{_plural(overdue, 'overdue task')}" if overdue else f"{_plural(this_w, 'task')} completed this week",
                      "end_date": p.end_date.isoformat() if p.end_date else None,
                      "tasks": len(pt), "shipped": shipped, "overdue": overdue})

    # --- Deadlines
    dl = sorted([t for t in open_tasks if t.due_date], key=lambda t: t.due_date)
    deadlines = [{"id": t.id, "title": t.title, "project": t.project.name, "due_date": t.due_date.isoformat(),
                  "days": (t.due_date - today).days} for t in dl[:6]]
    due_week = sum(1 for t in dl if (t.due_date - today).days <= 7)

    meeting = db.scalars(select(Meeting).where(Meeting.starts_at >= now - timedelta(minutes=15),
                                               Meeting.status.notin_(["cancelled", "completed", "not_available"])).order_by(Meeting.starts_at)).first()
    acts = db.scalars(select(ActivityLog).options(selectinload(ActivityLog.user)).order_by(ActivityLog.created_at.desc()).limit(6)).all()

    return {
        "me": {"id": me.id, "name": me.name, "email": me.email},
        "metrics": {"decisions": len(decisions), "blockers": len(blocked_all), "deadlines": due_week,
                    "active_tasks": sum(1 for t in open_tasks if t.assignee_id == me.id)},
        "next_best_action": nba, "focus": focus,
        "decisions": [{"id": d.id, "title": d.title, "question": d.question, "options": d.options,
                       "project": d.project.name} for d in decisions],
        "flow": flow, "bottleneck": bottleneck, "projects": pulse, "deadlines": deadlines,
        "team": team_capacity(db), "activity": [activity_out(a) for a in acts],
        "meeting": {"id": meeting.id, "title": meeting.title, "starts_at": meeting.starts_at.isoformat(),
                    "participants": meeting.participants, "teams_link": meeting.teams_link, "status": meeting.status} if meeting else None,
    }
