from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import current_user
from ..models import PRD, Project, Task, TeamMember, User
from ..schemas import ProjectIn, ProjectMemberIn, ProjectUpdateIn
from ..services import log_activity, task_out

router = APIRouter(prefix="/projects", tags=["projects"], dependencies=[Depends(current_user)])


def format_project(p: Project, db: Session, detailed: bool = False) -> dict:
    total = len(p.tasks)
    shipped = sum(1 for t in p.tasks if t.status == "shipped")
    in_progress = sum(1 for t in p.tasks if t.status in ("building", "review", "ready"))

    # Assigned team members
    members_q = db.scalars(
        select(TeamMember).options(selectinload(TeamMember.user)).where(TeamMember.project_id == p.id)
    ).all()
    members = []
    for tm in members_q:
        if tm.user:
            members.append({
                "id": tm.user.id,
                "name": tm.user.name,
                "email": tm.user.email,
                "role": tm.role or tm.user.role,
                "designation": tm.user.designation,
                "availability": tm.user.availability_status,
                "github_username": tm.user.github_username,
            })

    # Sprints / Stages breakdown
    stage_counts = {
        "ideas": sum(1 for t in p.tasks if t.status == "ideas"),
        "planned": sum(1 for t in p.tasks if t.status == "planned"),
        "building": sum(1 for t in p.tasks if t.status == "building"),
        "review": sum(1 for t in p.tasks if t.status == "review"),
        "ready": sum(1 for t in p.tasks if t.status == "ready"),
        "shipped": shipped,
    }

    res = {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "status": p.status,
        "start_date": p.start_date.isoformat() if p.start_date else None,
        "end_date": p.end_date.isoformat() if p.end_date else None,
        "tasks": total,
        "shipped_tasks": shipped,
        "active_tasks": in_progress,
        "progress": round(100 * shipped / total) if total else 0,
        "members": members,
        "members_count": len(members),
        "has_proposal": bool(p.proposal_doc),
        "has_srs": bool(p.srs_doc),
        "has_roadmap": bool(p.roadmap_tree),
        "stage_counts": stage_counts,
        "roadmap_tree": p.roadmap_tree,
    }

    if detailed:
        res["proposal_doc"] = p.proposal_doc or ""
        res["srs_doc"] = p.srs_doc or ""
        res["task_list"] = [task_out(t) for t in sorted(p.tasks, key=lambda x: (x.status == "shipped", x.id))]
        
        # Linked PRDs
        prds_q = db.scalars(select(PRD).where(PRD.project_id == p.id).order_by(PRD.created_at.desc())).all()
        res["linked_prds"] = [{
            "id": prd.id,
            "title": prd.title,
            "problem_statement": prd.problem_statement,
            "target_personas": prd.target_audience,
            "created_at": prd.created_at.isoformat() if prd.created_at else None,
        } for prd in prds_q]

    return res


@router.get("")
def list_projects(db: Session = Depends(get_db)):
    projects = db.scalars(select(Project).options(selectinload(Project.tasks)).order_by(Project.id)).all()
    return [format_project(p, db, detailed=False) for p in projects]


@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    p = db.scalar(select(Project).options(selectinload(Project.tasks)).where(Project.id == project_id))
    if not p:
        raise HTTPException(404, "Project not found")
    return format_project(p, db, detailed=True)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectIn, db: Session = Depends(get_db), me: User = Depends(current_user)):
    if body.start_date and body.end_date and body.end_date < body.start_date:
        raise HTTPException(422, "End date cannot be before the start date")
    p = Project(**body.model_dump(), owner_id=me.id)
    db.add(p)
    db.flush()
    db.add(TeamMember(project_id=p.id, user_id=me.id, role="Product Manager"))
    log_activity(db, kind="created", action="created project", subject=p.name, user_id=me.id, project_id=p.id)
    db.commit()
    db.refresh(p)
    return format_project(p, db, detailed=True)


@router.patch("/{project_id}")
def update_project(project_id: int, body: ProjectUpdateIn, db: Session = Depends(get_db), me: User = Depends(current_user)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(p, field, val)

    log_activity(db, kind="moved", action="updated project details", subject=p.name, user_id=me.id, project_id=p.id)
    db.commit()
    db.refresh(p)
    return format_project(p, db, detailed=True)


@router.get("/{project_id}/roadmap")
def get_project_roadmap(project_id: int, db: Session = Depends(get_db)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    return {
        "project_id": p.id,
        "project_name": p.name,
        "roadmap_tree": p.roadmap_tree,
    }


@router.put("/{project_id}/roadmap")
def save_project_roadmap(project_id: int, body: dict, db: Session = Depends(get_db), me: User = Depends(current_user)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")

    p.roadmap_tree = body.get("roadmap_tree", body)
    log_activity(db, kind="moved", action="updated tree roadmap", subject=p.name, user_id=me.id, project_id=p.id)
    db.commit()
    db.refresh(p)
    return {
        "ok": True,
        "project_id": p.id,
        "roadmap_tree": p.roadmap_tree,
        "message": "Custom tree roadmap saved successfully!",
    }


@router.post("/{project_id}/members", status_code=status.HTTP_201_CREATED)
def assign_project_member(project_id: int, body: ProjectMemberIn, db: Session = Depends(get_db), me: User = Depends(current_user)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    u = db.get(User, body.user_id)
    if not u:
        raise HTTPException(404, "User not found")

    existing = db.scalar(select(TeamMember).where(TeamMember.project_id == project_id, TeamMember.user_id == body.user_id))
    if existing:
        existing.role = body.role
    else:
        tm = TeamMember(project_id=project_id, user_id=body.user_id, role=body.role)
        db.add(tm)

    log_activity(db, kind="assigned", action="assigned to project", subject=u.name, detail=f"to {p.name} as {body.role}", user_id=me.id, project_id=p.id)
    db.commit()
    return format_project(p, db, detailed=True)


@router.delete("/{project_id}/members/{user_id}")
def unassign_project_member(project_id: int, user_id: int, db: Session = Depends(get_db), me: User = Depends(current_user)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")

    tm = db.scalar(select(TeamMember).where(TeamMember.project_id == project_id, TeamMember.user_id == user_id))
    if tm:
        u = db.get(User, user_id)
        u_name = u.name if u else "Member"
        db.delete(tm)
        log_activity(db, kind="moved", action="unassigned from project", subject=u_name, detail=f"from {p.name}", user_id=me.id, project_id=p.id)
        db.commit()

    return format_project(p, db, detailed=True)
