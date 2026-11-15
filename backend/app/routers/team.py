import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..config import settings
from ..database import get_db
from ..deps import current_user
from ..models import ActivityLog, GitHubSettings, Project, Task, TeamMember, User
from ..services import log_activity, task_out
from .tasks import _async_send_task_email

router = APIRouter(prefix="/team", tags=["team"], dependencies=[Depends(current_user)])


class MemberUpdateIn(BaseModel):
    role: Optional[str] = None
    designation: Optional[str] = None
    skills: Optional[str] = None
    github_username: Optional[str] = None
    availability_status: Optional[str] = None


class TaskReassignIn(BaseModel):
    assignee_id: Optional[int] = None


class TaskQAUpdateIn(BaseModel):
    qa_status: str
    bug_severity: Optional[str] = None
    note: Optional[str] = None


class GitHubConfigIn(BaseModel):
    repo_owner: str
    repo_name: str
    github_token: Optional[str] = None


@router.get("/workspace")
def get_team_workspace(db: Session = Depends(get_db)):
    users = db.scalars(select(User).order_by(User.id)).all()
    projects = db.scalars(select(Project).options(selectinload(Project.tasks)).order_by(Project.id)).all()
    tasks = db.scalars(select(Task).options(selectinload(Task.project), selectinload(Task.assignee)).order_by(Task.id)).all()
    team_members = db.scalars(select(TeamMember)).all()
    acts = db.scalars(select(ActivityLog).options(selectinload(ActivityLog.user)).order_by(ActivityLog.created_at.desc()).limit(15)).all()

    # User project mappings
    user_projects = {}
    for tm in team_members:
        p = next((proj for proj in projects if proj.id == tm.project_id), None)
        if p:
            user_projects.setdefault(tm.user_id, set()).add(p.name)

    open_tasks = [t for t in tasks if t.status != "shipped"]

    # 1. MEMBERS DATA
    members_list = []
    for u in users:
        u_open = [t for t in open_tasks if t.assignee_id == u.id]
        u_projs = sorted(list(user_projects.get(u.id, set())))
        u_skills = [s.strip() for s in (u.skills or "").split(",") if s.strip()]

        # Compute dynamic availability status if needed
        status = u.availability_status or ("overloaded" if len(u_open) >= 4 else "working" if len(u_open) >= 2 else "available")

        members_list.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role or "Developer",
            "designation": u.designation or "Software Engineer",
            "skills": u_skills,
            "github_username": u.github_username,
            "github_connected": bool(u.github_username),
            "availability_status": status,
            "assigned_projects": u_projs,
            "active_tasks_count": len(u_open),
            "tasks": [task_out(t) for t in u_open],
        })

    # 2. OVERVIEW STATS
    role_counts = {
        "Developers": sum(1 for m in members_list if "developer" in m["role"].lower() or "engineer" in m["role"].lower() and "qa" not in m["role"].lower()),
        "QA Testers": sum(1 for m in members_list if "qa" in m["role"].lower() or "tester" in m["role"].lower()),
        "Product Managers": sum(1 for m in members_list if "manager" in m["role"].lower() or "pm" in m["role"].lower()),
        "Other": sum(1 for m in members_list if not any(k in m["role"].lower() for k in ["developer", "engineer", "qa", "tester", "manager", "pm"]))
    }

    avail_counts = {
        "available": sum(1 for m in members_list if m["availability_status"] == "available"),
        "working": sum(1 for m in members_list if m["availability_status"] == "working"),
        "overloaded": sum(1 for m in members_list if m["availability_status"] == "overloaded"),
    }

    project_allocations = []
    for p in projects:
        assigned_uids = [tm.user_id for tm in team_members if tm.project_id == p.id]
        proj_users = [u.name for u in users if u.id in assigned_uids]
        p_tasks = [t for t in open_tasks if t.project_id == p.id]
        project_allocations.append({
            "id": p.id,
            "name": p.name,
            "member_count": len(proj_users),
            "members": proj_users,
            "open_tasks_count": len(p_tasks),
            "status": p.status,
        })

    # Members requiring attention: overloaded or having blocked tasks
    attention_required = []
    for m in members_list:
        reasons = []
        if m["availability_status"] == "overloaded" or m["active_tasks_count"] >= 4:
            reasons.append(f"High workload ({m['active_tasks_count']} active tasks)")
        blocked_m_tasks = [t for t in m["tasks"] if t["is_blocked"]]
        if blocked_m_tasks:
            reasons.append(f"{len(blocked_m_tasks)} blocked task(s): {blocked_m_tasks[0]['title']}")
        if reasons:
            attention_required.append({
                "id": m["id"],
                "name": m["name"],
                "role": m["role"],
                "reasons": reasons,
                "blocked_tasks_count": len(blocked_m_tasks),
                "tasks_count": m["active_tasks_count"],
            })

    # 3. WORKLOAD & AVAILABILITY
    blocked_tasks_list = [task_out(t) for t in open_tasks if t.is_blocked]
    unassigned_tasks_list = [task_out(t) for t in open_tasks if not t.assignee_id]

    workload_members = []
    for m in members_list:
        workload_members.append({
            "id": m["id"],
            "name": m["name"],
            "role": m["role"],
            "designation": m["designation"],
            "count": m["active_tasks_count"],
            "capacity_limit": settings.capacity_limit,
            "status": m["availability_status"],
            "tasks": m["tasks"],
        })

    # 4. QA & TESTING
    qa_testers = [m for m in members_list if "qa" in m["role"].lower() or "tester" in m["role"].lower()]
    if not qa_testers:
        # Fallback to any member with QA in designation or Arjun
        qa_testers = [m for m in members_list if "qa" in m["designation"].lower() or m["name"] == "Arjun"]

    qa_tasks = [task_out(t) for t in tasks if t.task_type == "qa_test" or t.status in ("review", "ready") or "qa" in t.title.lower()]
    bugs_reported = [task_out(t) for t in tasks if t.task_type == "bug" or t.is_blocked]
    bugs_awaiting_fixes = [t for t in bugs_reported if t["status"] in ("building", "planned") or t["is_blocked"]]
    retesting_queue = [task_out(t) for t in tasks if t.qa_status == "retesting" or t.status == "review"]

    shipped_count = sum(1 for t in tasks if t.status == "shipped")
    total_tested = shipped_count + len(qa_tasks)
    pass_rate = round((shipped_count / max(total_tested, 1)) * 100)

    # 5. GITHUB SETTINGS STATUS
    gh = db.scalars(select(GitHubSettings).limit(1)).first()
    gh_status = {
        "is_connected": gh.is_connected if gh else False,
        "repo_owner": gh.repo_owner if gh else None,
        "repo_name": gh.repo_name if gh else None,
        "has_token": bool(gh and gh.github_token),
        "mapped_count": sum(1 for m in members_list if m["github_connected"]),
        "updated_at": gh.updated_at.isoformat() if gh and gh.updated_at else None,
    }

    return {
        "overview": {
            "total_members": len(members_list),
            "role_counts": role_counts,
            "availability": avail_counts,
            "project_allocations": project_allocations,
            "recent_activity": [{
                "id": a.id, "kind": a.kind, "actor": a.user.name if a.user else "System",
                "action": a.action, "subject": a.subject, "detail": a.detail,
                "created_at": a.created_at.isoformat()
            } for a in acts],
            "attention_required": attention_required,
        },
        "members": members_list,
        "workload": {
            "members": workload_members,
            "available_members": [m for m in workload_members if m["status"] == "available"],
            "overloaded_members": [m for m in workload_members if m["status"] == "overloaded"],
            "blocked_tasks": blocked_tasks_list,
            "unassigned_tasks": unassigned_tasks_list,
        },
        "qa": {
            "qa_testers": qa_testers,
            "testing_tasks": qa_tasks,
            "bugs_reported": bugs_reported,
            "bugs_awaiting_fixes": bugs_awaiting_fixes,
            "retesting_queue": retesting_queue,
            "metrics": {
                "total_tested": total_tested,
                "passed": shipped_count,
                "bugs_open": len(bugs_awaiting_fixes),
                "retesting_count": len(retesting_queue),
                "pass_rate": pass_rate,
            }
        },
        "github": gh_status,
    }


@router.patch("/members/{member_id}")
def update_member_profile(member_id: int, body: MemberUpdateIn, db: Session = Depends(get_db), me: User = Depends(current_user)):
    u = db.get(User, member_id)
    if not u:
        raise HTTPException(404, "User not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(u, k, v)
    db.commit()
    log_activity(db, kind="review", action="updated profile", subject=f"{u.name}'s profile", detail=f"by {me.name}", user_id=me.id)
    return {"ok": True, "id": u.id, "name": u.name}


@router.post("/tasks/{task_id}/reassign")
async def reassign_task(
    task_id: int,
    body: TaskReassignIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    me: User = Depends(current_user),
):
    t = db.get(Task, task_id)
    if not t:
        raise HTTPException(404, "Task not found")

    old_assignee_id = t.assignee_id
    old_assignee = t.assignee.name if t.assignee else "Unassigned"
    new_assignee = None
    if body.assignee_id:
        new_user = db.get(User, body.assignee_id)
        if not new_user:
            raise HTTPException(404, "Assignee not found")
        new_assignee = new_user.name
        t.assignee_id = new_user.id
    else:
        t.assignee_id = None

    db.commit()
    target_str = f"to {new_assignee}" if new_assignee else "unassigned"
    log_activity(db, kind="assigned", action="reassigned", subject=t.title,
                 detail=f"from {old_assignee} {target_str}", user_id=me.id, project_id=t.project_id, task_id=t.id)

    # Automatically dispatch assignment notification email to the new assignee
    if t.assignee_id and t.assignee_id != old_assignee_id:
        background_tasks.add_task(_async_send_task_email, t.id, t.assignee_id, me.id)

    return {"ok": True, "task": task_out(t), "message": f"Task reassigned {target_str}"}


@router.post("/tasks/{task_id}/qa-status")
def update_task_qa_status(task_id: int, body: TaskQAUpdateIn, db: Session = Depends(get_db), me: User = Depends(current_user)):
    t = db.get(Task, task_id)
    if not t:
        raise HTTPException(404, "Task not found")

    t.qa_status = body.qa_status
    if body.bug_severity:
        t.bug_severity = body.bug_severity
        t.task_type = "bug"

    # If marked as passed in QA, can move to ready or keep
    if body.qa_status == "passed" and t.status == "review":
        t.status = "ready"
    elif body.qa_status == "failed":
        t.is_blocked = True
        t.blocked_reason = body.note or "QA verification failed"
        t.blocked_since = datetime.utcnow()

    db.commit()
    log_activity(db, kind="review", action=f"QA: {body.qa_status}", subject=t.title,
                 detail=body.note, user_id=me.id, project_id=t.project_id, task_id=t.id)
    return {"ok": True, "task": task_out(t)}


@router.get("/github/activity")
def get_github_activity(db: Session = Depends(get_db)):
    gh = db.scalars(select(GitHubSettings).limit(1)).first()
    if not gh or not gh.is_connected or not gh.repo_owner or not gh.repo_name:
        return {
            "is_connected": False,
            "message": "GitHub App / Repository is not configured yet. Configure your repository below to fetch live development activity.",
            "commits": [],
            "pull_requests": [],
            "reviews": [],
        }

    owner = gh.repo_owner
    repo = gh.repo_name
    headers = {"User-Agent": "Zentriq-App", "Accept": "application/vnd.github.v3+json"}
    if gh.github_token:
        headers["Authorization"] = f"token {gh.github_token}"

    users = db.scalars(select(User)).all()
    user_gh_map = {u.github_username.lower(): u.name for u in users if u.github_username}

    commits = []
    pull_requests = []

    # Fetch real commits from GitHub API
    try:
        req = urllib.request.Request(f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=15", headers=headers)
        with urllib.request.urlopen(req, timeout=6) as response:
            raw_commits = json.loads(response.read().decode())
            for c in raw_commits:
                author_login = (c.get("author") or {}).get("login", "")
                mapped_member = user_gh_map.get(author_login.lower()) if author_login else None
                mapped_user = None
                if author_login:
                    mapped_user = next((u for u in users if u.github_username and u.github_username.lower() == author_login.lower()), None)
                if not mapped_member:
                    commit_author = c.get("commit", {}).get("author", {})
                    c_name = commit_author.get("name", "").lower()
                    c_email = commit_author.get("email", "").lower()
                    for u in users:
                        if (u.name and u.name.lower() in c_name) or (u.email and u.email.lower() == c_email):
                            mapped_member = u.name
                            mapped_user = u
                            break

                sha_short = c.get("sha", "")[:7]
                msg_short = c.get("commit", {}).get("message", "").split("\n")[0][:100]

                # Sync to ActivityLog so it also shows up on the Overview Dashboard
                existing_act = db.scalar(select(ActivityLog).where(ActivityLog.subject == f"[{sha_short}] {msg_short}"))
                if not existing_act and (mapped_user or mapped_member):
                    u_id = mapped_user.id if mapped_user else None
                    act_entry = ActivityLog(
                        user_id=u_id,
                        kind="code",
                        action="pushed commit",
                        subject=f"[{sha_short}] {msg_short}",
                        detail=f"to {repo}",
                        created_at=datetime.utcnow(),
                    )
                    db.add(act_entry)
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()

                commits.append({
                    "sha": sha_short,
                    "message": msg_short,
                    "author_login": author_login or c.get("commit", {}).get("author", {}).get("name", "Unknown"),
                    "author_avatar": (c.get("author") or {}).get("avatar_url", ""),
                    "mapped_member": mapped_member,
                    "date": c.get("commit", {}).get("author", {}).get("date", ""),
                    "html_url": c.get("html_url", ""),
                })
    except Exception as e:
        # Gracefully handle network/API error
        print("GitHub commits API error:", e)

    # Fetch real PRs from GitHub API
    try:
        req = urllib.request.Request(f"https://api.github.com/repos/{owner}/{repo}/pulls?state=all&per_page=10", headers=headers)
        with urllib.request.urlopen(req, timeout=6) as response:
            raw_prs = json.loads(response.read().decode())
            for p in raw_prs:
                author_login = (p.get("user") or {}).get("login", "")
                mapped_member = user_gh_map.get(author_login.lower()) if author_login else None
                pull_requests.append({
                    "number": p.get("number"),
                    "title": p.get("title"),
                    "state": p.get("state"),
                    "merged_at": p.get("merged_at"),
                    "is_merged": bool(p.get("merged_at")),
                    "author_login": author_login,
                    "mapped_member": mapped_member,
                    "created_at": p.get("created_at"),
                    "html_url": p.get("html_url"),
                    "comments_count": p.get("comments", 0),
                })
    except Exception as e:
        print("GitHub PRs API error:", e)

    return {
        "is_connected": True,
        "repo": f"{owner}/{repo}",
        "commits": commits,
        "pull_requests": pull_requests,
        "stats": {
            "total_commits": len(commits),
            "open_prs": sum(1 for p in pull_requests if p["state"] == "open"),
            "merged_prs": sum(1 for p in pull_requests if p["is_merged"]),
        }
    }


@router.post("/github/config")
def save_github_config(body: GitHubConfigIn, db: Session = Depends(get_db), me: User = Depends(current_user)):
    owner = body.repo_owner.strip()
    repo = body.repo_name.strip()
    token = body.github_token.strip() if body.github_token else None

    # Test repository connection with GitHub API
    headers = {"User-Agent": "Zentriq-App", "Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"

    is_connected = False
    try:
        req = urllib.request.Request(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
        with urllib.request.urlopen(req, timeout=7) as response:
            if response.status in (200, 304):
                is_connected = True
    except urllib.error.HTTPError as e:
        raise HTTPException(e.code, f"GitHub API check failed: {e.reason}. Verify repository owner and name.")
    except Exception as e:
        raise HTTPException(400, f"Could not connect to GitHub: {str(e)}")

    gh = db.scalars(select(GitHubSettings).limit(1)).first()
    if not gh:
        gh = GitHubSettings(repo_owner=owner, repo_name=repo, github_token=token, is_connected=is_connected, updated_at=datetime.utcnow())
        db.add(gh)
    else:
        gh.repo_owner = owner
        gh.repo_name = repo
        gh.github_token = token
        gh.is_connected = is_connected
        gh.updated_at = datetime.utcnow()

    db.commit()
    log_activity(db, kind="review", action="connected repository", subject=f"{owner}/{repo}",
                 detail=f"by {me.name}", user_id=me.id)
    return {"ok": True, "is_connected": is_connected, "repo": f"{owner}/{repo}"}
