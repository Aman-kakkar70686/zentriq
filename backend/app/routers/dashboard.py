from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import current_user
from ..models import ActivityLog, User
from ..schemas import UserOut
from ..services import activity_out, build_overview, team_capacity

router = APIRouter(tags=["dashboard"], dependencies=[Depends(current_user)])


@router.get("/dashboard/overview")
def overview(db: Session = Depends(get_db), me: User = Depends(current_user)):
    return build_overview(db, me)


@router.get("/team/capacity")
def capacity(db: Session = Depends(get_db)):
    return team_capacity(db)


@router.get("/activity")
def activity(limit: int = 20, db: Session = Depends(get_db)):
    rows = db.scalars(select(ActivityLog).options(selectinload(ActivityLog.user))
                      .order_by(ActivityLog.created_at.desc()).limit(min(limit, 100))).all()
    return [activity_out(a) for a in rows]


@router.get("/users", response_model=list[UserOut])
def users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.name)).all()
