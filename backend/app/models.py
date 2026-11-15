from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

STAGES = ["ideas", "planned", "building", "review", "ready", "shipped"]
STAGE_LABELS = {
    "ideas": "Ideas", "planned": "Planned", "building": "Building",
    "review": "Review", "ready": "Ready", "shipped": "Shipped",
}


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(60), default="Developer")
    designation: Mapped[str | None] = mapped_column(String(100), default="Software Engineer")
    skills: Mapped[str | None] = mapped_column(String(255), default="React, Python")
    github_username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    availability_status: Mapped[str] = mapped_column(String(30), default="available")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active")
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    proposal_doc: Mapped[str | None] = mapped_column(Text, nullable=True)
    srs_doc: Mapped[str | None] = mapped_column(Text, nullable=True)
    tasks: Mapped[list["Task"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="planned")  # one of STAGES
    priority: Mapped[str] = mapped_column(String(10), default="medium")  # low / medium / high
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    blocked_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    blocked_since: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    snoozed_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    task_type: Mapped[str] = mapped_column(String(30), default="feature")  # feature / bug / qa_test
    qa_status: Mapped[str | None] = mapped_column(String(50), nullable=True)  # untested / in_qa / passed / failed / retesting
    bug_severity: Mapped[str | None] = mapped_column(String(30), nullable=True)  # critical / major / minor
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    project: Mapped[Project] = relationship(back_populates="tasks")
    assignee: Mapped[User | None] = relationship(foreign_keys=[assignee_id])


class GitHubSettings(Base):
    __tablename__ = "github_settings"
    id: Mapped[int] = mapped_column(primary_key=True)
    repo_owner: Mapped[str | None] = mapped_column(String(100), nullable=True)
    repo_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    github_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_connected: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TeamMember(Base):
    __tablename__ = "team_members"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(String(60), default="Member")

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    project: Mapped[Project] = relationship(foreign_keys=[project_id])


class Comment(Base):
    __tablename__ = "comments"
    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    kind: Mapped[str] = mapped_column(String(20))  # completed / moved / assigned / risk / decided / unblocked
    action: Mapped[str] = mapped_column(String(120))
    subject: Mapped[str] = mapped_column(String(200))
    detail: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    user: Mapped[User | None] = relationship()


class Decision(Base):
    __tablename__ = "decisions"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    title: Mapped[str] = mapped_column(String(200))
    question: Mapped[str] = mapped_column(String(300))
    options: Mapped[list] = mapped_column(JSON)
    proposal: Mapped[str | None] = mapped_column(String(300), nullable=True)
    proposed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending / decided
    chosen_option: Mapped[str | None] = mapped_column(String(200), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    project: Mapped[Project] = relationship()
    proposed_by: Mapped[User | None] = relationship()


class Meeting(Base):
    __tablename__ = "meetings"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    agenda: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(300), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    attendee_ids: Mapped[list] = mapped_column(JSON, default=list)
    participants: Mapped[int] = mapped_column(Integer, default=0)
    teams_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="scheduled")
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    organizer: Mapped[User | None] = relationship(foreign_keys=[created_by_id])


class EmailLog(Base):
    __tablename__ = "email_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    sender_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    recipient_email: Mapped[str] = mapped_column(String(255), index=True)
    recipient_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    cc: Mapped[list | None] = mapped_column(JSON, nullable=True)
    subject: Mapped[str] = mapped_column(String(255))
    email_body: Mapped[str] = mapped_column(Text)
    email_type: Mapped[str] = mapped_column(String(60), index=True)  # task_assignment / meeting_invitation / meeting_update / meeting_cancellation / direct_email
    related_task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    related_meeting_id: Mapped[int | None] = mapped_column(ForeignKey("meetings.id"), nullable=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    provider_message_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    delivery_status: Mapped[str] = mapped_column(String(30), default="sent", index=True)  # delivered / sent / pending / failed
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    sender: Mapped[User | None] = relationship(foreign_keys=[sender_id])
    recipient: Mapped[User | None] = relationship(foreign_keys=[recipient_user_id])
    task: Mapped[Task | None] = relationship(foreign_keys=[related_task_id])
    meeting: Mapped[Meeting | None] = relationship(foreign_keys=[related_meeting_id])
    project: Mapped[Project | None] = relationship(foreign_keys=[project_id])


class EmailPreference(Base):
    __tablename__ = "email_preferences"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    task_assignment_emails: Mapped[bool] = mapped_column(Boolean, default=True)
    meeting_invitation_emails: Mapped[bool] = mapped_column(Boolean, default=True)
    meeting_update_emails: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped[User] = relationship(foreign_keys=[user_id])


class PRD(Base):
    __tablename__ = "prds"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255))
    feature_name: Mapped[str] = mapped_column(String(255))
    problem_statement: Mapped[str] = mapped_column(Text)
    target_audience: Mapped[str | None] = mapped_column(String(255), nullable=True)
    business_objective: Mapped[str | None] = mapped_column(String(255), nullable=True)
    additional_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_name: Mapped[str] = mapped_column(String(80), default="gemini-2.5-flash")
    status: Mapped[str] = mapped_column(String(50), default="completed")
    content: Mapped[dict] = mapped_column(JSON)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
    generation_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project: Mapped[Project] = relationship()
    user: Mapped[User] = relationship()


class RequirementAnalysis(Base):
    __tablename__ = "requirement_analyses"
    id: Mapped[int] = mapped_column(primary_key=True)
    prd_id: Mapped[int] = mapped_column(ForeignKey("prds.id"))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    model_name: Mapped[str] = mapped_column(String(80), default="gemini-2.5-flash")
    analysis_status: Mapped[str] = mapped_column(String(50), default="completed")
    overall_score: Mapped[int] = mapped_column(Integer, default=0)
    score_label: Mapped[str] = mapped_column(String(50), default="Needs Improvement")
    category_scores: Mapped[dict] = mapped_column(JSON)
    issue_summary: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    prd: Mapped[PRD] = relationship()
    project: Mapped[Project] = relationship()
    user: Mapped[User] = relationship()
    issues: Mapped[list["RequirementIssue"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")


class RequirementIssue(Base):
    __tablename__ = "requirement_issues"
    id: Mapped[int] = mapped_column(primary_key=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("requirement_analyses.id"))
    prd_id: Mapped[int] = mapped_column(ForeignKey("prds.id"))
    issue_type: Mapped[str] = mapped_column(String(30))  # missing, ambiguous, conflicting, incomplete
    severity: Mapped[str] = mapped_column(String(20))  # Critical, High, Medium, Low
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    requirement_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    original_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ambiguous_phrase: Mapped[str | None] = mapped_column(String(200), nullable=True)
    conflict_requirement_b: Mapped[str | None] = mapped_column(Text, nullable=True)
    conflict_ref_b: Mapped[str | None] = mapped_column(String(100), nullable=True)
    missing_elements: Mapped[list | None] = mapped_column(JSON, nullable=True)
    explanation: Mapped[str] = mapped_column(Text)
    evidence: Mapped[str] = mapped_column(Text)
    why_it_matters: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_improvement: Mapped[str] = mapped_column(Text)
    clarification_question: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_status: Mapped[str] = mapped_column(String(30), default="pending")  # pending, accepted, edited, rejected, needs_clarification, resolved
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    analysis: Mapped[RequirementAnalysis] = relationship(back_populates="issues")
    prd: Mapped[PRD] = relationship()
    review_history: Mapped[list["RequirementReviewHistory"]] = relationship(back_populates="issue", cascade="all, delete-orphan")


class RequirementReviewHistory(Base):
    __tablename__ = "requirement_review_history"
    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("requirement_issues.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(50))  # accepted, edited, rejected, needs_clarification, resolved
    previous_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    issue: Mapped[RequirementIssue] = relationship(back_populates="review_history")
    user: Mapped[User] = relationship()


class UserStory(Base):
    __tablename__ = "user_stories"
    id: Mapped[int] = mapped_column(primary_key=True)
    story_key: Mapped[str] = mapped_column(String(50))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    prd_id: Mapped[int] = mapped_column(ForeignKey("prds.id"))
    requirement_id: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(255))
    user_role: Mapped[str] = mapped_column(String(100))
    user_story_text: Mapped[str] = mapped_column(Text)
    functionality: Mapped[str] = mapped_column(Text)
    business_benefit: Mapped[str] = mapped_column(Text)
    business_value: Mapped[str] = mapped_column(String(50), default="High")
    priority: Mapped[str] = mapped_column(String(20), default="P1")
    dependencies: Mapped[list] = mapped_column(JSON, default=list)
    assumptions: Mapped[list] = mapped_column(JSON, default=list)
    open_questions: Mapped[list] = mapped_column(JSON, default=list)
    split_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    clarification_item: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_status: Mapped[str] = mapped_column(String(30), default="pending")  # draft, pending, approved, rejected, needs_clarification
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_converted_to_task: Mapped[bool] = mapped_column(Boolean, default=False)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    validation_results: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project: Mapped[Project] = relationship()
    prd: Mapped[PRD] = relationship()
    reviewed_by: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_id])
    task: Mapped[Task | None] = relationship(foreign_keys=[task_id])
    acceptance_criteria: Mapped[list["AcceptanceCriterion"]] = relationship(back_populates="user_story", cascade="all, delete-orphan")
    edge_cases: Mapped[list["EdgeCase"]] = relationship(back_populates="user_story", cascade="all, delete-orphan")
    qa_test_cases: Mapped[list["QATestCase"]] = relationship(back_populates="user_story", cascade="all, delete-orphan")


class AcceptanceCriterion(Base):
    __tablename__ = "acceptance_criteria"
    id: Mapped[int] = mapped_column(primary_key=True)
    criteria_key: Mapped[str] = mapped_column(String(50))
    story_id: Mapped[int] = mapped_column(ForeignKey("user_stories.id"))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    prd_id: Mapped[int] = mapped_column(ForeignKey("prds.id"))
    requirement_id: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(255))
    scenario_type: Mapped[str] = mapped_column(String(50), default="happy_path")
    given_text: Mapped[str] = mapped_column(Text)
    when_text: Mapped[str] = mapped_column(Text)
    then_text: Mapped[str] = mapped_column(Text)
    review_status: Mapped[str] = mapped_column(String(30), default="pending")
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    validation_results: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user_story: Mapped[UserStory] = relationship(back_populates="acceptance_criteria")
    project: Mapped[Project] = relationship()
    prd: Mapped[PRD] = relationship()
    reviewed_by: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_id])
    qa_test_cases: Mapped[list["QATestCase"]] = relationship(back_populates="acceptance_criterion")


class EdgeCase(Base):
    __tablename__ = "edge_cases"
    id: Mapped[int] = mapped_column(primary_key=True)
    edge_case_key: Mapped[str] = mapped_column(String(50))
    story_id: Mapped[int] = mapped_column(ForeignKey("user_stories.id"))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    prd_id: Mapped[int] = mapped_column(ForeignKey("prds.id"))
    requirement_id: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(60))
    scenario: Mapped[str] = mapped_column(Text)
    trigger_condition: Mapped[str] = mapped_column(Text)
    expected_behaviour: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(20), default="Medium")
    evidence_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    assumptions: Mapped[str | None] = mapped_column(Text, nullable=True)
    clarification_required: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_status: Mapped[str] = mapped_column(String(30), default="pending")
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    validation_results: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user_story: Mapped[UserStory] = relationship(back_populates="edge_cases")
    project: Mapped[Project] = relationship()
    prd: Mapped[PRD] = relationship()
    reviewed_by: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_id])


class QATestCase(Base):
    __tablename__ = "qa_test_cases"
    id: Mapped[int] = mapped_column(primary_key=True)
    test_case_key: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(60))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    prd_id: Mapped[int] = mapped_column(ForeignKey("prds.id"))
    requirement_id: Mapped[str] = mapped_column(String(100))
    story_id: Mapped[int] = mapped_column(ForeignKey("user_stories.id"))
    acceptance_criteria_id: Mapped[int | None] = mapped_column(ForeignKey("acceptance_criteria.id"), nullable=True)
    preconditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    test_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    test_steps: Mapped[list] = mapped_column(JSON, default=list)
    expected_result: Mapped[str] = mapped_column(Text)
    actual_result: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="P1")
    risk_level: Mapped[str] = mapped_column(String(20), default="Medium")
    review_status: Mapped[str] = mapped_column(String(30), default="pending")
    execution_status: Mapped[str] = mapped_column(String(30), default="not_run")
    execution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    executed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    validation_results: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user_story: Mapped[UserStory] = relationship(back_populates="qa_test_cases")
    acceptance_criterion: Mapped[AcceptanceCriterion | None] = relationship(back_populates="qa_test_cases")
    project: Mapped[Project] = relationship()
    prd: Mapped[PRD] = relationship()
    reviewed_by: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_id])
    executed_by: Mapped[User | None] = relationship(foreign_keys=[executed_by_id])


class AIGenerationHistory(Base):
    __tablename__ = "ai_generation_history"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    prd_id: Mapped[int] = mapped_column(ForeignKey("prds.id"))
    requirement_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    generation_type: Mapped[str] = mapped_column(String(60))
    model_name: Mapped[str] = mapped_column(String(80), default="gemini-2.5-flash")
    prompt_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="success")
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    raw_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    parsed_data: Mapped[dict] = mapped_column(JSON, default=dict)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship()
    prd: Mapped[PRD] = relationship()
    user: Mapped[User | None] = relationship()


class ArtifactReviewHistory(Base):
    __tablename__ = "artifact_review_history"
    id: Mapped[int] = mapped_column(primary_key=True)
    artifact_type: Mapped[str] = mapped_column(String(40))
    artifact_id: Mapped[int] = mapped_column(Integer)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(50))
    previous_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    updated_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User | None] = relationship()


class BenchmarkDataset(Base):
    __tablename__ = "benchmark_datasets"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    version: Mapped[str] = mapped_column(String(50), default="v1.0")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project: Mapped[Project] = relationship()
    created_by: Mapped[User | None] = relationship()
    samples: Mapped[list["BenchmarkSample"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")


class BenchmarkSample(Base):
    __tablename__ = "benchmark_samples"
    id: Mapped[int] = mapped_column(primary_key=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("benchmark_datasets.id"))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    sample_key: Mapped[str] = mapped_column(String(60))
    name: Mapped[str] = mapped_column(String(255))
    requirement_description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(80))
    complexity: Mapped[str] = mapped_column(String(40), default="Medium")
    reference_source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    review_status: Mapped[str] = mapped_column(String(40), default="draft")  # draft, pending_review, approved, rejected
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dataset: Mapped[BenchmarkDataset] = relationship(back_populates="samples")
    project: Mapped[Project] = relationship()
    reviewed_by: Mapped[User | None] = relationship()
    expected_outputs: Mapped[list["BenchmarkExpectedOutput"]] = relationship(back_populates="sample", cascade="all, delete-orphan")


class BenchmarkExpectedOutput(Base):
    __tablename__ = "benchmark_expected_outputs"
    id: Mapped[int] = mapped_column(primary_key=True)
    sample_id: Mapped[int] = mapped_column(ForeignKey("benchmark_samples.id"))
    artifact_type: Mapped[str] = mapped_column(String(50))  # user_story, acceptance_criteria, edge_case, qa_test_case, traceability
    expected_data: Mapped[dict | list] = mapped_column(JSON)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    sample: Mapped[BenchmarkSample] = relationship(back_populates="expected_outputs")


class AIEvaluationRun(Base):
    __tablename__ = "ai_evaluation_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_key: Mapped[str] = mapped_column(String(60))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    dataset_id: Mapped[int] = mapped_column(ForeignKey("benchmark_datasets.id"))
    artifact_type: Mapped[str] = mapped_column(String(50), default="all")
    model_name: Mapped[str] = mapped_column(String(80), default="gemini-2.5-flash")
    prompt_version: Mapped[str] = mapped_column(String(50), default="v1.0.0")
    status: Mapped[str] = mapped_column(String(30), default="completed")
    total_samples: Mapped[int] = mapped_column(Integer, default=0)
    precision_score: Mapped[float] = mapped_column(Float, default=0.0)
    recall_score: Mapped[float] = mapped_column(Float, default=0.0)
    f1_score: Mapped[float] = mapped_column(Float, default=0.0)
    json_validity_pct: Mapped[float] = mapped_column(Float, default=100.0)
    traceability_validity_pct: Mapped[float] = mapped_column(Float, default=100.0)
    duplicate_rate_pct: Mapped[float] = mapped_column(Float, default=0.0)
    unsupported_assumption_pct: Mapped[float] = mapped_column(Float, default=0.0)
    human_acceptance_pct: Mapped[float] = mapped_column(Float, default=0.0)
    metrics_summary: Mapped[dict] = mapped_column(JSON, default=dict)
    execution_time_ms: Mapped[int] = mapped_column(Integer, default=0)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship()
    dataset: Mapped[BenchmarkDataset] = relationship()
    created_by: Mapped[User | None] = relationship()
    results: Mapped[list["AIEvaluationResult"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class AIEvaluationResult(Base):
    __tablename__ = "ai_evaluation_results"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("ai_evaluation_runs.id"))
    sample_id: Mapped[int] = mapped_column(ForeignKey("benchmark_samples.id"))
    artifact_type: Mapped[str] = mapped_column(String(50))
    expected_output: Mapped[dict | list] = mapped_column(JSON)
    actual_output: Mapped[dict | list] = mapped_column(JSON)
    match_status: Mapped[str] = mapped_column(String(40), default="correct")  # correct, partially_correct, incorrect, missing, unsupported_assumption
    tp_count: Mapped[int] = mapped_column(Integer, default=0)
    fp_count: Mapped[int] = mapped_column(Integer, default=0)
    fn_count: Mapped[int] = mapped_column(Integer, default=0)
    tn_count: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    error_category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    evaluator_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewer_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    run: Mapped[AIEvaluationRun] = relationship(back_populates="results")
    sample: Mapped[BenchmarkSample] = relationship()
    error_reviews: Mapped[list["AIErrorReview"]] = relationship(back_populates="result", cascade="all, delete-orphan")


class AIErrorReview(Base):
    __tablename__ = "ai_error_reviews"
    id: Mapped[int] = mapped_column(primary_key=True)
    result_id: Mapped[int] = mapped_column(ForeignKey("ai_evaluation_results.id"))
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    error_category: Mapped[str] = mapped_column(String(80))
    severity: Mapped[str] = mapped_column(String(20), default="Medium")
    review_comment: Mapped[str] = mapped_column(Text)
    proposed_prompt_fix: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    result: Mapped[AIEvaluationResult] = relationship(back_populates="error_reviews")
    reviewer: Mapped[User | None] = relationship()


class AIPromptVersion(Base):
    __tablename__ = "ai_prompt_versions"
    id: Mapped[int] = mapped_column(primary_key=True)
    operation: Mapped[str] = mapped_column(String(60))
    version_tag: Mapped[str] = mapped_column(String(40))
    system_prompt: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ShowcasePresentation(Base):
    __tablename__ = "showcase_presentations"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), default="Zentriq — AI-Powered Product Management Intelligence Platform")
    slides_data: Mapped[list] = mapped_column(JSON, default=list)
    last_exported_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by: Mapped[User | None] = relationship()
