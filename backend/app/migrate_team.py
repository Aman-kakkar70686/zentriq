import os
import sqlite3
from datetime import datetime

def run_migration():
    db_file = 'zentriq.db' if os.path.exists('zentriq.db') else 'productflow.db'
    con = sqlite3.connect(db_file)
    cur = con.cursor()

    def add_column(table, col, col_type):
        cols = [c[1] for c in cur.execute(f"PRAGMA table_info({table})").fetchall()]
        if col not in cols:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
            print(f"Added {col} to {table}")

    # Add columns to users
    add_column("users", "role", "VARCHAR(60) DEFAULT 'Developer'")
    add_column("users", "designation", "VARCHAR(100) DEFAULT 'Software Engineer'")
    add_column("users", "skills", "VARCHAR(255) DEFAULT 'React, Python, PostgreSQL'")
    add_column("users", "github_username", "VARCHAR(100)")
    add_column("users", "availability_status", "VARCHAR(30) DEFAULT 'available'")

    # Add columns to tasks
    add_column("tasks", "task_type", "VARCHAR(30) DEFAULT 'feature'")
    add_column("tasks", "qa_status", "VARCHAR(50)")
    add_column("tasks", "bug_severity", "VARCHAR(30)")

    # Create github_settings table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS github_settings (
        id INTEGER PRIMARY KEY,
        repo_owner VARCHAR(100),
        repo_name VARCHAR(100),
        github_token VARCHAR(255),
        is_connected BOOLEAN DEFAULT 0,
        updated_at DATETIME
    )
    """)

    # Populate users data
    cur.execute("""
    UPDATE users SET 
        role = 'Product Manager',
        designation = 'Senior Product Manager',
        skills = 'Product Strategy, Roadmap, Sprint Planning, UX',
        github_username = 'amankakkar',
        availability_status = 'available'
    WHERE name = 'Aman'
    """)

    cur.execute("""
    UPDATE users SET 
        role = 'Developer',
        designation = 'Lead Full-Stack Developer',
        skills = 'Python, FastAPI, React, Node.js, PostgreSQL, Docker',
        github_username = 'rahul-dev',
        availability_status = 'overloaded'
    WHERE name = 'Rahul'
    """)

    cur.execute("""
    UPDATE users SET 
        role = 'QA Tester',
        designation = 'Senior QA & Automation Engineer',
        skills = 'Cypress, Jest, PyTest, Selenium, API Testing, Postman',
        github_username = 'arjun-qa',
        availability_status = 'working'
    WHERE name = 'Arjun'
    """)

    cur.execute("""
    UPDATE users SET 
        role = 'Developer',
        designation = 'Senior Frontend Engineer',
        skills = 'React, Tailwind CSS, TypeScript, Vite, Performance',
        github_username = 'priya-ui',
        availability_status = 'working'
    WHERE name = 'Priya'
    """)

    # Update team_members roles to match
    cur.execute("UPDATE team_members SET role = 'Product Manager' WHERE user_id = (SELECT id FROM users WHERE name = 'Aman')")
    cur.execute("UPDATE team_members SET role = 'Lead Developer' WHERE user_id = (SELECT id FROM users WHERE name = 'Rahul')")
    cur.execute("UPDATE team_members SET role = 'QA Engineer' WHERE user_id = (SELECT id FROM users WHERE name = 'Arjun')")
    cur.execute("UPDATE team_members SET role = 'Frontend Engineer' WHERE user_id = (SELECT id FROM users WHERE name = 'Priya')")

    # Update tasks with realistic QA and Bug attributes
    cur.execute("UPDATE tasks SET task_type = 'qa_test', qa_status = 'in_qa' WHERE title LIKE '%QA%'")
    cur.execute("UPDATE tasks SET task_type = 'bug', qa_status = 'failed', bug_severity = 'critical' WHERE is_blocked = 1 AND title LIKE '%Payment%'")
    cur.execute("UPDATE tasks SET task_type = 'bug', qa_status = 'failed', bug_severity = 'major' WHERE is_blocked = 1 AND title LIKE '%Order%'")
    cur.execute("UPDATE tasks SET task_type = 'qa_test', qa_status = 'retesting' WHERE status = 'review'")
    cur.execute("UPDATE tasks SET qa_status = 'passed' WHERE status = 'shipped'")
    cur.execute("UPDATE tasks SET qa_status = 'untested' WHERE qa_status IS NULL AND status IN ('building', 'planned')")

    con.commit()
    con.close()
    print("Migration finished successfully!")

if __name__ == "__main__":
    run_migration()
