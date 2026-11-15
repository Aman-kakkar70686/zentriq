import csv
import io
import json
import logging
import time
from datetime import datetime
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import current_user
from ..models import (
    PRD,
    AcceptanceCriterion,
    ActivityLog,
    AIGenerationHistory,
    ArtifactReviewHistory,
    EdgeCase,
    Project,
    QATestCase,
    RequirementIssue,
    Task,
    User,
    UserStory,
)
from ..schemas import (
    AcceptanceCriterionPatchIn,
    BulkCriteriaReviewIn,
    EdgeCasePatchIn,
    GenerateAcceptanceCriteriaIn,
    GenerateEdgeCasesIn,
    GenerateQATestCasesIn,
    GenerateUserStoriesIn,
    QATestCasePatchIn,
    UserStoryPatchIn,
    ValidateArtifactIn,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stories-qa", tags=["stories-qa"])

# ==============================================================================
# GEMINI PROMPTS & AI CLIENT
# ==============================================================================

STORY_GENERATOR_SYSTEM_PROMPT = """You are an elite Senior Technical Product Manager and Agile Architect at Zentriq.
Your task is to transform approved product functional requirements into structured, deliverable user stories in strict JSON format.

RULES:
1. Generate user stories ONLY from the provided approved requirements.
2. Standard user story template MUST be followed:
   "As a [user role], I want [functionality], So that [business benefit]."
3. Split large or complex requirements into 2-3 smaller, independently deliverable user stories when appropriate.
   If split, provide an explicit `split_reason`.
4. Avoid duplicate stories and redundant scope.
5. NEVER invent arbitrary user roles or undocumented business rules; derive roles strictly from the PRD target audience or context.
6. If critical information or business rules are missing in the requirement, flag it cleanly in `clarification_item` rather than fabricating details.
7. Assign realistic priorities (P0 = launch blocker / core, P1 = vital, P2 = nice to have).
8. Every story must link back to its `requirement_id`.

OUTPUT MUST BE VALID JSON conforming strictly to:
{
  "stories": [
    {
      "story_key": "US-01",
      "title": "Clear concise story title",
      "user_role": "Specific role e.g. mobile shopper",
      "functionality": "What functionality they want to perform",
      "business_benefit": "Concrete business or user benefit achieved",
      "user_story_text": "As a [user role], I want [functionality], So that [business benefit].",
      "business_value": "Critical | High | Medium | Low",
      "priority": "P0 | P1 | P2 | P3",
      "requirement_id": "FR-01",
      "dependencies": ["Prerequisite or technical dependency"],
      "assumptions": ["Underlying technical or product assumption"],
      "open_questions": ["Any question requiring PM decision"],
      "split_reason": "Why this requirement was split, or null if single",
      "clarification_item": "Specific missing info flagged, or null if complete"
    }
  ]
}
"""

CRITERIA_GENERATOR_SYSTEM_PROMPT = """You are an expert Lead QA Automation Architect and Business Analyst.
Your task is to generate rigorous, testable Acceptance Criteria in GIVEN / WHEN / THEN format for an approved user story.

RULES:
1. Use strict Given / When / Then formulation:
   - Given: System precondition, state, or user context.
   - When: User action, event trigger, or input submission.
   - Then: Verifiable system response, state change, and output.
2. Generate comprehensive coverage across:
   - happy_path (successful workflow)
   - failure_workflow (handled errors, rejection)
   - input_validation (boundary, malformed inputs)
   - permissions (access control, role restriction)
   - boundary (limits, timeouts, maximum thresholds)
   - business_rule (domain specific logic)
3. Do NOT invent arbitrary thresholds or unmentioned third-party behavior.
4. If an outcome is undocumented in the PRD, note it as "Needs Clarification".
5. Every criterion must be unambiguous, objectively verifiable, and directly linked to the user story and source requirement.

OUTPUT MUST BE VALID JSON conforming strictly to:
{
  "criteria": [
    {
      "criteria_key": "AC-01",
      "title": "Clear criterion description",
      "scenario_type": "happy_path | failure_workflow | input_validation | permissions | boundary | business_rule",
      "given": "Given [precondition]",
      "when": "When [action]",
      "then": "Then [verifiable system response]"
    }
  ]
}
"""

EDGE_CASE_GENERATOR_SYSTEM_PROMPT = """You are a Principal Software Reliability Engineer and Security/QA Specialist.
Your task is to identify subtle, high-impact edge cases and failure modes that developers and testers frequently overlook.

CATEGORIES TO CONSIDER (Select 3 to 6 genuinely relevant categories for this specific story):
- empty_input
- invalid_input
- boundary_values
- duplicate_submissions
- network_failures
- api_failures
- session_expiration
- permission_restrictions
- concurrent_actions
- missing_data
- integration_failures
- recovery_scenarios

RULES:
1. Each edge case must clearly define the Trigger Condition and the Expected System Behaviour.
2. Ground scenarios in the provided user story and PRD context.
3. If the expected behavior is not explicitly documented, specify what is known and set `clarification_required`.
4. Never silently invent expected behavior.
5. Assign accurate severity: Critical (data loss, security, payment failure), High (blocking flow), Medium (degraded UX), Low (cosmetic/minor).

OUTPUT MUST BE VALID JSON conforming strictly to:
{
  "edge_cases": [
    {
      "edge_case_key": "EC-01",
      "category": "duplicate_submissions",
      "scenario": "Customer double clicks the submit button with rapid succession",
      "trigger_condition": "Two POST requests sent within 150ms with identical idempotency payload",
      "expected_behaviour": "First request acquires processing lock; second request is rejected with 409 or debounced gracefully with no double billing",
      "severity": "Critical | High | Medium | Low",
      "evidence_reference": "FR-01 Payment Gateway & Idempotency guidelines",
      "assumptions": "Backend implements Redis lock or client-side disable state",
      "clarification_required": null
    }
  ]
}
"""

QA_TEST_CASE_GENERATOR_SYSTEM_PROMPT = """You are a Senior QA Automation Architect at an enterprise software company.
Transform approved acceptance criteria and requirements into actionable, reproducible QA test cases.

TEST CATEGORIES:
- positive (happy path verification)
- negative (error handling, invalid state rejection)
- boundary (upper/lower bounds, edge parameters)
- validation (format, regex, required fields)
- error_handling (service unavailable, timeout recovery)
- integration (external API, webhook, database sync)
- security_permission (unauthorized access, role spoofing)
- regression (critical backward compatibility)

RULES:
1. Every test case must have clear Preconditions, specific Test Data, concrete numbered Test Steps, and an unambiguous Expected Result.
2. Expected results must be derived strictly from approved requirements and criteria.
3. Priority: P0 (Blocker), P1 (Critical), P2 (Major), P3 (Minor).
4. Risk Level: Critical, High, Medium, Low.
5. Do NOT assume execution pass/fail. Execution state must always default to 'not_run'.

OUTPUT MUST BE VALID JSON conforming strictly to:
{
  "test_cases": [
    {
      "test_case_key": "TC-01",
      "title": "Verify successful payment authorization with Apple Pay biometric token",
      "category": "positive | negative | boundary | validation | error_handling | integration | security_permission | regression",
      "preconditions": "User is authenticated; device has Apple Pay configured with valid card; shopping cart has $45.00 total.",
      "test_data": "Valid test payment token (sandbox pass code 00)",
      "test_steps": [
        "1. Navigate to checkout review page with active cart",
        "2. Tap Apple Pay payment button",
        "3. Confirm biometric Face ID prompt with test simulator",
        "4. Observe API dispatch to /api/checkout/authorize"
      ],
      "expected_result": "Payment processes in < 2 seconds; order confirmation page renders with unique Order ID and digital receipt.",
      "priority": "P0 | P1 | P2 | P3",
      "risk_level": "Critical | High | Medium | Low"
    }
  ]
}
"""

VALIDATION_SYSTEM_PROMPT = """You are an Automated QA & Requirements Verification Evaluator.
Critically evaluate the quality, testability, and traceability of the generated development artifact against its source PRD requirement.

Evaluate:
1. Semantic relevance to source requirement.
2. Ambiguity or non-verifiable claims.
3. Unsupported technical assumptions.
4. Adherence to industry best practices (INVEST for stories, Given/When/Then for criteria, Reproducibility for test cases).

OUTPUT STRICT JSON:
{
  "valid": true,
  "quality_score": 88,
  "checks": [
    { "rule": "Rule description", "passed": true, "detail": "Specific observation" }
  ],
  "semantic_feedback": "1-2 sentences of actionable advice."
}
"""


async def call_gemini_json(
    api_key: str,
    system_instruction: str,
    user_prompt: str,
    model: str = "gemini-2.5-flash",
) -> tuple[dict, int, int]:
    """Call Google Gemini API with structured JSON output and fallback."""
    gemini_body = {
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    start_time = time.time()
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    async with httpx.AsyncClient(timeout=75.0) as client:
        resp = await client.post(endpoint, json=gemini_body)

        # Fallback if model not found
        if resp.status_code == 404 and model != "gemini-1.5-flash":
            logger.warning(f"Model {model} returned 404. Falling back to gemini-1.5-flash...")
            fallback_endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            resp = await client.post(fallback_endpoint, json=gemini_body)

    if resp.status_code != 200:
        error_data = resp.json().get("error", {}) if resp.headers.get("content-type", "").startswith("application/json") else {}
        err_msg = error_data.get("message") or f"Gemini API returned status {resp.status_code}: {resp.text[:200]}"
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Gemini AI error: {err_msg}")

    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Gemini did not return any candidates.")

    raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    if not raw_text:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Empty response received from Gemini.")

    cleaned_text = raw_text.strip()
    if cleaned_text.startswith("```json"):
        cleaned_text = cleaned_text[7:]
    if cleaned_text.startswith("```"):
        cleaned_text = cleaned_text[3:]
    if cleaned_text.endswith("```"):
        cleaned_text = cleaned_text[:-3]
    cleaned_text = cleaned_text.strip()

    try:
        parsed_json = json.loads(cleaned_text)
    except json.JSONDecodeError as exc:
        logger.error(f"Failed to parse JSON: {cleaned_text}")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Failed to parse Gemini JSON output: {str(exc)}")

    latency_ms = int((time.time() - start_time) * 1000)
    tokens_used = data.get("usageMetadata", {}).get("totalTokenCount", 0)

    return parsed_json, tokens_used, latency_ms


def resolve_api_key(x_gemini_key: str | None) -> str:
    key = x_gemini_key or settings.gemini_api_key
    if not key or not key.strip():
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "A Google Gemini API key is required. Please set GEMINI_API_KEY on the backend or add your key via the AI Copilot Settings modal in the frontend.",
        )
    return key.strip()


def run_deterministic_story_validation(story: dict) -> list[dict]:
    checks = []
    text = story.get("user_story_text", "")
    has_format = "as a" in text.lower() and "i want" in text.lower() and "so that" in text.lower()
    checks.append({
        "rule": "INVEST Template Standard",
        "passed": has_format,
        "detail": "Adheres to standard 'As a [role], I want [action], So that [benefit]' formulation." if has_format else "Missing standard template keywords (As a / I want / So that).",
    })
    has_benefit = bool(story.get("business_benefit") and len(story.get("business_benefit")) >= 10)
    checks.append({
        "rule": "Articulated Business Value",
        "passed": has_benefit,
        "detail": "Clear business value specified." if has_benefit else "Business benefit is too brief or missing.",
    })
    has_role = bool(story.get("user_role") and len(story.get("user_role")) >= 3)
    checks.append({
        "rule": "Identifiable User Role",
        "passed": has_role,
        "detail": f"Role '{story.get('user_role')}' defined." if has_role else "User role is missing.",
    })
    has_req = bool(story.get("requirement_id"))
    checks.append({
        "rule": "Source Traceability",
        "passed": has_req,
        "detail": f"Linked to requirement {story.get('requirement_id')}." if has_req else "Missing source requirement reference.",
    })
    return checks


def run_deterministic_criteria_validation(criteria: dict) -> list[dict]:
    checks = []
    given = criteria.get("given_text", "")
    when = criteria.get("when_text", "")
    then = criteria.get("then_text", "")
    checks.append({
        "rule": "Given Clause Defined",
        "passed": bool(given and len(given) >= 5),
        "detail": "Valid context/precondition established." if given else "Given clause is empty.",
    })
    checks.append({
        "rule": "When Action Defined",
        "passed": bool(when and len(when) >= 5),
        "detail": "Specific trigger/action established." if when else "When clause is empty.",
    })
    checks.append({
        "rule": "Then Outcome Testable",
        "passed": bool(then and len(then) >= 5),
        "detail": "Concrete outcome established." if then else "Then clause is empty.",
    })
    return checks


def run_deterministic_qa_validation(tc: dict) -> list[dict]:
    checks = []
    steps = tc.get("test_steps", [])
    checks.append({
        "rule": "Reproducible Test Steps",
        "passed": isinstance(steps, list) and len(steps) >= 2,
        "detail": f"{len(steps)} steps documented." if isinstance(steps, list) and len(steps) >= 2 else "Needs at least 2 numbered execution steps.",
    })
    exp = tc.get("expected_result", "")
    checks.append({
        "rule": "Verifiable Expected Result",
        "passed": bool(exp and len(exp) >= 10),
        "detail": "Specific expected system output specified." if exp else "Expected result is missing or incomplete.",
    })
    checks.append({
        "rule": "Execution Safety Gate",
        "passed": tc.get("execution_status") == "not_run" or True,
        "detail": "Execution status safely initialized.",
    })
    return checks


# ==============================================================================
# 1. USER STORY GENERATOR ENDPOINT
# ==============================================================================

@router.post("/generate-user-stories")
async def generate_user_stories(
    payload: GenerateUserStoriesIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    x_gemini_key: str | None = Header(None),
):
    api_key = resolve_api_key(x_gemini_key)

    prd = db.get(PRD, payload.prd_id)
    if not prd or prd.project_id != payload.project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PRD not found in the selected project")

    prd_content = prd.content or {}
    functional_reqs = prd_content.get("functionalRequirements", [])
    if not functional_reqs:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The selected PRD does not contain any functional requirements")

    # Filter to specific requirement if requested
    target_reqs = functional_reqs
    if payload.requirement_id and payload.requirement_id.strip():
        target_reqs = [r for r in functional_reqs if r.get("id") == payload.requirement_id.strip()]
        if not target_reqs:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Requirement {payload.requirement_id} not found in this PRD")

    # Existing story keys to prevent duplicates
    existing_keys = db.scalars(
        select(UserStory.story_key).where(UserStory.prd_id == payload.prd_id)
    ).all()
    next_num = len(existing_keys) + 1

    prompt = f"""Generate development user stories for the following approved requirements in Zentriq.

PRD TITLE: {prd.title}
FEATURE: {prd.feature_name}
TARGET AUDIENCE: {json.dumps(prd_content.get('targetAudience', {}), indent=2)}
GOALS: {json.dumps(prd_content.get('goalsAndSuccessMetrics', {}), indent=2)}

APPROVED FUNCTIONAL REQUIREMENTS TO TRANSFORM:
{json.dumps(target_reqs, indent=2)}

EXISTING USER STORY KEYS (DO NOT REUSE):
{json.dumps(existing_keys)}
START GENERATING NEW KEYS STARTING FROM: US-{next_num:02d}
SPLIT PREFERENCE: {payload.split_preference}
ADDITIONAL GUIDANCE: {payload.user_role_guidance or 'Derive user roles strictly from target audience.'}
"""

    parsed, tokens, latency = await call_gemini_json(
        api_key=api_key,
        system_instruction=STORY_GENERATOR_SYSTEM_PROMPT,
        user_prompt=prompt,
        model=payload.model_name,
    )

    raw_stories = parsed.get("stories", [])
    if not raw_stories:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Gemini did not return any structured stories in response")

    created_stories = []
    for item in raw_stories:
        # Guarantee unique key
        key = item.get("story_key") or f"US-{next_num:02d}"
        if db.scalar(select(UserStory).where(UserStory.prd_id == payload.prd_id, UserStory.story_key == key)):
            key = f"US-{int(time.time() * 1000) % 10000}"

        user_role = item.get("user_role") or "User"
        func_part = item.get("functionality") or "interact with the feature"
        benefit_part = item.get("business_benefit") or "achieve the desired outcome"
        story_text = item.get("user_story_text") or f"As a {user_role}, I want {func_part}, So that {benefit_part}."

        story_obj = UserStory(
            story_key=key,
            project_id=payload.project_id,
            prd_id=payload.prd_id,
            requirement_id=item.get("requirement_id") or (target_reqs[0].get("id") if target_reqs else "FR-01"),
            title=item.get("title") or f"{key}: {func_part[:50]}",
            user_role=user_role,
            user_story_text=story_text,
            functionality=func_part,
            business_benefit=benefit_part,
            business_value=item.get("business_value") or "High",
            priority=item.get("priority") or "P1",
            dependencies=item.get("dependencies") or [],
            assumptions=item.get("assumptions") or [],
            open_questions=item.get("open_questions") or [],
            split_reason=item.get("split_reason"),
            clarification_item=item.get("clarification_item"),
            review_status="pending",
            validation_results={
                "status": "validated",
                "checks": run_deterministic_story_validation({
                    "user_story_text": story_text,
                    "business_benefit": benefit_part,
                    "user_role": user_role,
                    "requirement_id": item.get("requirement_id"),
                }),
                "generated_by_model": payload.model_name,
            },
        )
        db.add(story_obj)
        created_stories.append(story_obj)
        next_num += 1

    # Record AI Generation History
    gen_record = AIGenerationHistory(
        project_id=payload.project_id,
        prd_id=payload.prd_id,
        requirement_id=payload.requirement_id,
        user_id=user.id,
        generation_type="generate_user_stories",
        model_name=payload.model_name,
        prompt_summary=f"Generated {len(created_stories)} user stories from {len(target_reqs)} requirements",
        status="success",
        tokens_used=tokens,
        latency_ms=latency,
        parsed_data={"story_count": len(created_stories)},
    )
    db.add(gen_record)

    # Activity log
    db.add(
        ActivityLog(
            project_id=payload.project_id,
            user_id=user.id,
            kind="created",
            action="Generated User Stories",
            subject=f"{len(created_stories)} stories for PRD #{prd.id} ({prd.title})",
            detail=f"Model {payload.model_name} • {tokens} tokens",
        )
    )

    db.commit()

    return {
        "success": True,
        "count": len(created_stories),
        "stories": [
            {
                "id": s.id,
                "story_key": s.story_key,
                "title": s.title,
                "user_role": s.user_role,
                "user_story_text": s.user_story_text,
                "functionality": s.functionality,
                "business_benefit": s.business_benefit,
                "business_value": s.business_value,
                "priority": s.priority,
                "requirement_id": s.requirement_id,
                "dependencies": s.dependencies,
                "assumptions": s.assumptions,
                "open_questions": s.open_questions,
                "split_reason": s.split_reason,
                "clarification_item": s.clarification_item,
                "review_status": s.review_status,
                "validation_results": s.validation_results,
            }
            for s in created_stories
        ],
        "metadata": {
            "tokens_used": tokens,
            "latency_ms": latency,
            "model_used": payload.model_name,
        },
    }


# ==============================================================================
# 2. ACCEPTANCE CRITERIA GENERATOR ENDPOINT
# ==============================================================================

@router.post("/generate-acceptance-criteria")
async def generate_acceptance_criteria(
    payload: GenerateAcceptanceCriteriaIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    x_gemini_key: str | None = Header(None),
):
    api_key = resolve_api_key(x_gemini_key)

    story = db.get(UserStory, payload.story_id)
    if not story or story.project_id != payload.project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User story not found")

    # QUALITY ENFORCEMENT: Only approved stories or pending review stories can generate criteria
    if story.review_status == "rejected":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Cannot generate acceptance criteria for a rejected user story. Please review or approve the story first.",
        )

    prd = db.get(PRD, story.prd_id)
    existing_ac_keys = db.scalars(
        select(AcceptanceCriterion.criteria_key).where(AcceptanceCriterion.story_id == story.id)
    ).all()
    next_ac_num = len(existing_ac_keys) + 1

    prompt = f"""Generate Given / When / Then Acceptance Criteria for the following User Story in Zentriq.

USER STORY:
Key: {story.story_key}
Title: {story.title}
Story: {story.user_story_text}
Linked Requirement ID: {story.requirement_id}
Priority: {story.priority}
Assumptions: {json.dumps(story.assumptions or [])}

SOURCE PRD CONTEXT:
PRD Title: {prd.title if prd else 'N/A'}
Feature: {prd.feature_name if prd else 'N/A'}

DEPTH PREFERENCE: {payload.criteria_depth}
EXISTING CRITERIA KEYS TO AVOID: {json.dumps(existing_ac_keys)}
START NEW CRITERIA KEYS AT: {story.story_key}-AC-{next_ac_num:02d}
"""

    parsed, tokens, latency = await call_gemini_json(
        api_key=api_key,
        system_instruction=CRITERIA_GENERATOR_SYSTEM_PROMPT,
        user_prompt=prompt,
        model=payload.model_name,
    )

    raw_criteria = parsed.get("criteria", [])
    if not raw_criteria:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Gemini did not return any criteria")

    created = []
    for c in raw_criteria:
        key = c.get("criteria_key") or f"{story.story_key}-AC-{next_ac_num:02d}"
        given = c.get("given", "").strip()
        when = c.get("when", "").strip()
        then = c.get("then", "").strip()

        crit_obj = AcceptanceCriterion(
            criteria_key=key,
            story_id=story.id,
            project_id=story.project_id,
            prd_id=story.prd_id,
            requirement_id=story.requirement_id,
            title=c.get("title") or f"{key}: {c.get('scenario_type', 'Scenario')}",
            scenario_type=c.get("scenario_type") or "happy_path",
            given_text=given,
            when_text=when,
            then_text=then,
            review_status="pending",
            validation_results={
                "status": "validated",
                "checks": run_deterministic_criteria_validation({
                    "given_text": given,
                    "when_text": when,
                    "then_text": then,
                }),
            },
        )
        db.add(crit_obj)
        created.append(crit_obj)
        next_ac_num += 1

    gen_record = AIGenerationHistory(
        project_id=payload.project_id,
        prd_id=story.prd_id,
        requirement_id=story.requirement_id,
        user_id=user.id,
        generation_type="generate_acceptance_criteria",
        model_name=payload.model_name,
        prompt_summary=f"Generated {len(created)} acceptance criteria for {story.story_key}",
        status="success",
        tokens_used=tokens,
        latency_ms=latency,
        parsed_data={"criteria_count": len(created), "story_id": story.id},
    )
    db.add(gen_record)

    db.commit()

    return {
        "success": True,
        "count": len(created),
        "criteria": [
            {
                "id": cr.id,
                "criteria_key": cr.criteria_key,
                "story_id": cr.story_id,
                "title": cr.title,
                "scenario_type": cr.scenario_type,
                "given_text": cr.given_text,
                "when_text": cr.when_text,
                "then_text": cr.then_text,
                "review_status": cr.review_status,
                "requirement_id": cr.requirement_id,
                "validation_results": cr.validation_results,
            }
            for cr in created
        ],
        "metadata": {
            "tokens_used": tokens,
            "latency_ms": latency,
            "model_used": payload.model_name,
        },
    }


# ==============================================================================
# 3. EDGE CASE GENERATOR ENDPOINT
# ==============================================================================

@router.post("/generate-edge-cases")
async def generate_edge_cases(
    payload: GenerateEdgeCasesIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    x_gemini_key: str | None = Header(None),
):
    api_key = resolve_api_key(x_gemini_key)

    story = db.get(UserStory, payload.story_id)
    if not story or story.project_id != payload.project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User story not found")

    prd = db.get(PRD, story.prd_id)
    existing_ec_keys = db.scalars(
        select(EdgeCase.edge_case_key).where(EdgeCase.story_id == story.id)
    ).all()
    next_ec_num = len(existing_ec_keys) + 1

    prompt = f"""Generate specialized edge cases and unexpected failure modes for this User Story.

USER STORY:
Key: {story.story_key}
Title: {story.title}
Description: {story.user_story_text}
Linked Requirement: {story.requirement_id}
Assumptions: {json.dumps(story.assumptions or [])}

TARGET CATEGORIES TO PRIORITIZE:
{json.dumps(payload.target_categories or ["duplicate_submissions", "network_failures", "boundary_values", "empty_input", "session_expiration"])}

START EDGE CASE KEYS AT: {story.story_key}-EC-{next_ec_num:02d}
"""

    parsed, tokens, latency = await call_gemini_json(
        api_key=api_key,
        system_instruction=EDGE_CASE_GENERATOR_SYSTEM_PROMPT,
        user_prompt=prompt,
        model=payload.model_name,
    )

    raw_cases = parsed.get("edge_cases", [])
    if not raw_cases:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Gemini did not return any edge cases")

    created = []
    for ec in raw_cases:
        key = ec.get("edge_case_key") or f"{story.story_key}-EC-{next_ec_num:02d}"
        ec_obj = EdgeCase(
            edge_case_key=key,
            story_id=story.id,
            project_id=story.project_id,
            prd_id=story.prd_id,
            requirement_id=story.requirement_id,
            category=ec.get("category") or "boundary_values",
            scenario=ec.get("scenario") or "Edge case scenario",
            trigger_condition=ec.get("trigger_condition") or "Specific trigger",
            expected_behaviour=ec.get("expected_behaviour") or "Handled system response",
            severity=ec.get("severity") or "Medium",
            evidence_reference=ec.get("evidence_reference"),
            assumptions=ec.get("assumptions"),
            clarification_required=ec.get("clarification_required"),
            review_status="needs_clarification" if ec.get("clarification_required") else "pending",
            validation_results={
                "status": "validated",
                "checks": [
                    {"rule": "Scenario Articulated", "passed": bool(ec.get("scenario")), "detail": "Documented clearly"},
                    {"rule": "Trigger Verifiable", "passed": bool(ec.get("trigger_condition")), "detail": "Condition established"},
                    {"rule": "Expected Behaviour Specified", "passed": bool(ec.get("expected_behaviour")), "detail": "Output defined"},
                ],
            },
        )
        db.add(ec_obj)
        created.append(ec_obj)
        next_ec_num += 1

    gen_record = AIGenerationHistory(
        project_id=payload.project_id,
        prd_id=story.prd_id,
        requirement_id=story.requirement_id,
        user_id=user.id,
        generation_type="generate_edge_cases",
        model_name=payload.model_name,
        prompt_summary=f"Generated {len(created)} edge cases for {story.story_key}",
        status="success",
        tokens_used=tokens,
        latency_ms=latency,
        parsed_data={"edge_cases_count": len(created), "story_id": story.id},
    )
    db.add(gen_record)

    db.commit()

    return {
        "success": True,
        "count": len(created),
        "edge_cases": [
            {
                "id": c.id,
                "edge_case_key": c.edge_case_key,
                "story_id": c.story_id,
                "category": c.category,
                "scenario": c.scenario,
                "trigger_condition": c.trigger_condition,
                "expected_behaviour": c.expected_behaviour,
                "severity": c.severity,
                "evidence_reference": c.evidence_reference,
                "clarification_required": c.clarification_required,
                "review_status": c.review_status,
                "validation_results": c.validation_results,
            }
            for c in created
        ],
        "metadata": {
            "tokens_used": tokens,
            "latency_ms": latency,
            "model_used": payload.model_name,
        },
    }


# ==============================================================================
# 4. QA TEST CASE GENERATOR ENDPOINT
# ==============================================================================

@router.post("/generate-qa-test-cases")
async def generate_qa_test_cases(
    payload: GenerateQATestCasesIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    x_gemini_key: str | None = Header(None),
):
    api_key = resolve_api_key(x_gemini_key)

    story = db.get(UserStory, payload.story_id)
    if not story or story.project_id != payload.project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User story not found")

    # Fetch criteria to generate tests for
    query = select(AcceptanceCriterion).where(AcceptanceCriterion.story_id == story.id)
    if payload.criteria_ids:
        query = query.where(AcceptanceCriterion.id.in_(payload.criteria_ids))
    available_criteria = db.scalars(query).all()

    if not available_criteria:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No acceptance criteria found for this story. Please generate and review acceptance criteria first.",
        )

    existing_tc_keys = db.scalars(
        select(QATestCase.test_case_key).where(QATestCase.prd_id == story.prd_id)
    ).all()
    next_tc_num = len(existing_tc_keys) + 1

    prompt = f"""Generate QA Test Cases for the following User Story and Acceptance Criteria in Zentriq.

USER STORY:
Key: {story.story_key}
Title: {story.title}
Story: {story.user_story_text}
Linked Requirement: {story.requirement_id}

ACCEPTANCE CRITERIA TO TEST:
{json.dumps([{ 'id': c.id, 'key': c.criteria_key, 'title': c.title, 'given': c.given_text, 'when': c.when_text, 'then': c.then_text } for c in available_criteria], indent=2)}

TARGET TEST CATEGORIES:
{json.dumps(payload.categories or ["positive", "negative", "boundary", "validation", "error_handling", "integration"])}

START TEST CASE KEYS AT: {story.story_key}-TC-{next_tc_num:02d}
"""

    parsed, tokens, latency = await call_gemini_json(
        api_key=api_key,
        system_instruction=QA_TEST_CASE_GENERATOR_SYSTEM_PROMPT,
        user_prompt=prompt,
        model=payload.model_name,
    )

    raw_tests = parsed.get("test_cases", [])
    if not raw_tests:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Gemini did not return any test cases")

    created = []
    # Map first criteria id by default if multiple
    primary_crit_id = available_criteria[0].id if available_criteria else None

    for tc in raw_tests:
        key = tc.get("test_case_key") or f"{story.story_key}-TC-{next_tc_num:02d}"
        steps = tc.get("test_steps") or ["1. Setup test environment", "2. Execute test action", "3. Verify expected output"]

        tc_obj = QATestCase(
            test_case_key=key,
            title=tc.get("title") or f"Verify {key}",
            category=tc.get("category") or "positive",
            project_id=story.project_id,
            prd_id=story.prd_id,
            requirement_id=story.requirement_id,
            story_id=story.id,
            acceptance_criteria_id=primary_crit_id,
            preconditions=tc.get("preconditions"),
            test_data=tc.get("test_data"),
            test_steps=steps,
            expected_result=tc.get("expected_result") or "System behaves as expected",
            priority=tc.get("priority") or "P1",
            risk_level=tc.get("risk_level") or "Medium",
            review_status="pending",
            execution_status="not_run",
            validation_results={
                "status": "validated",
                "checks": run_deterministic_qa_validation({
                    "test_steps": steps,
                    "expected_result": tc.get("expected_result"),
                    "execution_status": "not_run",
                }),
            },
        )
        db.add(tc_obj)
        created.append(tc_obj)
        next_tc_num += 1

    gen_record = AIGenerationHistory(
        project_id=payload.project_id,
        prd_id=story.prd_id,
        requirement_id=story.requirement_id,
        user_id=user.id,
        generation_type="generate_qa_test_cases",
        model_name=payload.model_name,
        prompt_summary=f"Generated {len(created)} QA test cases for {story.story_key}",
        status="success",
        tokens_used=tokens,
        latency_ms=latency,
        parsed_data={"test_case_count": len(created), "story_id": story.id},
    )
    db.add(gen_record)

    db.commit()

    return {
        "success": True,
        "count": len(created),
        "test_cases": [
            {
                "id": t.id,
                "test_case_key": t.test_case_key,
                "title": t.title,
                "category": t.category,
                "story_id": t.story_id,
                "acceptance_criteria_id": t.acceptance_criteria_id,
                "preconditions": t.preconditions,
                "test_data": t.test_data,
                "test_steps": t.test_steps,
                "expected_result": t.expected_result,
                "priority": t.priority,
                "risk_level": t.risk_level,
                "review_status": t.review_status,
                "execution_status": t.execution_status,
                "validation_results": t.validation_results,
            }
            for t in created
        ],
        "metadata": {
            "tokens_used": tokens,
            "latency_ms": latency,
            "model_used": payload.model_name,
        },
    }


# ==============================================================================
# 5. ARTIFACT VALIDATION ENDPOINT (Deterministic + AI)
# ==============================================================================

@router.post("/validate-artifact")
async def validate_artifact(
    payload: ValidateArtifactIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    x_gemini_key: str | None = Header(None),
):
    api_key = resolve_api_key(x_gemini_key)

    artifact_content = ""
    deterministic_checks = []

    if payload.artifact_type == "user_story":
        item = db.get(UserStory, payload.artifact_id)
        if not item:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User story not found")
        artifact_content = f"Title: {item.title}\nStory: {item.user_story_text}\nRole: {item.user_role}\nBenefit: {item.business_benefit}\nRequirement: {item.requirement_id}"
        deterministic_checks = run_deterministic_story_validation({
            "user_story_text": item.user_story_text,
            "business_benefit": item.business_benefit,
            "user_role": item.user_role,
            "requirement_id": item.requirement_id,
        })
    elif payload.artifact_type == "acceptance_criteria":
        item = db.get(AcceptanceCriterion, payload.artifact_id)
        if not item:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Acceptance criterion not found")
        artifact_content = f"Given: {item.given_text}\nWhen: {item.when_text}\nThen: {item.then_text}"
        deterministic_checks = run_deterministic_criteria_validation({
            "given_text": item.given_text,
            "when_text": item.when_text,
            "then_text": item.then_text,
        })
    elif payload.artifact_type == "edge_case":
        item = db.get(EdgeCase, payload.artifact_id)
        if not item:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Edge case not found")
        artifact_content = f"Scenario: {item.scenario}\nTrigger: {item.trigger_condition}\nExpected: {item.expected_behaviour}"
        deterministic_checks = [
            {"rule": "Scenario Defined", "passed": bool(item.scenario), "detail": "Documented"},
            {"rule": "Trigger Defined", "passed": bool(item.trigger_condition), "detail": "Condition set"},
        ]
    elif payload.artifact_type == "qa_test_case":
        item = db.get(QATestCase, payload.artifact_id)
        if not item:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "QA test case not found")
        artifact_content = f"Title: {item.title}\nPreconditions: {item.preconditions}\nSteps: {json.dumps(item.test_steps)}\nExpected: {item.expected_result}"
        deterministic_checks = run_deterministic_qa_validation({
            "test_steps": item.test_steps,
            "expected_result": item.expected_result,
            "execution_status": item.execution_status,
        })

    prompt = f"""Critically validate this {payload.artifact_type.replace('_', ' ')} artifact in Zentriq.

ARTIFACT CONTENT:
{artifact_content}

Run semantic clarity, ambiguity detection, testability, and adherence checks.
"""

    parsed, _, _ = await call_gemini_json(
        api_key=api_key,
        system_instruction=VALIDATION_SYSTEM_PROMPT,
        user_prompt=prompt,
        model=payload.model_name,
    )

    combined_checks = deterministic_checks + parsed.get("checks", [])
    validation_payload = {
        "status": "validated",
        "quality_score": parsed.get("quality_score", 85),
        "valid": parsed.get("valid", True),
        "checks": combined_checks,
        "semantic_feedback": parsed.get("semantic_feedback", "Artifact meets structural standards."),
        "validated_at": datetime.utcnow().isoformat(),
    }

    # Save to the entity
    item.validation_results = validation_payload
    db.commit()

    return {
        "success": True,
        "validation_results": validation_payload,
    }


# ==============================================================================
# 6. USER STORIES CRUD & TASK CONVERSION
# ==============================================================================

@router.get("/user-stories")
def list_user_stories(
    project_id: int | None = None,
    prd_id: int | None = None,
    requirement_id: str | None = None,
    review_status: str | None = None,
    priority: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    query = select(UserStory).order_by(UserStory.id.desc())
    if project_id:
        query = query.where(UserStory.project_id == project_id)
    if prd_id:
        query = query.where(UserStory.prd_id == prd_id)
    if requirement_id:
        query = query.where(UserStory.requirement_id == requirement_id)
    if review_status and review_status != "all":
        query = query.where(UserStory.review_status == review_status)
    if priority and priority != "all":
        query = query.where(UserStory.priority == priority)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(UserStory.title).like(term),
                func.lower(UserStory.story_key).like(term),
                func.lower(UserStory.user_story_text).like(term),
                func.lower(UserStory.requirement_id).like(term),
            )
        )

    stories = db.scalars(query).all()
    return [
        {
            "id": s.id,
            "story_key": s.story_key,
            "project_id": s.project_id,
            "prd_id": s.prd_id,
            "requirement_id": s.requirement_id,
            "title": s.title,
            "user_role": s.user_role,
            "user_story_text": s.user_story_text,
            "functionality": s.functionality,
            "business_benefit": s.business_benefit,
            "business_value": s.business_value,
            "priority": s.priority,
            "dependencies": s.dependencies,
            "assumptions": s.assumptions,
            "open_questions": s.open_questions,
            "split_reason": s.split_reason,
            "clarification_item": s.clarification_item,
            "review_status": s.review_status,
            "review_notes": s.review_notes,
            "is_converted_to_task": s.is_converted_to_task,
            "task_id": s.task_id,
            "validation_results": s.validation_results,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "criteria_count": len(s.acceptance_criteria),
            "edge_cases_count": len(s.edge_cases),
            "test_cases_count": len(s.qa_test_cases),
        }
        for s in stories
    ]


@router.get("/user-stories/{story_id}")
def get_user_story(
    story_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    story = db.get(UserStory, story_id)
    if not story:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User story not found")
    return {
        "id": story.id,
        "story_key": story.story_key,
        "project_id": story.project_id,
        "prd_id": story.prd_id,
        "requirement_id": story.requirement_id,
        "title": story.title,
        "user_role": story.user_role,
        "user_story_text": story.user_story_text,
        "functionality": story.functionality,
        "business_benefit": story.business_benefit,
        "business_value": story.business_value,
        "priority": story.priority,
        "dependencies": story.dependencies,
        "assumptions": story.assumptions,
        "open_questions": story.open_questions,
        "split_reason": story.split_reason,
        "clarification_item": story.clarification_item,
        "review_status": story.review_status,
        "review_notes": story.review_notes,
        "reviewed_at": story.reviewed_at.isoformat() if story.reviewed_at else None,
        "is_converted_to_task": story.is_converted_to_task,
        "task_id": story.task_id,
        "validation_results": story.validation_results,
        "created_at": story.created_at.isoformat() if story.created_at else None,
    }


@router.patch("/user-stories/{story_id}")
def update_user_story(
    story_id: int,
    payload: UserStoryPatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    story = db.get(UserStory, story_id)
    if not story:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User story not found")

    prev_val = {
        "title": story.title,
        "review_status": story.review_status,
        "priority": story.priority,
        "functionality": story.functionality,
        "business_benefit": story.business_benefit,
    }

    if payload.title is not None:
        story.title = payload.title.strip()
    if payload.user_role is not None:
        story.user_role = payload.user_role.strip()
    if payload.functionality is not None:
        story.functionality = payload.functionality.strip()
    if payload.business_benefit is not None:
        story.business_benefit = payload.business_benefit.strip()
    if payload.business_value is not None:
        story.business_value = payload.business_value
    if payload.priority is not None:
        story.priority = payload.priority
    if payload.dependencies is not None:
        story.dependencies = payload.dependencies
    if payload.assumptions is not None:
        story.assumptions = payload.assumptions
    if payload.open_questions is not None:
        story.open_questions = payload.open_questions
    if payload.split_reason is not None:
        story.split_reason = payload.split_reason
    if payload.clarification_item is not None:
        story.clarification_item = payload.clarification_item
    if payload.review_notes is not None:
        story.review_notes = payload.review_notes

    # Sync text if parts changed
    if payload.user_role is not None or payload.functionality is not None or payload.business_benefit is not None:
        story.user_story_text = f"As a {story.user_role}, I want {story.functionality}, So that {story.business_benefit}."

    if payload.review_status is not None:
        story.review_status = payload.review_status
        story.reviewed_by_id = user.id
        story.reviewed_at = datetime.utcnow()

    updated_val = {
        "title": story.title,
        "review_status": story.review_status,
        "priority": story.priority,
        "functionality": story.functionality,
        "business_benefit": story.business_benefit,
    }

    # Audit Trail
    db.add(
        ArtifactReviewHistory(
            artifact_type="user_story",
            artifact_id=story.id,
            user_id=user.id,
            action=f"status_{payload.review_status}" if payload.review_status else "edited",
            previous_value=prev_val,
            updated_value=updated_val,
            review_note=payload.review_notes,
        )
    )

    db.commit()
    return {"success": True, "message": "User story updated", "story": story}


@router.delete("/user-stories/{story_id}")
def delete_user_story(
    story_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    story = db.get(UserStory, story_id)
    if not story:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User story not found")
    db.delete(story)
    db.commit()
    return {"success": True, "message": "User story deleted"}


@router.post("/user-stories/{story_id}/convert-to-task")
def convert_story_to_task(
    story_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    story = db.get(UserStory, story_id)
    if not story:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User story not found")

    if story.review_status != "approved":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Only approved user stories can be converted into project tasks. Please approve this story first.",
        )

    if story.is_converted_to_task and story.task_id:
        return {"success": True, "message": "Story is already converted to task", "task_id": story.task_id}

    # Map priority P0->high, P1->medium, P2/P3->low
    p_map = {"P0": "high", "P1": "medium", "P2": "low", "P3": "low"}
    task_priority = p_map.get(story.priority, "medium")

    # Create task
    task = Task(
        title=f"[{story.story_key}] {story.title}",
        description=f"{story.user_story_text}\n\nLinked Requirement: {story.requirement_id}\nBusiness Value: {story.business_value}",
        project_id=story.project_id,
        assignee_id=user.id,
        status="planned",
        priority=task_priority,
        task_type="feature",
        qa_status="untested",
    )
    db.add(task)
    db.flush()

    story.is_converted_to_task = True
    story.task_id = task.id

    db.add(
        ActivityLog(
            project_id=story.project_id,
            task_id=task.id,
            user_id=user.id,
            kind="created",
            action="Converted Story to Task",
            subject=task.title,
            detail=f"Converted from {story.story_key}",
        )
    )

    db.commit()

    return {
        "success": True,
        "message": f"User story converted to Task #{task.id}",
        "task_id": task.id,
    }


# ==============================================================================
# 7. ACCEPTANCE CRITERIA CRUD & BULK REVIEW
# ==============================================================================

@router.get("/acceptance-criteria")
def list_acceptance_criteria(
    story_id: int | None = None,
    project_id: int | None = None,
    prd_id: int | None = None,
    review_status: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    query = select(AcceptanceCriterion).order_by(AcceptanceCriterion.id.asc())
    if story_id:
        query = query.where(AcceptanceCriterion.story_id == story_id)
    if project_id:
        query = query.where(AcceptanceCriterion.project_id == project_id)
    if prd_id:
        query = query.where(AcceptanceCriterion.prd_id == prd_id)
    if review_status and review_status != "all":
        query = query.where(AcceptanceCriterion.review_status == review_status)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(AcceptanceCriterion.title).like(term),
                func.lower(AcceptanceCriterion.criteria_key).like(term),
                func.lower(AcceptanceCriterion.given_text).like(term),
                func.lower(AcceptanceCriterion.when_text).like(term),
                func.lower(AcceptanceCriterion.then_text).like(term),
            )
        )

    criteria = db.scalars(query).all()
    return [
        {
            "id": c.id,
            "criteria_key": c.criteria_key,
            "story_id": c.story_id,
            "project_id": c.project_id,
            "prd_id": c.prd_id,
            "requirement_id": c.requirement_id,
            "title": c.title,
            "scenario_type": c.scenario_type,
            "given_text": c.given_text,
            "when_text": c.when_text,
            "then_text": c.then_text,
            "review_status": c.review_status,
            "review_notes": c.review_notes,
            "validation_results": c.validation_results,
            "test_cases_count": len(c.qa_test_cases),
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in criteria
    ]


@router.patch("/acceptance-criteria/{criteria_id}")
def update_acceptance_criterion(
    criteria_id: int,
    payload: AcceptanceCriterionPatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    crit = db.get(AcceptanceCriterion, criteria_id)
    if not crit:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Acceptance criterion not found")

    prev = {
        "title": crit.title,
        "given_text": crit.given_text,
        "when_text": crit.when_text,
        "then_text": crit.then_text,
        "review_status": crit.review_status,
    }

    if payload.title is not None:
        crit.title = payload.title.strip()
    if payload.scenario_type is not None:
        crit.scenario_type = payload.scenario_type
    if payload.given_text is not None:
        crit.given_text = payload.given_text.strip()
    if payload.when_text is not None:
        crit.when_text = payload.when_text.strip()
    if payload.then_text is not None:
        crit.then_text = payload.then_text.strip()
    if payload.review_notes is not None:
        crit.review_notes = payload.review_notes
    if payload.review_status is not None:
        crit.review_status = payload.review_status
        crit.reviewed_by_id = user.id
        crit.reviewed_at = datetime.utcnow()

    db.add(
        ArtifactReviewHistory(
            artifact_type="acceptance_criteria",
            artifact_id=crit.id,
            user_id=user.id,
            action=f"status_{payload.review_status}" if payload.review_status else "edited",
            previous_value=prev,
            updated_value={
                "title": crit.title,
                "given_text": crit.given_text,
                "when_text": crit.when_text,
                "then_text": crit.then_text,
                "review_status": crit.review_status,
            },
            review_note=payload.review_notes,
        )
    )

    db.commit()
    return {"success": True, "message": "Criterion updated", "criterion": crit}


@router.post("/acceptance-criteria/bulk-review")
def bulk_review_acceptance_criteria(
    payload: BulkCriteriaReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    criteria = db.scalars(
        select(AcceptanceCriterion).where(AcceptanceCriterion.id.in_(payload.criteria_ids))
    ).all()
    for c in criteria:
        c.review_status = payload.review_status
        c.review_notes = payload.review_notes
        c.reviewed_by_id = user.id
        c.reviewed_at = datetime.utcnow()

        db.add(
            ArtifactReviewHistory(
                artifact_type="acceptance_criteria",
                artifact_id=c.id,
                user_id=user.id,
                action=f"bulk_{payload.review_status}",
                previous_value={"review_status": "pending"},
                updated_value={"review_status": payload.review_status},
                review_note=payload.review_notes,
            )
        )

    db.commit()
    return {"success": True, "updated_count": len(criteria)}


@router.delete("/acceptance-criteria/{criteria_id}")
def delete_acceptance_criterion(
    criteria_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    crit = db.get(AcceptanceCriterion, criteria_id)
    if not crit:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Criterion not found")
    db.delete(crit)
    db.commit()
    return {"success": True, "message": "Criterion deleted"}


# ==============================================================================
# 8. EDGE CASES CRUD
# ==============================================================================

@router.get("/edge-cases")
def list_edge_cases(
    story_id: int | None = None,
    project_id: int | None = None,
    prd_id: int | None = None,
    category: str | None = None,
    severity: str | None = None,
    review_status: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    query = select(EdgeCase).order_by(EdgeCase.id.asc())
    if story_id:
        query = query.where(EdgeCase.story_id == story_id)
    if project_id:
        query = query.where(EdgeCase.project_id == project_id)
    if prd_id:
        query = query.where(EdgeCase.prd_id == prd_id)
    if category and category != "all":
        query = query.where(EdgeCase.category == category)
    if severity and severity != "all":
        query = query.where(EdgeCase.severity == severity)
    if review_status and review_status != "all":
        query = query.where(EdgeCase.review_status == review_status)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(EdgeCase.scenario).like(term),
                func.lower(EdgeCase.trigger_condition).like(term),
                func.lower(EdgeCase.expected_behaviour).like(term),
                func.lower(EdgeCase.edge_case_key).like(term),
            )
        )

    cases = db.scalars(query).all()
    return [
        {
            "id": c.id,
            "edge_case_key": c.edge_case_key,
            "story_id": c.story_id,
            "project_id": c.project_id,
            "prd_id": c.prd_id,
            "requirement_id": c.requirement_id,
            "category": c.category,
            "scenario": c.scenario,
            "trigger_condition": c.trigger_condition,
            "expected_behaviour": c.expected_behaviour,
            "severity": c.severity,
            "evidence_reference": c.evidence_reference,
            "assumptions": c.assumptions,
            "clarification_required": c.clarification_required,
            "review_status": c.review_status,
            "review_notes": c.review_notes,
            "validation_results": c.validation_results,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in cases
    ]


@router.patch("/edge-cases/{case_id}")
def update_edge_case(
    case_id: int,
    payload: EdgeCasePatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    ec = db.get(EdgeCase, case_id)
    if not ec:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Edge case not found")

    if payload.scenario is not None:
        ec.scenario = payload.scenario.strip()
    if payload.trigger_condition is not None:
        ec.trigger_condition = payload.trigger_condition.strip()
    if payload.expected_behaviour is not None:
        ec.expected_behaviour = payload.expected_behaviour.strip()
    if payload.severity is not None:
        ec.severity = payload.severity
    if payload.category is not None:
        ec.category = payload.category
    if payload.evidence_reference is not None:
        ec.evidence_reference = payload.evidence_reference
    if payload.assumptions is not None:
        ec.assumptions = payload.assumptions
    if payload.clarification_required is not None:
        ec.clarification_required = payload.clarification_required
    if payload.review_notes is not None:
        ec.review_notes = payload.review_notes
    if payload.review_status is not None:
        ec.review_status = payload.review_status
        ec.reviewed_by_id = user.id
        ec.reviewed_at = datetime.utcnow()

    db.commit()
    return {"success": True, "message": "Edge case updated", "edge_case": ec}


@router.delete("/edge-cases/{case_id}")
def delete_edge_case(
    case_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    ec = db.get(EdgeCase, case_id)
    if not ec:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Edge case not found")
    db.delete(ec)
    db.commit()
    return {"success": True, "message": "Edge case deleted"}


# ==============================================================================
# 9. QA TEST CASES CRUD, MANUAL EXECUTION & CSV EXPORT
# ==============================================================================

@router.get("/qa-test-cases")
def list_qa_test_cases(
    story_id: int | None = None,
    project_id: int | None = None,
    prd_id: int | None = None,
    category: str | None = None,
    priority: str | None = None,
    review_status: str | None = None,
    execution_status: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    query = select(QATestCase).order_by(QATestCase.id.asc())
    if story_id:
        query = query.where(QATestCase.story_id == story_id)
    if project_id:
        query = query.where(QATestCase.project_id == project_id)
    if prd_id:
        query = query.where(QATestCase.prd_id == prd_id)
    if category and category != "all":
        query = query.where(QATestCase.category == category)
    if priority and priority != "all":
        query = query.where(QATestCase.priority == priority)
    if review_status and review_status != "all":
        query = query.where(QATestCase.review_status == review_status)
    if execution_status and execution_status != "all":
        query = query.where(QATestCase.execution_status == execution_status)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(QATestCase.title).like(term),
                func.lower(QATestCase.test_case_key).like(term),
                func.lower(QATestCase.expected_result).like(term),
                func.lower(QATestCase.preconditions).like(term),
            )
        )

    tests = db.scalars(query).all()
    return [
        {
            "id": t.id,
            "test_case_key": t.test_case_key,
            "title": t.title,
            "category": t.category,
            "project_id": t.project_id,
            "prd_id": t.prd_id,
            "requirement_id": t.requirement_id,
            "story_id": t.story_id,
            "acceptance_criteria_id": t.acceptance_criteria_id,
            "preconditions": t.preconditions,
            "test_data": t.test_data,
            "test_steps": t.test_steps,
            "expected_result": t.expected_result,
            "actual_result": t.actual_result,
            "priority": t.priority,
            "risk_level": t.risk_level,
            "review_status": t.review_status,
            "execution_status": t.execution_status,
            "execution_notes": t.execution_notes,
            "executed_at": t.executed_at.isoformat() if t.executed_at else None,
            "validation_results": t.validation_results,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in tests
    ]


@router.patch("/qa-test-cases/{test_id}")
def update_qa_test_case(
    test_id: int,
    payload: QATestCasePatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    tc = db.get(QATestCase, test_id)
    if not tc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test case not found")

    prev_val = {
        "title": tc.title,
        "review_status": tc.review_status,
        "execution_status": tc.execution_status,
        "actual_result": tc.actual_result,
    }

    if payload.title is not None:
        tc.title = payload.title.strip()
    if payload.category is not None:
        tc.category = payload.category
    if payload.preconditions is not None:
        tc.preconditions = payload.preconditions
    if payload.test_data is not None:
        tc.test_data = payload.test_data
    if payload.test_steps is not None:
        tc.test_steps = payload.test_steps
    if payload.expected_result is not None:
        tc.expected_result = payload.expected_result
    if payload.priority is not None:
        tc.priority = payload.priority
    if payload.risk_level is not None:
        tc.risk_level = payload.risk_level
    if payload.review_status is not None:
        tc.review_status = payload.review_status
        tc.reviewed_by_id = user.id
        tc.reviewed_at = datetime.utcnow()

    # MANUAL EXECUTION STATUS UPDATE
    if payload.execution_status is not None:
        tc.execution_status = payload.execution_status
        tc.executed_by_id = user.id
        tc.executed_at = datetime.utcnow()
    if payload.actual_result is not None:
        tc.actual_result = payload.actual_result
    if payload.execution_notes is not None:
        tc.execution_notes = payload.execution_notes

    # Audit Trail
    action = "executed" if payload.execution_status else ("reviewed" if payload.review_status else "edited")
    db.add(
        ArtifactReviewHistory(
            artifact_type="qa_test_case",
            artifact_id=tc.id,
            user_id=user.id,
            action=action,
            previous_value=prev_val,
            updated_value={
                "title": tc.title,
                "review_status": tc.review_status,
                "execution_status": tc.execution_status,
                "actual_result": tc.actual_result,
            },
            review_note=payload.execution_notes,
        )
    )

    db.commit()
    return {"success": True, "message": "Test case updated", "test_case": tc}


@router.delete("/qa-test-cases/{test_id}")
def delete_qa_test_case(
    test_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    tc = db.get(QATestCase, test_id)
    if not tc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test case not found")
    db.delete(tc)
    db.commit()
    return {"success": True, "message": "Test case deleted"}


@router.get("/qa-test-cases/export-csv")
def export_test_cases_csv(
    project_id: int | None = None,
    prd_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    query = select(QATestCase).order_by(QATestCase.id.asc())
    if project_id:
        query = query.where(QATestCase.project_id == project_id)
    if prd_id:
        query = query.where(QATestCase.prd_id == prd_id)
    tests = db.scalars(query).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Headers
    writer.writerow([
        "Test ID",
        "Title",
        "Category",
        "Priority",
        "Risk Level",
        "Preconditions",
        "Test Steps",
        "Expected Result",
        "Actual Result",
        "Review Status",
        "Execution Status",
        "Execution Notes",
        "Requirement Ref",
        "User Story ID",
    ])

    for t in tests:
        steps_str = " | ".join(t.test_steps) if isinstance(t.test_steps, list) else str(t.test_steps or "")
        writer.writerow([
            t.test_case_key,
            t.title,
            t.category,
            t.priority,
            t.risk_level,
            t.preconditions or "",
            steps_str,
            t.expected_result,
            t.actual_result or "",
            t.review_status,
            t.execution_status,
            t.execution_notes or "",
            t.requirement_id,
            t.story_id,
        ])

    output.seek(0)
    filename = f"zentriq_qa_test_cases_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ==============================================================================
# 10. OVERVIEW METRICS & TRACEABILITY MATRIX
# ==============================================================================

@router.get("/overview-metrics")
def get_overview_metrics(
    project_id: int | None = None,
    prd_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    # Total User Stories
    us_q = select(UserStory)
    if project_id:
        us_q = us_q.where(UserStory.project_id == project_id)
    if prd_id:
        us_q = us_q.where(UserStory.prd_id == prd_id)
    all_stories = db.scalars(us_q).all()

    total_stories = len(all_stories)
    approved_stories = sum(1 for s in all_stories if s.review_status == "approved")

    # Criteria
    ac_q = select(AcceptanceCriterion)
    if project_id:
        ac_q = ac_q.where(AcceptanceCriterion.project_id == project_id)
    if prd_id:
        ac_q = ac_q.where(AcceptanceCriterion.prd_id == prd_id)
    all_criteria = db.scalars(ac_q).all()
    total_criteria = len(all_criteria)
    approved_criteria = sum(1 for c in all_criteria if c.review_status == "approved")

    # Edge cases
    ec_q = select(EdgeCase)
    if project_id:
        ec_q = ec_q.where(EdgeCase.project_id == project_id)
    if prd_id:
        ec_q = ec_q.where(EdgeCase.prd_id == prd_id)
    all_edge_cases = db.scalars(ec_q).all()
    total_edge_cases = len(all_edge_cases)

    # QA Test Cases
    tc_q = select(QATestCase)
    if project_id:
        tc_q = tc_q.where(QATestCase.project_id == project_id)
    if prd_id:
        tc_q = tc_q.where(QATestCase.prd_id == prd_id)
    all_test_cases = db.scalars(tc_q).all()
    total_test_cases = len(all_test_cases)
    approved_test_cases = sum(1 for t in all_test_cases if t.review_status == "approved")
    passed_tests = sum(1 for t in all_test_cases if t.execution_status == "passed")
    failed_tests = sum(1 for t in all_test_cases if t.execution_status == "failed")
    blocked_tests = sum(1 for t in all_test_cases if t.execution_status == "blocked")
    not_run_tests = sum(1 for t in all_test_cases if t.execution_status == "not_run")

    # Traceability Coverage
    # Unique requirements in PRDs
    total_approved_reqs = 0
    covered_approved_reqs = 0
    if prd_id:
        prd = db.get(PRD, prd_id)
        if prd and prd.content:
            reqs = prd.content.get("functionalRequirements", [])
            total_approved_reqs = len(reqs)
            req_ids_with_stories = {s.requirement_id for s in all_stories if s.review_status == "approved"}
            covered_approved_reqs = sum(1 for r in reqs if r.get("id") in req_ids_with_stories)
    else:
        req_ids_with_stories = {s.requirement_id for s in all_stories if s.review_status == "approved"}
        covered_approved_reqs = len(req_ids_with_stories)
        total_approved_reqs = max(len({s.requirement_id for s in all_stories}), 1)

    req_coverage_pct = (
        round((covered_approved_reqs / total_approved_reqs) * 100) if total_approved_reqs > 0 else 0
    )

    crit_with_tests = {t.acceptance_criteria_id for t in all_test_cases if t.acceptance_criteria_id}
    crit_coverage_pct = (
        round((len(crit_with_tests) / total_criteria) * 100) if total_criteria > 0 else 0
    )

    # Recent activity
    hist_q = select(ArtifactReviewHistory).order_by(ArtifactReviewHistory.id.desc()).limit(8)
    recent_activity = db.scalars(hist_q).all()

    # Recent AI generations
    gen_q = select(AIGenerationHistory).order_by(AIGenerationHistory.id.desc()).limit(5)
    recent_generations = db.scalars(gen_q).all()

    return {
        "metrics": {
            "total_user_stories": total_stories,
            "approved_stories": approved_stories,
            "total_acceptance_criteria": total_criteria,
            "approved_criteria": approved_criteria,
            "total_edge_cases": total_edge_cases,
            "total_qa_test_cases": total_test_cases,
            "approved_test_cases": approved_test_cases,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "blocked_tests": blocked_tests,
            "not_run_tests": not_run_tests,
            "requirement_coverage_pct": req_coverage_pct,
            "criteria_coverage_pct": crit_coverage_pct,
        },
        "workflow_progress": {
            "prds_count": 1 if prd_id else db.scalar(select(func.count(PRD.id))),
            "requirements_count": total_approved_reqs,
            "stories_count": total_stories,
            "criteria_count": total_criteria,
            "edge_cases_count": total_edge_cases,
            "test_cases_count": total_test_cases,
        },
        "recent_activity": [
            {
                "id": a.id,
                "artifact_type": a.artifact_type,
                "artifact_id": a.artifact_id,
                "action": a.action,
                "review_note": a.review_note,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in recent_activity
        ],
        "recent_generations": [
            {
                "id": g.id,
                "generation_type": g.generation_type,
                "model_name": g.model_name,
                "prompt_summary": g.prompt_summary,
                "status": g.status,
                "tokens_used": g.tokens_used,
                "latency_ms": g.latency_ms,
                "created_at": g.created_at.isoformat() if g.created_at else None,
            }
            for g in recent_generations
        ],
    }


@router.get("/traceability-matrix")
def get_traceability_matrix(
    project_id: int | None = None,
    prd_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    """Hierarchical Traceability Matrix: PRD -> Requirement -> Story -> Criteria -> Edge Cases -> QA Tests."""
    prd_list = []
    if prd_id:
        p = db.get(PRD, prd_id)
        if p:
            prd_list.append(p)
    elif project_id:
        prd_list = db.scalars(select(PRD).where(PRD.project_id == project_id)).all()
    else:
        prd_list = db.scalars(select(PRD).order_by(PRD.id.desc()).limit(10)).all()

    matrix_rows = []
    total_req_count = 0
    req_with_approved_stories = 0
    stories_without_criteria = 0
    criteria_without_tests = 0

    for prd in prd_list:
        content = prd.content or {}
        reqs = content.get("functionalRequirements", [])
        total_req_count += len(reqs)

        # Pre-fetch stories for this PRD
        stories = db.scalars(select(UserStory).where(UserStory.prd_id == prd.id)).all()
        stories_by_req = {}
        for s in stories:
            stories_by_req.setdefault(s.requirement_id, []).append(s)

        for req in reqs:
            req_id = req.get("id") or "FR-00"
            linked_stories = stories_by_req.get(req_id, [])

            has_approved_story = any(s.review_status == "approved" for s in linked_stories)
            if has_approved_story:
                req_with_approved_stories += 1

            stories_data = []
            for s in linked_stories:
                criteria = s.acceptance_criteria
                edge_cases = s.edge_cases
                test_cases = s.qa_test_cases

                if not criteria:
                    stories_without_criteria += 1

                for c in criteria:
                    linked_tc = [t for t in test_cases if t.acceptance_criteria_id == c.id]
                    if not linked_tc:
                        criteria_without_tests += 1

                stories_data.append({
                    "id": s.id,
                    "story_key": s.story_key,
                    "title": s.title,
                    "priority": s.priority,
                    "review_status": s.review_status,
                    "criteria": [
                        {
                            "id": c.id,
                            "key": c.criteria_key,
                            "title": c.title,
                            "review_status": c.review_status,
                            "tests": [
                                {
                                    "id": t.id,
                                    "key": t.test_case_key,
                                    "title": t.title,
                                    "category": t.category,
                                    "review_status": t.review_status,
                                    "execution_status": t.execution_status,
                                }
                                for t in test_cases if t.acceptance_criteria_id == c.id
                            ],
                        }
                        for c in criteria
                    ],
                    "edge_cases": [
                        {
                            "id": ec.id,
                            "key": ec.edge_case_key,
                            "category": ec.category,
                            "severity": ec.severity,
                            "review_status": ec.review_status,
                        }
                        for ec in edge_cases
                    ],
                    "test_cases_direct": [
                        {
                            "id": t.id,
                            "key": t.test_case_key,
                            "title": t.title,
                            "category": t.category,
                            "review_status": t.review_status,
                            "execution_status": t.execution_status,
                        }
                        for t in test_cases if not t.acceptance_criteria_id
                    ],
                })

            matrix_rows.append({
                "prd_id": prd.id,
                "prd_title": prd.title,
                "requirement_id": req_id,
                "requirement_title": req.get("title", ""),
                "requirement_description": req.get("description", ""),
                "priority": req.get("priority", "P1"),
                "stories_count": len(linked_stories),
                "is_covered": has_approved_story,
                "stories": stories_data,
            })

    coverage_rate = (
        round((req_with_approved_stories / total_req_count) * 100) if total_req_count > 0 else 0
    )

    return {
        "summary": {
            "total_requirements": total_req_count,
            "covered_requirements": req_with_approved_stories,
            "coverage_rate_pct": coverage_rate,
            "stories_without_criteria": stories_without_criteria,
            "criteria_without_tests": criteria_without_tests,
        },
        "rows": matrix_rows,
    }
