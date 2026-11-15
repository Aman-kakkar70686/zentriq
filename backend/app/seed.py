"""Fills an empty database with demo data.   Run:  python -m app.seed

Login afterwards with  aman@zentriq.dev / zentriq123
"""
from datetime import date, datetime, timedelta

from sqlalchemy import select

from .database import Base, SessionLocal, engine
from .models import ActivityLog, Decision, GitHubSettings, Meeting, PRD, Project, Task, TeamMember, User
from .security import hash_password

PASSWORD = "zentriq123"


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    if db.scalar(select(User).limit(1)):
        print("Database already has data, nothing to do.")
        return
    now, today = datetime.utcnow(), date.today()
    users = {
        "Aman": User(name="Aman Kakkar", email="amankakkar70686@gmail.com", password_hash=hash_password(PASSWORD), role="Product Manager", designation="Lead Product Manager", skills="Product Strategy, Roadmap, Sprint Planning, UX", github_username="Aman-kakkar70686", availability_status="available"),
        "Alfie": User(name="Alfie Mathew", email="alfiebpl85@gmail.com", password_hash=hash_password(PASSWORD), role="Developer", designation="Software Engineer", skills="React, Python, Backend, API Integration", github_username="alfie-dev", availability_status="available"),
        "Rahul": User(name="Rahul", email="rahul@zentriq.dev", password_hash=hash_password(PASSWORD), role="Developer", designation="Lead Full-Stack Developer", skills="Python, FastAPI, React, Node.js, PostgreSQL, Docker", github_username="rahul-dev", availability_status="overloaded"),
        "Arjun": User(name="Arjun", email="arjun@zentriq.dev", password_hash=hash_password(PASSWORD), role="QA Tester", designation="Senior QA & Automation Engineer", skills="Cypress, Jest, PyTest, Selenium, API Testing, Postman", github_username="arjun-qa", availability_status="working"),
        "Priya": User(name="Priya", email="priya@zentriq.dev", password_hash=hash_password(PASSWORD), role="Developer", designation="Senior Frontend Engineer", skills="React, Tailwind CSS, TypeScript, Vite, Performance", github_username="priya-ui", availability_status="working"),
    }
    db.add_all(users.values())
    db.flush()
    U = lambda n: users[n].id if n else None

    projects = {
        "E-Commerce Platform": Project(name="E-Commerce Platform", description="Online store with checkout and payments.", start_date=today - timedelta(days=60), end_date=today + timedelta(days=16), owner_id=U("Aman")),
        "VSLL Logistics Portal": Project(name="VSLL Logistics Portal", description="Shipment tracking and logistics operations.", start_date=today - timedelta(days=50), end_date=today + timedelta(days=4), owner_id=U("Aman")),
        "AI Water System": Project(name="AI Water System", description="Sensor monitoring and alerts for water usage.", start_date=today - timedelta(days=30), end_date=today + timedelta(days=53), owner_id=U("Aman")),
    }
    db.add_all(projects.values())
    db.flush()
    for p in projects.values():
        for name in users:
            r = {"Aman": "Product Manager", "Alfie": "Software Engineer", "Rahul": "Lead Developer", "Arjun": "QA Engineer", "Priya": "Frontend Engineer"}[name]
            db.add(TeamMember(project_id=p.id, user_id=U(name), role=r))

    # (project, title, stage, priority, assignee, due offset in days, blocked reason, days blocked)
    T = [
        ("E-Commerce Platform", "Login and signup", "shipped", "high", "Rahul", -20, None, 0),
        ("E-Commerce Platform", "Wireframes", "shipped", "medium", "Priya", -25, None, 0),
        ("E-Commerce Platform", "Product page", "shipped", "high", "Arjun", -10, None, 0),
        ("E-Commerce Platform", "Cart flow", "shipped", "medium", "Rahul", -6, None, 0),
        ("E-Commerce Platform", "Search V1", "shipped", "medium", "Priya", -4, None, 0),
        ("E-Commerce Platform", "Profile page", "shipped", "low", "Arjun", -3, None, 0),
        ("E-Commerce Platform", "Payment API Integration", "building", "high", "Rahul", 0, "Backend authentication", 2),
        ("E-Commerce Platform", "Auth system", "building", "high", "Rahul", 7, None, 0),
        ("E-Commerce Platform", "Checkout copy review", "building", "medium", "Aman", 2, None, 0),
        ("E-Commerce Platform", "Checkout page QA", "building", "medium", "Arjun", 5, None, 0),
        ("E-Commerce Platform", "Checkout V2", "planned", "medium", "Arjun", 16, None, 0),
        ("E-Commerce Platform", "Saved carts", "ideas", "low", None, None, None, 0),
        ("VSLL Logistics Portal", "Driver app login", "shipped", "medium", "Rahul", -12, None, 0),
        ("VSLL Logistics Portal", "Route planner", "shipped", "high", "Arjun", -8, None, 0),
        ("VSLL Logistics Portal", "Delivery dashboard", "shipped", "medium", "Priya", -5, None, 0),
        ("VSLL Logistics Portal", "Carrier onboarding", "shipped", "medium", "Rahul", -3, None, 0),
        ("VSLL Logistics Portal", "Tracking API", "ready", "high", "Rahul", 1, None, 0),
        ("VSLL Logistics Portal", "Shipment Tracking UI", "review", "high", "Arjun", 2, None, 0),
        ("VSLL Logistics Portal", "Invoice PDF", "review", "low", "Priya", 3, None, 0),
        ("VSLL Logistics Portal", "Order export", "building", "medium", "Arjun", 4, "Carrier API credentials", 1),
        ("VSLL Logistics Portal", "Fleet map", "building", "medium", "Priya", 9, None, 0),
        ("VSLL Logistics Portal", "Customs documents", "building", "high", "Arjun", -3, None, 0),
        ("VSLL Logistics Portal", "Rate card import", "planned", "medium", "Priya", -2, None, 0),
        ("VSLL Logistics Portal", "Notification templates", "planned", "low", "Rahul", -1, None, 0),
        ("VSLL Logistics Portal", "Sprint review notes", "planned", "low", "Aman", 3, None, 0),
        ("VSLL Logistics Portal", "Carrier webhook", "planned", "medium", "Arjun", 6, None, 0),
        ("AI Water System", "Water meter sync", "shipped", "high", "Priya", -6, None, 0),
        ("AI Water System", "Onboarding", "shipped", "medium", "Aman", -2, None, 0),
        ("AI Water System", "Pump telemetry", "shipped", "medium", "Rahul", -1, None, 0),
        ("AI Water System", "Dashboard", "ready", "medium", "Aman", 5, None, 0),
        ("AI Water System", "Sensor Alert System", "building", "high", "Priya", 12, None, 0),
        ("AI Water System", "Alert thresholds", "building", "medium", "Aman", 10, None, 0),
        ("AI Water System", "Leak detection rules", "planned", "medium", "Arjun", 20, None, 0),
        ("AI Water System", "Offline mode", "ideas", "low", None, None, None, 0),
    ]
    tasks = {}
    for proj, title, stage, prio, who, due, reason, days in T:
        t = Task(title=title, status=stage, priority=prio, project_id=projects[proj].id, assignee_id=U(who),
                 due_date=today + timedelta(days=due) if due is not None else None,
                 is_blocked=bool(reason), blocked_reason=reason,
                 blocked_since=now - timedelta(days=days, hours=1) if reason else None,
                 completed_at=now - timedelta(days=5) if stage == "shipped" else None,
                 description={"Shipment Tracking UI": "Tracking timeline, delay states and the empty state. Ready for review."}.get(title))
        db.add(t)
        tasks[title] = t
    db.flush()

    def act(kind, action, subject, proj, who=None, detail=None, minutes=0, days=0):
        db.add(ActivityLog(kind=kind, action=action, subject=subject, detail=detail, project_id=projects[proj].id,
                           user_id=U(who), created_at=now - timedelta(minutes=minutes, days=days)))

    # recent movement (what the "What's Moving" list shows)
    act("completed", "completed", "Payment API sandbox tests", "E-Commerce Platform", "Rahul", minutes=2)
    act("moved", "moved", "Checkout UI", "E-Commerce Platform", "Arjun", "\u2192 Review", minutes=18)
    act("risk", "entered At Risk", "VSLL Logistics Portal", "VSLL Logistics Portal", minutes=42)
    act("assigned", "assigned", "Authentication", "E-Commerce Platform", "Aman", "to Rahul", minutes=60)
    # completions today / this week / last week drive the momentum arrows
    for s in ["Water meter sync", "Onboarding", "Pump telemetry"]:
        act("completed", "completed", s, "AI Water System", "Priya", minutes=120)
    for i in range(4):
        act("completed", "completed", f"E-Commerce task {i + 1}", "E-Commerce Platform", "Rahul", days=2 + i)
    act("completed", "completed", "E-Commerce task 5", "E-Commerce Platform", "Priya", days=9)
    act("completed", "completed", "VSLL task 1", "VSLL Logistics Portal", "Arjun", days=3)
    for i in range(4):
        act("completed", "completed", f"VSLL earlier task {i + 1}", "VSLL Logistics Portal", "Rahul", days=9 + i)

    db.add_all([
        Decision(project_id=projects["E-Commerce Platform"].id, title="Checkout Experience", question="Guest Checkout vs Account First", options=["Guest Checkout", "Account First"], proposal="Remove guest checkout", proposed_by_id=U("Rahul"), created_at=now - timedelta(days=1)),
        Decision(project_id=projects["VSLL Logistics Portal"].id, title="Notification Strategy", question="Email + WhatsApp vs Email only", options=["Email + WhatsApp", "Email only"], created_at=now - timedelta(hours=20)),
        Decision(project_id=projects["E-Commerce Platform"].id, title="API Architecture", question="REST vs GraphQL", options=["REST", "GraphQL"], created_at=now - timedelta(hours=10)),
        Meeting(title="VSLL Sprint Review", starts_at=now + timedelta(hours=2), participants=4, teams_link="https://teams.microsoft.com/l/meetup-join/19%3ameeting_zentriq_demo%40thread.v2/0", created_by_id=U("Aman")),
        GitHubSettings(repo_owner="Aman-kakkar70686", repo_name="zentriq", is_connected=True),
    ])
    db.commit()
    print(f"Seeded demo data. Log in with aman@zentriq.dev / {PASSWORD}")


if __name__ == "__main__":
    run()
