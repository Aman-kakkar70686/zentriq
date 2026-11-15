from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import current_user
from ..models import Project, TeamMember, User
from ..schemas import ProjectIn
from ..services import log_activity

router = APIRouter(prefix="/projects", tags=["projects"], dependencies=[Depends(current_user)])


def out(p: Project) -> dict:
    total = len(p.tasks)
    shipped = sum(1 for t in p.tasks if t.status == "shipped")
    return {"id": p.id, "name": p.name, "description": p.description, "status": p.status,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "end_date": p.end_date.isoformat() if p.end_date else None,
            "tasks": total, "progress": round(100 * shipped / total) if total else 0}


@router.get("")
def list_projects(db: Session = Depends(get_db)):
    return [out(p) for p in db.scalars(select(Project).order_by(Project.id)).all()]


@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    return out(p)


@router.post("", status_code=201)
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
    return out(p)
