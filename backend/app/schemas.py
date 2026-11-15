from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class ProjectUpdateIn(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    proposal_doc: str | None = None
    srs_doc: str | None = None
    roadmap_tree: dict | list | None = None


class ProjectMemberIn(BaseModel):
    user_id: int
    role: str = "Member"


class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    project_id: int
    assignee_id: int | None = None
    priority: str = "medium"
    status: str = "planned"
    due_date: date | None = None


class TaskPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee_id: int | None = None
    priority: str | None = None
    status: str | None = None
    due_date: date | None = None
    is_blocked: bool | None = None
    blocked_reason: str | None = None


class DecisionIn(BaseModel):
    project_id: int
    title: str = Field(min_length=1, max_length=200)
    question: str = Field(min_length=1, max_length=300)
    options: list[str] = Field(min_length=2)
    proposal: str | None = None


class DecideIn(BaseModel):
    option: str


class MeetingIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    starts_at: datetime
    ends_at: datetime | None = None
    description: str | None = None
    agenda: str | None = None
    location: str | None = None
    notes: str | None = None
    attendee_ids: list[int] = Field(default_factory=list)
    participants: int = 0
    teams_link: str | None = None
    status: str = "scheduled"


class MeetingStatusIn(BaseModel):
    status: str = "cancelled"
    reason: str | None = "Not available"


class PRDGenerateIn(BaseModel):
    project_id: int
    feature_name: str = Field(min_length=1, max_length=255)
    problem_statement: str = Field(min_length=10)
    target_audience: str | None = None
    business_objective: str | None = None
    additional_context: str | None = None
    model_name: str = "gemini-2.5-flash"


class PRDCreateIn(BaseModel):
    project_id: int
    title: str = Field(min_length=1, max_length=255)
    feature_name: str = Field(min_length=1, max_length=255)
    problem_statement: str
    target_audience: str | None = None
    business_objective: str | None = None
    additional_context: str | None = None
    model_name: str = "gemini-2.5-flash"
    status: str = "completed"
    content: dict
    tokens_used: int = 0
    generation_time_ms: int = 0


class AnalysePRDIn(BaseModel):
    prd_id: int
    model_name: str = "gemini-2.5-flash"


class IssueReviewPatchIn(BaseModel):
    review_status: str = Field(pattern="^(pending|accepted|edited|rejected|needs_clarification|resolved)$")
    suggested_improvement: str | None = None
    resolution_note: str | None = None


class ApplySuggestionsIn(BaseModel):
    issue_ids: list[int] = Field(min_length=1)
    target_version: str | None = None


class BenchmarkEvaluationIn(BaseModel):
    model_name: str = "gemini-2.5-flash"


# Week 3: AI Story & QA Intelligence Studio Schemas

class GenerateUserStoriesIn(BaseModel):
    project_id: int
    prd_id: int
    requirement_id: str | None = None  # None means all approved requirements in the PRD
    model_name: str = "gemini-2.5-flash"
    split_preference: str = "balanced"  # balanced, granular, high_level
    user_role_guidance: str | None = None


class GenerateAcceptanceCriteriaIn(BaseModel):
    project_id: int
    prd_id: int
    story_id: int
    model_name: str = "gemini-2.5-flash"
    criteria_depth: str = "standard"  # standard, exhaustive, boundary_focused


class GenerateEdgeCasesIn(BaseModel):
    project_id: int
    prd_id: int
    story_id: int
    model_name: str = "gemini-2.5-flash"
    target_categories: list[str] | None = None


class GenerateQATestCasesIn(BaseModel):
    project_id: int
    prd_id: int
    story_id: int
    criteria_ids: list[int] | None = None
    model_name: str = "gemini-2.5-flash"
    categories: list[str] | None = None


class ValidateArtifactIn(BaseModel):
    artifact_type: str = Field(pattern="^(user_story|acceptance_criteria|edge_case|qa_test_case)$")
    artifact_id: int
    model_name: str = "gemini-2.5-flash"


class UserStoryPatchIn(BaseModel):
    title: str | None = None
    user_role: str | None = None
    functionality: str | None = None
    business_benefit: str | None = None
    business_value: str | None = None
    priority: str | None = None
    dependencies: list[str] | None = None
    assumptions: list[str] | None = None
    open_questions: list[str] | None = None
    split_reason: str | None = None
    clarification_item: str | None = None
    review_status: str | None = None
    review_notes: str | None = None


class AcceptanceCriterionPatchIn(BaseModel):
    title: str | None = None
    scenario_type: str | None = None
    given_text: str | None = None
    when_text: str | None = None
    then_text: str | None = None
    review_status: str | None = None
    review_notes: str | None = None


class BulkCriteriaReviewIn(BaseModel):
    criteria_ids: list[int] = Field(min_length=1)
    review_status: str = Field(pattern="^(approved|rejected|needs_clarification|pending)$")
    review_notes: str | None = None


class EdgeCasePatchIn(BaseModel):
    scenario: str | None = None
    trigger_condition: str | None = None
    expected_behaviour: str | None = None
    severity: str | None = None
    category: str | None = None
    evidence_reference: str | None = None
    assumptions: str | None = None
    clarification_required: str | None = None
    review_status: str | None = None
    review_notes: str | None = None


class QATestCasePatchIn(BaseModel):
    title: str | None = None
    category: str | None = None
    preconditions: str | None = None
    test_data: str | None = None
    test_steps: list[str] | None = None
    expected_result: str | None = None
    actual_result: str | None = None
    priority: str | None = None
    risk_level: str | None = None
    review_status: str | None = None
    execution_status: str | None = None
    execution_notes: str | None = None


# --- Week 4 Evaluation Schemas ---

class BenchmarkDatasetCreateIn(BaseModel):
    name: str = Field(min_length=3, max_length=160)
    description: str | None = None
    project_id: int
    version: str = "v1.0"
    is_default: bool = False


class BenchmarkSampleCreateIn(BaseModel):
    dataset_id: int
    project_id: int
    sample_key: str = Field(min_length=2, max_length=60)
    name: str = Field(min_length=3, max_length=255)
    requirement_description: str = Field(min_length=10)
    category: str = Field(min_length=2, max_length=80)
    complexity: str = "Medium"
    reference_source: str | None = None
    expected_outputs: dict[str, Any] = Field(default_factory=dict)


class BenchmarkSamplePatchIn(BaseModel):
    name: str | None = None
    requirement_description: str | None = None
    category: str | None = None
    complexity: str | None = None
    reference_source: str | None = None
    review_status: str | None = None
    reviewer_notes: str | None = None
    expected_outputs: dict[str, Any] | None = None


class GroundTruthReviewIn(BaseModel):
    review_status: str = Field(pattern="^(approved|rejected|pending_review|draft)$")
    reviewer_notes: str | None = None


class RunEvaluationIn(BaseModel):
    project_id: int
    dataset_id: int
    artifact_type: str = "all"  # all, user_story, acceptance_criteria, edge_case, qa_test_case, traceability
    model_name: str = "gemini-2.5-flash"
    prompt_version: str = "v1.1.0-ground-truth-tuned"
    sample_ids: list[int] | None = None


class ErrorReviewCreateIn(BaseModel):
    result_id: int
    error_category: str = Field(min_length=2, max_length=80)
    severity: str = "Medium"
    review_comment: str = Field(min_length=3)
    proposed_prompt_fix: str | None = None


class PresentationUpdateIn(BaseModel):
    title: str = "Zentriq — AI-Powered Product Management Intelligence Platform"
    slides_data: list[dict[str, Any]] = Field(default_factory=list)


class PromptVersionCreateIn(BaseModel):
    operation: str = Field(min_length=2, max_length=60)
    version_tag: str = Field(min_length=2, max_length=40)
    system_prompt: str = Field(min_length=10)
    is_active: bool = True
    description: str | None = None


# --- Email & Notification Center Schemas ---

class EmailSendIn(BaseModel):
    recipient_user_ids: list[int] = Field(default_factory=list)
    recipient_emails: list[EmailStr] = Field(default_factory=list)
    to: list[str] | None = None
    cc: list[EmailStr] | None = None
    subject: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)
    email_type: str | None = "direct_email"
    project_id: int | None = None
    related_task_id: int | None = None
    related_meeting_id: int | None = None


class EmailPreferenceIn(BaseModel):
    task_assignment_emails: bool = True
    meeting_invitation_emails: bool = True
    meeting_update_emails: bool = True


class MeetingCreateExtendedIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    starts_at: datetime
    ends_at: datetime | None = None
    agenda: str | None = None
    location: str | None = None
    notes: str | None = None
    attendee_ids: list[int] = Field(default_factory=list)
    participants: int = 0
    teams_link: str | None = None
    status: str = "scheduled"


class MeetingUpdateIn(BaseModel):
    title: str | None = None
    description: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    agenda: str | None = None
    location: str | None = None
    notes: str | None = None
    attendee_ids: list[int] | None = None
    teams_link: str | None = None
    status: str | None = None


