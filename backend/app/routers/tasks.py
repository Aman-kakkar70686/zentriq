from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import current_user
from ..email_service import render_task_assignment_email, send_email
from ..models import STAGE_LABELS, STAGES, Project, Task, User
from ..schemas import TaskIn, TaskPatch
from ..services import log_activity, task_out

router = APIRouter(prefix="/tasks", tags=["tasks"], dependencies=[Depends(current_user)])
PRIORITIES = {"low", "medium", "high"}


async def _async_send_task_email(task_id: int, assignee_id: int, assigned_by_id: int):
    from ..database import SessionLocal
    bg_db = SessionLocal()
    try:
        t = bg_db.get(Task, task_id)
        assignee = bg_db.get(User, assignee_id)
        assigned_by = bg_db.get(User, assigned_by_id)
        if not t or not assignee or not assignee.email:
            return

        project_name = t.project.name if t.project else "Zentriq Project"
        assigned_by_name = assigned_by.name if assigned_by else "Product Manager"

        subject, html = render_task_assignment_email(
            employee_name=assignee.name,
            task_title=t.title,
            task_description=t.description,
            project_name=project_name,
            priority=t.priority,
            due_date=t.due_date.isoformat() if t.due_date else None,
            task_status=t.status,
            assigned_by_name=assigned_by_name,
            task_id=t.id,
        )
        await send_email(
            bg_db,
            recipient_email=assignee.email,
            subject=subject,
            html_body=html,
            email_type="task_assignment",
            sender_id=assigned_by_id,
            recipient_user_id=assignee.id,
            related_task_id=t.id,
            project_id=t.project_id,
            skip_dedup=True,
        )
    except Exception as exc:
        print(f"Error in task assignment email worker: {exc}")
    finally:
        bg_db.close()


def get_task(db: Session, task_id: int) -> Task:
    t = db.scalar(select(Task).options(selectinload(Task.project), selectinload(Task.assignee)).where(Task.id == task_id))
    if not t:
        raise HTTPException(404, "Task not found")
    return t


def move(db: Session, t: Task, stage: str, me: User):
    if stage not in STAGES:
        raise HTTPException(422, f"Status must be one of {', '.join(STAGES)}")
    if stage == t.status:
        return
    t.status = stage
    if stage == "shipped":
        t.completed_at = datetime.utcnow()
        log_activity(db, kind="completed", action="completed", subject=t.title, user_id=t.assignee_id or me.id, project_id=t.project_id, task_id=t.id)
    else:
        t.completed_at = None
        log_activity(db, kind="moved", action="moved", subject=t.title, detail=f"\u2192 {STAGE_LABELS[stage]}", user_id=me.id, project_id=t.project_id, task_id=t.id)


@router.get("")
def list_tasks(stage: str | None = None, project_id: int | None = None, db: Session = Depends(get_db)):
    q = select(Task).options(selectinload(Task.project), selectinload(Task.assignee)).order_by(Task.id)
    if stage:
        q = q.where(Task.status == stage)
    if project_id:
        q = q.where(Task.project_id == project_id)
    return [task_out(t) for t in db.scalars(q).all()]


@router.get("/{task_id}")
def read_task(task_id: int, db: Session = Depends(get_db)):
    return task_out(get_task(db, task_id))


@router.post("", status_code=201)
async def create_task(body: TaskIn, background_tasks: BackgroundTasks, db: Session = Depends(get_db), me: User = Depends(current_user)):
    project = db.get(Project, body.project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if body.priority not in PRIORITIES or body.status not in STAGES:
        raise HTTPException(422, "Invalid priority or status")
    t = Task(**body.model_dump())
    db.add(t)
    db.flush()
    log_activity(db, kind="created", action="created task", subject=t.title, user_id=me.id, project_id=t.project_id, task_id=t.id)
    assignee = None
    if t.assignee_id:
        assignee = db.get(User, t.assignee_id)
        log_activity(db, kind="assigned", action="assigned", subject=t.title, detail=f"to {assignee.name}" if assignee else None, user_id=me.id, project_id=t.project_id, task_id=t.id)
    db.commit()

    # Trigger automatic task assignment email in background
    if t.assignee_id:
        background_tasks.add_task(_async_send_task_email, t.id, t.assignee_id, me.id)

    return task_out(get_task(db, t.id))


@router.patch("/{task_id}")
async def update_task(task_id: int, body: TaskPatch, background_tasks: BackgroundTasks, db: Session = Depends(get_db), me: User = Depends(current_user)):
    t = get_task(db, task_id)
    data = body.model_dump(exclude_unset=True)
    if "priority" in data and data["priority"] not in PRIORITIES:
        raise HTTPException(422, "Invalid priority")
    if "status" in data:
        move(db, t, data.pop("status"), me)
    if "is_blocked" in data:
        t.blocked_since = datetime.utcnow() if data["is_blocked"] and not t.is_blocked else (t.blocked_since if data["is_blocked"] else None)
        if not data["is_blocked"]:
            data["blocked_reason"] = None

    old_assignee_id = t.assignee_id
    for k, v in data.items():
        setattr(t, k, v)
    db.commit()

    # Trigger automatic email if assignee changed (Section 2)
    if t.assignee_id and t.assignee_id != old_assignee_id:
        background_tasks.add_task(_async_send_task_email, t.id, t.assignee_id, me.id)

    return task_out(get_task(db, task_id))


@router.post("/{task_id}/advance")
def advance(task_id: int, db: Session = Depends(get_db), me: User = Depends(current_user)):
    t = get_task(db, task_id)
    i = STAGES.index(t.status)
    if i == len(STAGES) - 1:
        raise HTTPException(400, "Task is already shipped")
    move(db, t, STAGES[i + 1], me)
    db.commit()
    return task_out(get_task(db, task_id))


@router.post("/{task_id}/resolve")
def resolve(task_id: int, db: Session = Depends(get_db), me: User = Depends(current_user)):
    """Blocked task -> unblock it. Task in review -> approve it (moves to Ready)."""
    t = get_task(db, task_id)
    if t.is_blocked:
        t.is_blocked, t.blocked_reason, t.blocked_since = False, None, None
        log_activity(db, kind="unblocked", action="unblocked", subject=t.title, user_id=me.id, project_id=t.project_id, task_id=t.id)
    elif t.status == "review":
        move(db, t, "ready", me)
    else:
        raise HTTPException(400, "Nothing to resolve on this task")
    db.commit()
    return task_out(get_task(db, task_id))


@router.post("/{task_id}/snooze")
def snooze(task_id: int, db: Session = Depends(get_db)):
    t = get_task(db, task_id)
    t.snoozed_until = datetime.utcnow() + timedelta(days=1)
    db.commit()
    return task_out(t)
