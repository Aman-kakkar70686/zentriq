import json
import logging
import os
import time
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import current_user
from ..models import ActivityLog, PRD, Project, RequirementAnalysis, RequirementIssue, RequirementReviewHistory, Task, User
from ..schemas import AnalysePRDIn, ApplySuggestionsIn, BenchmarkEvaluationIn, IssueReviewPatchIn, PRDCreateIn, PRDGenerateIn

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

PRD_SYSTEM_PROMPT = """You are an elite Principal Technical Product Manager who has led product at top-tier tech companies.
Your responsibility is to analyze raw product problem statements, dissect the underlying customer and business friction, and generate a comprehensive, highly structured Product Requirements Document (PRD).

Your output MUST be strictly valid JSON conforming exactly to the following structure:
{
  "title": "Clear, compelling feature or product title",
  "version": "1.0.0",
  "status": "Ready for Engineering Review",
  "executiveSummary": "Concise 2-3 paragraph executive summary of the feature, business context, and expected impact.",
  "problemStatement": {
    "summary": "Core problem description",
    "rootCauses": [
      "Root cause 1",
      "Root cause 2",
      "Root cause 3"
    ],
    "userPainPoints": [
      "User pain point 1",
      "User pain point 2"
    ],
    "impactAndUrgency": "Quantified business impact and why solving this now matters."
  },
  "targetAudience": {
    "primaryPersona": "Name and brief profile of the primary persona",
    "secondaryPersona": "Name and brief profile of secondary persona",
    "userNeeds": [
      "Core user need 1",
      "Core user need 2"
    ]
  },
  "goalsAndSuccessMetrics": {
    "primaryGoal": "The single most important strategic objective.",
    "kpis": [
      {
        "metric": "Key metric name",
        "current": "Estimated baseline value",
        "target": "Target improvement",
        "timeline": "Measurement window e.g. 60 days post-launch"
      }
    ]
  },
  "userStories": [
    {
      "id": "US-01",
      "asA": "user persona",
      "iWantTo": "action they want to perform",
      "soThat": "benefit or value received",
      "acceptanceCriteria": [
        "Criterion 1 (Given... When... Then...)",
        "Criterion 2"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-01",
      "title": "Requirement title",
      "description": "Specific functional capability to be built.",
      "priority": "P0",
      "complexity": "Low | Medium | High"
    }
  ],
  "nonFunctionalRequirements": [
    {
      "category": "Performance | Security | Scalability | Accessibility",
      "requirement": "Specific non-functional constraint or requirement."
    }
  ],
  "assumptionsAndRisks": [
    {
      "risk": "Identified risk description",
      "impact": "Low | Medium | High",
      "mitigation": "Actionable mitigation strategy"
    }
  ],
  "rolloutPlan": [
    {
      "phase": "Phase 1: Alpha / Internal Dogfooding",
      "timeline": "Week 1-2",
      "scope": "Scope description"
    },
    {
      "phase": "Phase 2: Beta Rollout",
      "timeline": "Week 3",
      "scope": "Scope description"
    },
    {
      "phase": "Phase 3: General Availability (GA)",
      "timeline": "Week 4",
      "scope": "Scope description"
    }
  ]
}

Provide realistic, insightful, and production-grade content with at least 3-4 User Stories, 4-6 Functional Requirements (covering P0, P1, P2), 4 Non-Functional Requirements, 3 Risks, and 3 Rollout Phases. Ensure all JSON syntax is completely valid without markdown formatting or trailing commas.
"""


def get_api_key(header_key: str | None = None) -> str | None:
    if header_key and header_key.strip():
        return header_key.strip()
    if settings.gemini_api_key and settings.gemini_api_key.strip():
        return settings.gemini_api_key.strip()
    return os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")


@router.get("/config")
def get_ai_config(user: User = Depends(current_user)):
    """Check AI configuration status."""
    has_key = bool(get_api_key())
    return {
        "configured": has_key,
        "default_model": settings.gemini_model or "gemini-2.5-flash",
        "supported_models": [
            {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "badge": "Primary / Recommended", "description": "Ultra-fast, high reasoning quality, structured output"},
            {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash", "badge": "Fast", "description": "Low latency generation"},
            {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash", "badge": "Stable Fallback", "description": "Long context window, stable output"},
        ],
    }


@router.post("/generate-prd")
async def generate_prd(
    payload: PRDGenerateIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    x_gemini_key: str | None = Header(None, alias="X-Gemini-Key"),
):
    """Analyze a product problem and generate a structured PRD using Google Gemini API."""
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    api_key = get_api_key(x_gemini_key)
    if not api_key:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Gemini API key is required. Please set GEMINI_API_KEY in backend/.env or enter it in the AI PM Copilot settings.",
        )

    model = payload.model_name or settings.gemini_model or "gemini-2.5-flash"

    # Construct user prompt with rich product context
    user_prompt = f"""Generate a comprehensive Product Requirements Document (PRD) for the following product problem:

Project Name: {project.name}
Feature / Product Name: {payload.feature_name}
Problem Statement:
{payload.problem_statement}
"""
    if payload.target_audience:
        user_prompt += f"\nTarget Audience: {payload.target_audience}"
    if payload.business_objective:
        user_prompt += f"\nBusiness Objective: {payload.business_objective}"
    if payload.additional_context:
        user_prompt += f"\nAdditional Context & Constraints:\n{payload.additional_context}"

    gemini_body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_prompt}],
            }
        ],
        "systemInstruction": {
            "parts": [{"text": PRD_SYSTEM_PROMPT}],
        },
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    start_time = time.time()
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(endpoint, json=gemini_body)

        # Fallback to gemini-1.5-flash if 2.5 returns 404/unsupported model in region
        if resp.status_code == 404 and model != "gemini-1.5-flash":
            logger.warning(f"Model {model} returned 404. Falling back to gemini-1.5-flash...")
            fallback_endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            model = "gemini-1.5-flash"
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(fallback_endpoint, json=gemini_body)

        if resp.status_code != 200:
            error_data = resp.json().get("error", {}) if resp.headers.get("content-type", "").startswith("application/json") else {}
            err_msg = error_data.get("message") or f"Gemini API error ({resp.status_code}): {resp.text[:200]}"
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Gemini AI error: {err_msg}")

        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Gemini did not return any candidates.")

        raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        if not raw_text:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Empty response received from Gemini.")

        # Clean JSON if any accidental backticks exist
        cleaned_text = raw_text.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[3:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
        cleaned_text = cleaned_text.strip()

        parsed_prd = json.loads(cleaned_text)

        elapsed_ms = int((time.time() - start_time) * 1000)
        usage = data.get("usageMetadata", {})
        tokens_used = usage.get("totalTokenCount", 0)

        return {
            "success": True,
            "prd": parsed_prd,
            "model_used": model,
            "latency_ms": elapsed_ms,
            "tokens_used": tokens_used,
            "project_id": project.id,
            "project_name": project.name,
            "feature_name": payload.feature_name,
            "generated_at": datetime.utcnow().isoformat(),
        }

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}\nRaw: {raw_text[:500]}")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Gemini returned invalid JSON structure: {str(e)}",
        )
    except httpx.RequestError as e:
        logger.error(f"Network error communicating with Gemini: {e}")
        raise HTTPException(
            status.HTTP_504_GATEWAY_TIMEOUT,
            f"Network timeout communicating with Gemini API: {str(e)}",
        )


@router.post("/prds")
def save_prd(
    payload: PRDCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Save a generated PRD to database."""
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    prd = PRD(
        project_id=payload.project_id,
        user_id=user.id,
        title=payload.title,
        feature_name=payload.feature_name,
        problem_statement=payload.problem_statement,
        target_audience=payload.target_audience,
        business_objective=payload.business_objective,
        additional_context=payload.additional_context,
        model_name=payload.model_name,
        status=payload.status,
        content=payload.content,
        tokens_used=payload.tokens_used,
        generation_time_ms=payload.generation_time_ms,
    )
    db.add(prd)

    # Activity log
    log = ActivityLog(
        project_id=project.id,
        user_id=user.id,
        kind="ai",
        action="Created PRD",
        subject=payload.title,
        detail=f"PRD for {payload.feature_name} in {project.name}",
    )
    db.add(log)
    db.commit()
    db.refresh(prd)

    return {
        "id": prd.id,
        "title": prd.title,
        "feature_name": prd.feature_name,
        "project_id": prd.project_id,
        "project_name": project.name,
        "model_name": prd.model_name,
        "status": prd.status,
        "created_at": prd.created_at.isoformat(),
        "tokens_used": prd.tokens_used,
        "generation_time_ms": prd.generation_time_ms,
        "content": prd.content,
    }


@router.get("/prds")
def list_prds(
    project_id: int | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """List all saved PRDs."""
    query = select(PRD).order_by(desc(PRD.created_at))
    if project_id:
        query = query.where(PRD.project_id == project_id)

    prds = db.scalars(query).all()
    results = []
    for p in prds:
        results.append({
            "id": p.id,
            "title": p.title,
            "feature_name": p.feature_name,
            "problem_statement": p.problem_statement,
            "project_id": p.project_id,
            "project_name": p.project.name if p.project else "Unknown",
            "model_name": p.model_name,
            "status": p.status,
            "tokens_used": p.tokens_used,
            "generation_time_ms": p.generation_time_ms,
            "created_at": p.created_at.isoformat(),
            "content": p.content,
        })
    return results


@router.get("/prds/{prd_id}")
def get_prd(
    prd_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Get single PRD by ID."""
    p = db.get(PRD, prd_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PRD not found")
    return {
        "id": p.id,
        "title": p.title,
        "feature_name": p.feature_name,
        "problem_statement": p.problem_statement,
        "target_audience": p.target_audience,
        "business_objective": p.business_objective,
        "additional_context": p.additional_context,
        "project_id": p.project_id,
        "project_name": p.project.name if p.project else "Unknown",
        "model_name": p.model_name,
        "status": p.status,
        "tokens_used": p.tokens_used,
        "generation_time_ms": p.generation_time_ms,
        "created_at": p.created_at.isoformat(),
        "content": p.content,
    }


@router.delete("/prds/{prd_id}")
def delete_prd(
    prd_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Delete a saved PRD."""
    p = db.get(PRD, prd_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PRD not found")
    db.delete(p)
    db.commit()
    return {"status": "deleted", "id": prd_id}


@router.post("/prds/{prd_id}/convert-to-tasks")
def convert_prd_to_tasks(
    prd_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Convert PRD functional requirements into actionable project tasks."""
    p = db.get(PRD, prd_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PRD not found")

    content = p.content or {}
    functional_reqs = content.get("functionalRequirements", [])
    if not functional_reqs:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "PRD contains no functional requirements to convert.")

    created_tasks = []
    priority_map = {"P0": "high", "P1": "medium", "P2": "low"}

    for req in functional_reqs:
        req_title = req.get("title") or req.get("id") or "Requirement"
        task_title = f"[{req.get('priority', 'P1')}] {req_title}"
        task_desc = f"{req.get('description', '')}\n\nGenerated from PRD: {p.title}"

        task = Task(
            title=task_title[:200],
            description=task_desc,
            project_id=p.project_id,
            assignee_id=user.id,
            status="planned",
            priority=priority_map.get(req.get("priority"), "medium"),
            task_type="feature",
        )
        db.add(task)
        created_tasks.append(task)

    # Activity log
    log = ActivityLog(
        project_id=p.project_id,
        user_id=user.id,
        kind="moved",
        action="Generated Tasks",
        subject=f"{len(created_tasks)} Tasks from PRD",
        detail=f"Converted requirements from {p.title}",
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Successfully created {len(created_tasks)} tasks in project '{p.project.name}'.",
        "task_count": len(created_tasks),
    }


# ==============================================================================
# WEEK 2: AI REQUIREMENT INTELLIGENCE & QUALITY ENGINE
# ==============================================================================

REQUIREMENT_ANALYSIS_SYSTEM_PROMPT = """You are an elite Principal Business Analyst and Lead Requirements Quality Reviewer at a top-tier technology firm.
Your responsibility is to critically evaluate a Product Requirements Document (PRD) across four defect vectors:

1. MISSING REQUIREMENTS:
Identify important gaps relevant to the product context: user roles/permissions, business rules, workflows, validation, error handling, security, performance, success metrics, and dependencies.
Only report gaps genuinely relevant to this specific product context. Do not invent arbitrary gaps.
Distinguish:
- "confirmed" missing information (definite omission)
- "potential" missing information (standard industry practice)
- "needs_clarification" (requires PM decision)

2. AMBIGUOUS REQUIREMENTS:
Identify requirements that are unclear, subjective, vague, or non-verifiable.
Examples: "system should be fast", "users should have an easy experience", "full control", "promptly", "clean UI".
For each issue: identify the ambiguous phrase, explain why it cannot be tested objectively, suggest a concrete verifiable alternative without inventing arbitrary metrics, and ask a clarification question.

3. CONFLICTING REQUIREMENTS:
Identify genuine contradictions or conflicting constraints between statements across user roles, permissions, auth, business rules, workflow steps, data requirements, or non-functional criteria.
You MUST identify BOTH statements (Statement A and Statement B) with their requirement references and explain why they cannot coexist. Distinguish genuine contradictions from conditional rules that can coexist under different scenarios.

4. INCOMPLETE REQUIREMENTS:
Identify functional requirements lacking essential criteria: actor, trigger condition, expected result, business rules, validation, edge cases, error handling, or acceptance criteria.
Suggest missing acceptance criteria in Given-When-Then format.

Output MUST be strictly valid JSON conforming exactly to this structure:
{
  "missingRequirements": [
    {
      "id": "MISS-01",
      "title": "Clear short title of missing requirement",
      "category": "error_handling | security | permissions | validation | workflow | performance | data",
      "severity": "Critical | High | Medium | Low",
      "section": "PRD section where this belongs",
      "confidence": "confirmed | potential | needs_clarification",
      "explanation": "Detailed explanation of what is missing",
      "whyItMatters": "Business or engineering risk if not specified",
      "suggestedRequirement": "Concrete, production-grade requirement text ready to add to the PRD",
      "clarificationQuestion": "Targeted question for the PM to clarify requirements",
      "evidence": "Evidence showing the gap in the current PRD"
    }
  ],
  "ambiguousRequirements": [
    {
      "id": "AMB-01",
      "requirementReference": "Requirement ID or section e.g. FR-02 or NFR-01",
      "originalText": "Exact text containing ambiguity",
      "ambiguousPhrase": "Specific ambiguous word or phrase",
      "severity": "Critical | High | Medium | Low",
      "explanation": "Why this phrase is subjective or difficult to test",
      "suggestedImprovement": "Clear, specific, verifiable replacement requirement",
      "clarificationQuestion": "Clarification question if exact metric target is unknown",
      "evidence": "Supporting context from the PRD"
    }
  ],
  "conflictingRequirements": [
    {
      "id": "CONF-01",
      "requirementRefA": "ID of Requirement A",
      "statementA": "Exact text of statement A",
      "requirementRefB": "ID of Requirement B",
      "statementB": "Exact text of statement B",
      "conflictType": "genuine | conditional",
      "severity": "Critical | High | Medium | Low",
      "explanation": "Why statement A and statement B contradict each other",
      "potentialImpact": "Technical or product failure if implemented as-is",
      "suggestedResolution": "Suggested compromise or rule adjustment",
      "clarificationRequired": "Question asking PM to choose or clarify condition",
      "evidence": "Cross-reference comparison"
    }
  ],
  "incompleteRequirements": [
    {
      "id": "INC-01",
      "requirementReference": "Requirement ID e.g. FR-01",
      "originalText": "Original requirement statement",
      "severity": "Critical | High | Medium | Low",
      "missingElements": ["Trigger Condition", "Validation Rules", "Acceptance Criteria", "Error Handling"],
      "explanation": "What specific operational criteria are absent",
      "suggestedImprovement": "Complete requirement specifying actor, trigger, and expected result",
      "suggestedAcceptanceCriteria": [
        "Given [context], When [action], Then [outcome]"
      ],
      "evidence": "Missing elements in current formulation"
    }
  ],
  "assessmentSummary": {
    "prdTitle": "Title",
    "totalRequirementsAnalyzed": 12,
    "completenessObservation": "Observations on completeness",
    "clarityObservation": "Observations on clarity",
    "consistencyObservation": "Observations on consistency",
    "testabilityObservation": "Observations on testability"
  }
}

Do not include markdown backticks or commentary outside the JSON. Return strictly valid JSON.
"""


def calculate_requirement_quality_scores(analysis_data: dict, prd_content: dict) -> dict:
    """
    Deterministic scoring framework between 0 and 100 based on validated analysis results.
    1. Completeness: 25 points
    2. Clarity: 20 points
    3. Testability: 20 points
    4. Feasibility: 15 points
    5. Consistency: 10 points
    6. Risk and dependency coverage: 10 points
    TOTAL: 100 POINTS
    """
    missing = analysis_data.get("missingRequirements", [])
    ambiguous = analysis_data.get("ambiguousRequirements", [])
    conflicting = analysis_data.get("conflictingRequirements", [])
    incomplete = analysis_data.get("incompleteRequirements", [])

    severity_weight = {"Critical": 1.0, "High": 0.6, "Medium": 0.35, "Low": 0.15}

    # 1. COMPLETENESS (25 points max)
    comp_score = 25.0
    comp_problems = []
    comp_recommendations = []
    for m in missing:
        sev = m.get("severity", "Medium")
        penalty = 5.0 * severity_weight.get(sev, 0.35)
        comp_score -= penalty
        comp_problems.append(f"[{sev}] Missing {m.get('category', 'requirement')}: {m.get('title')}")
        if m.get("suggestedRequirement"):
            comp_recommendations.append(f"Add requirement: {m.get('title')}")

    # Check incomplete requirements for missing core validation/triggers
    for inc in incomplete:
        missing_el = inc.get("missingElements", [])
        if "Validation Rules" in missing_el or "Error Handling" in missing_el:
            comp_score -= 1.0
            comp_problems.append(f"Incomplete behavior in {inc.get('requirementReference')}: missing validation/error handling")

    comp_score = max(0.0, min(25.0, round(comp_score, 1)))
    comp_explanation = (
        "Strong requirement coverage across core flows."
        if comp_score >= 21
        else "Several essential edge cases, error states, or permissions are omitted."
        if comp_score >= 14
        else "Significant requirement gaps identified across multiple critical functional areas."
    )

    # 2. CLARITY (20 points max)
    clarity_score = 20.0
    clarity_problems = []
    clarity_recommendations = []
    for amb in ambiguous:
        sev = amb.get("severity", "Medium")
        penalty = 4.0 * severity_weight.get(sev, 0.35)
        clarity_score -= penalty
        clarity_problems.append(f"[{sev}] Ambiguous phrase '{amb.get('ambiguousPhrase')}' in {amb.get('requirementReference')}")
        if amb.get("suggestedImprovement"):
            clarity_recommendations.append(f"Replace '{amb.get('ambiguousPhrase')}' with verified target in {amb.get('requirementReference')}")

    clarity_score = max(0.0, min(20.0, round(clarity_score, 1)))
    clarity_explanation = (
        "High requirement clarity with specific, unambiguous definitions."
        if clarity_score >= 16
        else "Contains subjective or qualitative adjectives that are difficult for developers to implement consistently."
        if clarity_score >= 10
        else "Widespread ambiguous terminology prevents verifiable engineering execution."
    )

    # 3. TESTABILITY (20 points max)
    test_score = 20.0
    test_problems = []
    test_recommendations = []
    for inc in incomplete:
        sev = inc.get("severity", "Medium")
        penalty = 3.5 * severity_weight.get(sev, 0.35)
        test_score -= penalty
        test_problems.append(f"[{sev}] Untestable requirement {inc.get('requirementReference')}: lacks expected outcome or acceptance criteria")
        if inc.get("suggestedAcceptanceCriteria"):
            test_recommendations.append(f"Add Given-When-Then criteria for {inc.get('requirementReference')}")

    # Deduct if user stories lack acceptance criteria in the PRD itself
    stories = prd_content.get("userStories", [])
    if stories and not any(s.get("acceptanceCriteria") for s in stories):
        test_score -= 4.0
        test_problems.append("User stories in PRD lack acceptance criteria.")

    test_score = max(0.0, min(20.0, round(test_score, 1)))
    test_explanation = (
        "Requirements feature rigorous acceptance criteria and clear pass/fail verification boundaries."
        if test_score >= 16
        else "Several requirements lack testable triggers, validation rules, or edge case conditions."
        if test_score >= 10
        else "Insufficient acceptance criteria; QA cannot generate reliable test suites without extensive clarifications."
    )

    # 4. FEASIBILITY (15 points max)
    feas_score = 15.0
    feas_problems = []
    feas_recommendations = []
    for m in missing:
        if m.get("category") in ["performance", "security", "data", "integration"] and m.get("severity") in ["Critical", "High"]:
            feas_score -= 2.0
            feas_problems.append(f"Architecture/feasibility risk: missing {m.get('category')} specification ({m.get('title')})")
            feas_recommendations.append(f"Define engineering specifications for {m.get('title')}")

    for amb in ambiguous:
        if "under" in str(amb.get("originalText", "")).lower() and amb.get("severity") in ["Critical", "High"]:
            feas_score -= 1.5
            feas_problems.append(f"Potentially unfeasible benchmark in {amb.get('requirementReference')}")

    feas_score = max(0.0, min(15.0, round(feas_score, 1)))
    feas_explanation = (
        "Technical scope, constraints, and dependencies are realistic and implementable."
        if feas_score >= 12
        else "High technical complexity or unspecified architectural boundaries may impact delivery timelines."
        if feas_score >= 8
        else "Significant feasibility concerns due to unaddressed architectural, security, or throughput constraints."
    )

    # 5. CONSISTENCY (10 points max)
    cons_score = 10.0
    cons_problems = []
    cons_recommendations = []
    for c in conflicting:
        sev = c.get("severity", "Medium")
        penalty = 3.5 * severity_weight.get(sev, 0.35)
        cons_score -= penalty
        cons_problems.append(f"[{sev}] Conflict between {c.get('requirementRefA')} and {c.get('requirementRefB')}: {c.get('explanation')[:100]}...")
        if c.get("suggestedResolution"):
            cons_recommendations.append(c.get("suggestedResolution"))

    cons_score = max(0.0, min(10.0, round(cons_score, 1)))
    cons_explanation = (
        "No internal contradictions detected across permissions, workflows, or rules."
        if cons_score >= 9
        else "Minor potential friction between workflow conditions or permission boundaries."
        if cons_score >= 6
        else "Direct contradictions exist between requirements that will block engineering implementation."
    )

    # 6. RISK & DEPENDENCY COVERAGE (10 points max)
    risk_score = 10.0
    risk_problems = []
    risk_recommendations = []
    assumptions_risks = prd_content.get("assumptionsAndRisks", [])
    if not assumptions_risks:
        risk_score -= 4.0
        risk_problems.append("PRD contains no documented assumptions, risks, or mitigations.")
        risk_recommendations.append("Document technical and operational risks in Section 8.")

    for m in missing:
        if m.get("category") in ["security", "integration", "dependencies"]:
            risk_score -= 1.5
            risk_problems.append(f"Missing dependency/security specification: {m.get('title')}")

    risk_score = max(0.0, min(10.0, round(risk_score, 1)))
    risk_explanation = (
        "Comprehensive risk mitigation and third-party dependency coverage."
        if risk_score >= 8
        else "Some external service dependencies or failure risks are unaccounted for."
        if risk_score >= 5
        else "Critical blind spots in security, fallback paths, or external dependencies."
    )

    total_score = round(comp_score + clarity_score + test_score + feas_score + cons_score + risk_score)
    total_score = max(0, min(100, total_score))

    if total_score >= 90:
        label = "Excellent"
    elif total_score >= 75:
        label = "Good"
    elif total_score >= 60:
        label = "Needs Improvement"
    elif total_score >= 40:
        label = "Poor"
    else:
        label = "Critical"

    category_scores = {
        "completeness": {
            "score": comp_score,
            "max_score": 25,
            "percentage": round((comp_score / 25) * 100),
            "explanation": comp_explanation,
            "detected_problems": comp_problems[:5],
            "recommendations": comp_recommendations[:4],
        },
        "clarity": {
            "score": clarity_score,
            "max_score": 20,
            "percentage": round((clarity_score / 20) * 100),
            "explanation": clarity_explanation,
            "detected_problems": clarity_problems[:5],
            "recommendations": clarity_recommendations[:4],
        },
        "testability": {
            "score": test_score,
            "max_score": 20,
            "percentage": round((test_score / 20) * 100),
            "explanation": test_explanation,
            "detected_problems": test_problems[:5],
            "recommendations": test_recommendations[:4],
        },
        "feasibility": {
            "score": feas_score,
            "max_score": 15,
            "percentage": round((feas_score / 15) * 100),
            "explanation": feas_explanation,
            "detected_problems": feas_problems[:4],
            "recommendations": feas_recommendations[:3],
        },
        "consistency": {
            "score": cons_score,
            "max_score": 10,
            "percentage": round((cons_score / 10) * 100),
            "explanation": cons_explanation,
            "detected_problems": cons_problems[:4],
            "recommendations": cons_recommendations[:3],
        },
        "risk_dependencies": {
            "score": risk_score,
            "max_score": 10,
            "percentage": round((risk_score / 10) * 100),
            "explanation": risk_explanation,
            "detected_problems": risk_problems[:4],
            "recommendations": risk_recommendations[:3],
        },
    }

    # Count issues by severity
    all_issues = missing + ambiguous + conflicting + incomplete
    by_severity = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for iss in all_issues:
        s = iss.get("severity", "Medium")
        if s in by_severity:
            by_severity[s] += 1

    issue_summary = {
        "total_issues": len(all_issues),
        "missing_count": len(missing),
        "ambiguous_count": len(ambiguous),
        "conflicting_count": len(conflicting),
        "incomplete_count": len(incomplete),
        "by_severity": by_severity,
    }

    return {
        "overall_score": total_score,
        "score_label": label,
        "category_scores": category_scores,
        "issue_summary": issue_summary,
    }


@router.post("/analyse-requirements")
async def analyse_requirements(
    payload: AnalysePRDIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    x_gemini_key: str | None = Header(None, alias="X-Gemini-Key"),
):
    """
    Module 1-6 & 11: Execute AI Requirement Intelligence Engine on an existing PRD.
    Detects missing, ambiguous, conflicting, and incomplete requirements,
    calculates a deterministic Quality Score (0-100), and persists analysis & issues.
    """
    prd = db.get(PRD, payload.prd_id)
    if not prd:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PRD not found")

    api_key = get_api_key(x_gemini_key)
    if not api_key:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Gemini API key is required. Please set GEMINI_API_KEY in backend/.env or configure it in the UI settings.",
        )

    model = payload.model_name or settings.gemini_model or "gemini-2.5-flash"
    prd_content = prd.content or {}

    # Format the PRD for Gemini review
    prd_text = f"""PRD TITLE: {prd.title}
PROJECT: {prd.project.name if prd.project else 'Zentriq Project'}
VERSION: {prd_content.get('version', '1.0.0')}
STATUS: {prd.status}
PROBLEM STATEMENT: {prd.problem_statement}

EXECUTIVE SUMMARY:
{prd_content.get('executiveSummary', 'None provided')}

TARGET AUDIENCE:
{json.dumps(prd_content.get('targetAudience', {}), indent=2)}

GOALS & SUCCESS METRICS:
{json.dumps(prd_content.get('goalsAndSuccessMetrics', {}), indent=2)}

USER STORIES:
{json.dumps(prd_content.get('userStories', []), indent=2)}

FUNCTIONAL REQUIREMENTS:
{json.dumps(prd_content.get('functionalRequirements', []), indent=2)}

NON-FUNCTIONAL REQUIREMENTS:
{json.dumps(prd_content.get('nonFunctionalRequirements', []), indent=2)}

ASSUMPTIONS & RISKS:
{json.dumps(prd_content.get('assumptionsAndRisks', []), indent=2)}

ROLLOUT PLAN:
{json.dumps(prd_content.get('rolloutPlan', []), indent=2)}
"""

    gemini_body = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": f"Analyze the following Product Requirements Document (PRD) for defects:\n\n{prd_text}"
                    }
                ],
            }
        ],
        "systemInstruction": {
            "parts": [{"text": REQUIREMENT_ANALYSIS_SYSTEM_PROMPT}],
        },
        "generationConfig": {
            "temperature": 0.15,
            "responseMimeType": "application/json",
        },
    }

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    try:
        async with httpx.AsyncClient(timeout=75.0) as client:
            resp = await client.post(endpoint, json=gemini_body)

        if resp.status_code == 404 and model != "gemini-1.5-flash":
            logger.warning(f"Model {model} returned 404. Falling back to gemini-1.5-flash...")
            model = "gemini-1.5-flash"
            fallback_endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            async with httpx.AsyncClient(timeout=75.0) as client:
                resp = await client.post(fallback_endpoint, json=gemini_body)

        if resp.status_code != 200:
            err_data = resp.json().get("error", {}) if resp.headers.get("content-type", "").startswith("application/json") else {}
            err_msg = err_data.get("message") or f"Gemini API error ({resp.status_code})"
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Gemini AI error: {err_msg}")

        data = resp.json()
        raw_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        if not raw_text:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Empty response received from Gemini analysis.")

        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        parsed_analysis = json.loads(cleaned)

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini Requirement Analysis JSON: {e}\nRaw: {raw_text[:500]}")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Gemini returned invalid analysis JSON: {str(e)}")
    except httpx.RequestError as e:
        logger.error(f"Network error communicating with Gemini: {e}")
        raise HTTPException(status.HTTP_504_GATEWAY_TIMEOUT, f"Network timeout communicating with Gemini: {str(e)}")

    # Deterministic Quality Scoring Calculation (Module 6)
    score_data = calculate_requirement_quality_scores(parsed_analysis, prd_content)

    # Persist Requirement Analysis record (Module 10)
    analysis = RequirementAnalysis(
        prd_id=prd.id,
        project_id=prd.project_id,
        user_id=user.id,
        model_name=model,
        analysis_status="completed",
        overall_score=score_data["overall_score"],
        score_label=score_data["score_label"],
        category_scores=score_data["category_scores"],
        issue_summary=score_data["issue_summary"],
    )
    db.add(analysis)
    db.flush()

    # Persist all individual Requirement Issues (Module 2-5, 10)
    persisted_issues = []

    # 1. Missing Requirements
    for m in parsed_analysis.get("missingRequirements", []):
        iss = RequirementIssue(
            analysis_id=analysis.id,
            prd_id=prd.id,
            issue_type="missing",
            severity=m.get("severity", "Medium"),
            category=m.get("category", "functional"),
            requirement_reference=m.get("section") or m.get("id"),
            original_text=None,
            explanation=m.get("explanation", ""),
            evidence=m.get("evidence", ""),
            why_it_matters=m.get("whyItMatters", ""),
            suggested_improvement=m.get("suggestedRequirement", ""),
            clarification_question=m.get("clarificationQuestion", ""),
            review_status="pending",
        )
        db.add(iss)
        persisted_issues.append(iss)

    # 2. Ambiguous Requirements
    for amb in parsed_analysis.get("ambiguousRequirements", []):
        iss = RequirementIssue(
            analysis_id=analysis.id,
            prd_id=prd.id,
            issue_type="ambiguous",
            severity=amb.get("severity", "Medium"),
            category="clarity",
            requirement_reference=amb.get("requirementReference"),
            original_text=amb.get("originalText"),
            ambiguous_phrase=amb.get("ambiguousPhrase"),
            explanation=amb.get("explanation", ""),
            evidence=amb.get("evidence", ""),
            why_it_matters=None,
            suggested_improvement=amb.get("suggestedImprovement", ""),
            clarification_question=amb.get("clarificationQuestion", ""),
            review_status="pending",
        )
        db.add(iss)
        persisted_issues.append(iss)

    # 3. Conflicting Requirements
    for c in parsed_analysis.get("conflictingRequirements", []):
        iss = RequirementIssue(
            analysis_id=analysis.id,
            prd_id=prd.id,
            issue_type="conflicting",
            severity=c.get("severity", "High"),
            category="consistency",
            requirement_reference=c.get("requirementRefA"),
            original_text=c.get("statementA"),
            conflict_ref_b=c.get("requirementRefB"),
            conflict_requirement_b=c.get("statementB"),
            explanation=c.get("explanation", ""),
            evidence=c.get("evidence", ""),
            why_it_matters=c.get("potentialImpact", ""),
            suggested_improvement=c.get("suggestedResolution", ""),
            clarification_question=c.get("clarificationRequired", ""),
            review_status="pending",
        )
        db.add(iss)
        persisted_issues.append(iss)

    # 4. Incomplete Requirements
    for inc in parsed_analysis.get("incompleteRequirements", []):
        iss = RequirementIssue(
            analysis_id=analysis.id,
            prd_id=prd.id,
            issue_type="incomplete",
            severity=inc.get("severity", "High"),
            category="completeness",
            requirement_reference=inc.get("requirementReference"),
            original_text=inc.get("originalText"),
            missing_elements=inc.get("missingElements"),
            explanation=inc.get("explanation", ""),
            evidence=inc.get("evidence", ""),
            why_it_matters=None,
            suggested_improvement=inc.get("suggestedImprovement", ""),
            clarification_question=None,
            review_status="pending",
        )
        db.add(iss)
        persisted_issues.append(iss)

    # Log Activity
    log = ActivityLog(
        project_id=prd.project_id,
        user_id=user.id,
        kind="ai",
        action="Analyzed PRD Requirements",
        subject=f"{score_data['overall_score']}/100 Quality Score",
        detail=f"Detected {len(persisted_issues)} issues in {prd.title}",
    )
    db.add(log)
    db.commit()
    db.refresh(analysis)

    # Prepare response payload
    issues_out = []
    for i in persisted_issues:
        issues_out.append({
            "id": i.id,
            "issue_type": i.issue_type,
            "severity": i.severity,
            "category": i.category,
            "requirement_reference": i.requirement_reference,
            "original_text": i.original_text,
            "ambiguous_phrase": i.ambiguous_phrase,
            "conflict_ref_b": i.conflict_ref_b,
            "conflict_requirement_b": i.conflict_requirement_b,
            "missing_elements": i.missing_elements,
            "explanation": i.explanation,
            "evidence": i.evidence,
            "why_it_matters": i.why_it_matters,
            "suggested_improvement": i.suggested_improvement,
            "clarification_question": i.clarification_question,
            "review_status": i.review_status,
            "resolution_note": i.resolution_note,
            "created_at": i.created_at.isoformat(),
        })

    return {
        "success": True,
        "analysis_id": analysis.id,
        "prd_id": prd.id,
        "prd_title": prd.title,
        "project_id": prd.project_id,
        "project_name": prd.project.name if prd.project else "Unknown",
        "model_used": model,
        "overall_score": analysis.overall_score,
        "score_label": analysis.score_label,
        "category_scores": analysis.category_scores,
        "issue_summary": analysis.issue_summary,
        "issues": issues_out,
        "created_at": analysis.created_at.isoformat(),
    }


@router.get("/analyses/{prd_id}")
def list_prd_analyses(
    prd_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """List all previous requirement analyses for a PRD to support score and version comparison."""
    prd = db.get(PRD, prd_id)
    if not prd:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PRD not found")

    query = (
        select(RequirementAnalysis)
        .where(RequirementAnalysis.prd_id == prd_id)
        .order_by(desc(RequirementAnalysis.created_at))
    )
    analyses = db.scalars(query).all()

    results = []
    for a in analyses:
        results.append({
            "id": a.id,
            "prd_id": a.prd_id,
            "model_name": a.model_name,
            "overall_score": a.overall_score,
            "score_label": a.score_label,
            "issue_summary": a.issue_summary,
            "created_at": a.created_at.isoformat(),
        })
    return results


@router.get("/analyses/detail/{analysis_id}")
def get_analysis_detail(
    analysis_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Retrieve full details, category scores, and issues for a specific analysis."""
    analysis = db.get(RequirementAnalysis, analysis_id)
    if not analysis:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found")

    issues_out = []
    for i in analysis.issues:
        issues_out.append({
            "id": i.id,
            "issue_type": i.issue_type,
            "severity": i.severity,
            "category": i.category,
            "requirement_reference": i.requirement_reference,
            "original_text": i.original_text,
            "ambiguous_phrase": i.ambiguous_phrase,
            "conflict_ref_b": i.conflict_ref_b,
            "conflict_requirement_b": i.conflict_requirement_b,
            "missing_elements": i.missing_elements,
            "explanation": i.explanation,
            "evidence": i.evidence,
            "why_it_matters": i.why_it_matters,
            "suggested_improvement": i.suggested_improvement,
            "clarification_question": i.clarification_question,
            "review_status": i.review_status,
            "resolution_note": i.resolution_note,
            "created_at": i.created_at.isoformat(),
        })

    return {
        "id": analysis.id,
        "prd_id": analysis.prd_id,
        "prd_title": analysis.prd.title if analysis.prd else "PRD",
        "project_id": analysis.project_id,
        "project_name": analysis.project.name if analysis.project else "Project",
        "model_name": analysis.model_name,
        "overall_score": analysis.overall_score,
        "score_label": analysis.score_label,
        "category_scores": analysis.category_scores,
        "issue_summary": analysis.issue_summary,
        "issues": issues_out,
        "created_at": analysis.created_at.isoformat(),
    }


@router.patch("/issues/{issue_id}")
def review_issue(
    issue_id: int,
    payload: IssueReviewPatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """
    Module 8: Human-in-the-loop review.
    Accept, Edit, Reject, Mark as Needs Clarification, or Resolve a requirement issue.
    Maintains complete review history in database.
    """
    issue = db.get(RequirementIssue, issue_id)
    if not issue:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Issue not found")

    old_status = issue.review_status
    old_suggestion = issue.suggested_improvement

    issue.review_status = payload.review_status
    if payload.suggested_improvement:
        issue.suggested_improvement = payload.suggested_improvement
    if payload.resolution_note:
        issue.resolution_note = payload.resolution_note
    issue.updated_at = datetime.utcnow()

    # Record Review History
    history = RequirementReviewHistory(
        issue_id=issue.id,
        user_id=user.id,
        action=payload.review_status,
        previous_value=f"Status: {old_status} | Suggestion: {old_suggestion[:100]}",
        updated_value=f"Status: {payload.review_status} | Suggestion: {issue.suggested_improvement[:100]}",
        review_note=payload.resolution_note,
    )
    db.add(history)
    db.commit()
    db.refresh(issue)

    return {
        "success": True,
        "id": issue.id,
        "review_status": issue.review_status,
        "suggested_improvement": issue.suggested_improvement,
        "resolution_note": issue.resolution_note,
        "updated_at": issue.updated_at.isoformat(),
    }


@router.post("/analyses/{analysis_id}/apply-suggestions")
def apply_accepted_suggestions(
    analysis_id: int,
    payload: ApplySuggestionsIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """
    Module 8: Apply accepted suggestions to the PRD.
    Updates PRD content, bumps PRD version (e.g. 1.0.0 -> 1.1.0), and marks issues resolved.
    Never alters PRDs without explicit PM authorization.
    """
    analysis = db.get(RequirementAnalysis, analysis_id)
    if not analysis:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found")

    prd = db.get(PRD, analysis.prd_id)
    if not prd:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PRD not found")

    content = dict(prd.content or {})
    functional_reqs = list(content.get("functionalRequirements", []))
    non_functional = list(content.get("nonFunctionalRequirements", []))

    applied_count = 0
    for issue_id in payload.issue_ids:
        issue = db.get(RequirementIssue, issue_id)
        if not issue or issue.analysis_id != analysis.id:
            continue

        if issue.issue_type == "missing":
            # Add missing requirement
            new_id = f"FR-{len(functional_reqs) + 1:02d}"
            functional_reqs.append({
                "id": new_id,
                "title": (issue.category or "Requirement").title(),
                "description": issue.suggested_improvement,
                "priority": "P1" if issue.severity in ["Critical", "High"] else "P2",
                "complexity": "Medium",
            })
            issue.review_status = "resolved"
            issue.resolution_note = f"Added as {new_id} to PRD."
            applied_count += 1

        elif issue.issue_type in ["ambiguous", "incomplete"]:
            # Update matching requirement description
            ref = issue.requirement_reference
            updated = False
            for fr in functional_reqs:
                if fr.get("id") == ref or fr.get("title") == ref:
                    fr["description"] = issue.suggested_improvement
                    updated = True
                    break
            if not updated:
                for nfr in non_functional:
                    if nfr.get("category") == ref:
                        nfr["requirement"] = issue.suggested_improvement
                        updated = True
                        break
            issue.review_status = "resolved"
            issue.resolution_note = f"Updated description in PRD."
            applied_count += 1

        elif issue.issue_type == "conflicting":
            issue.review_status = "resolved"
            issue.resolution_note = f"Resolved conflict via suggested rule: {issue.suggested_improvement[:80]}"
            applied_count += 1

    content["functionalRequirements"] = functional_reqs
    content["nonFunctionalRequirements"] = non_functional

    # Version bump
    old_version = content.get("version", "1.0.0")
    try:
        parts = old_version.split(".")
        if len(parts) >= 2:
            parts[1] = str(int(parts[1]) + 1)
            new_version = ".".join(parts)
        else:
            new_version = f"{old_version}.1"
    except Exception:
        new_version = f"{old_version}-revised"

    content["version"] = payload.target_version or new_version
    prd.content = content
    prd.updated_at = datetime.utcnow()

    log = ActivityLog(
        project_id=prd.project_id,
        user_id=user.id,
        kind="ai",
        action="Applied AI Suggestions",
        subject=f"PRD updated to v{content['version']}",
        detail=f"Applied {applied_count} requirement improvements",
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Applied {applied_count} suggestions. PRD updated to version {content['version']}.",
        "updated_version": content["version"],
        "applied_count": applied_count,
    }


@router.get("/analyses/compare/{id_a}/{id_b}")
def compare_analyses(
    id_a: int,
    id_b: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """
    Module 9: Re-analysis and quality score comparison.
    Compares two requirement analysis runs (previous vs current) to show real measurable improvement.
    """
    analysis_a = db.get(RequirementAnalysis, id_a)
    analysis_b = db.get(RequirementAnalysis, id_b)
    if not analysis_a or not analysis_b:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "One or both analyses not found")

    # Ensure previous is older, current is newer
    if analysis_a.created_at > analysis_b.created_at:
        previous, current = analysis_b, analysis_a
    else:
        previous, current = analysis_a, analysis_b

    score_diff = current.overall_score - previous.overall_score

    # Category comparisons
    categories = ["completeness", "clarity", "testability", "feasibility", "consistency", "risk_dependencies"]
    category_diffs = {}
    prev_cats = previous.category_scores or {}
    curr_cats = current.category_scores or {}

    for cat in categories:
        prev_val = prev_cats.get(cat, {}).get("score", 0)
        curr_val = curr_cats.get(cat, {}).get("score", 0)
        category_diffs[cat] = {
            "previous_score": prev_val,
            "current_score": curr_val,
            "difference": round(curr_val - prev_val, 1),
            "max_score": curr_cats.get(cat, {}).get("max_score", 20),
        }

    return {
        "previous_analysis_id": previous.id,
        "current_analysis_id": current.id,
        "prd_id": current.prd_id,
        "previous_score": previous.overall_score,
        "current_score": current.overall_score,
        "score_improvement": score_diff,
        "previous_label": previous.score_label,
        "current_label": current.score_label,
        "category_differences": category_diffs,
        "previous_issue_count": len(previous.issues),
        "current_issue_count": len(current.issues),
        "resolved_issues_count": len([i for i in previous.issues if i.review_status == "resolved"]),
    }


# ==============================================================================
# MODULE 12: AI EVALUATION & ACCURACY BENCHMARK
# ==============================================================================

BENCHMARK_TEST_CASES = [
    {
        "id": "TC-01",
        "name": "E-Commerce Checkout (Missing Error Recovery & Payment Timeouts)",
        "defect_type": "Missing Requirements",
        "description": "Tests detection of unhandled payment gateway socket timeouts and network drops.",
        "expected_issue_types": ["missing"],
        "expected_categories": ["error_handling", "security"],
        "sample_prd": {
            "title": "One-Click Mobile Checkout",
            "problemStatement": "Users abandon checkout due to multi-step friction.",
            "functionalRequirements": [
                {"id": "FR-01", "title": "Apple Pay Integration", "description": "Integrate Apple Pay button.", "priority": "P0"},
                {"id": "FR-02", "title": "Saved Cards", "description": "Allow returning users to select saved card.", "priority": "P0"}
            ],
            "nonFunctionalRequirements": [
                {"category": "Performance", "requirement": "Fast checkout under 1 second."}
            ]
        }
    },
    {
        "id": "TC-02",
        "name": "B2B Admin Dashboard (Ambiguous Performance & Vague Experience)",
        "defect_type": "Ambiguous Requirements",
        "description": "Tests detection of non-verifiable words like 'fast', 'user-friendly', and 'full control'.",
        "expected_issue_types": ["ambiguous"],
        "expected_categories": ["clarity"],
        "sample_prd": {
            "title": "B2B Admin Control Center",
            "problemStatement": "Admin users need better oversight.",
            "functionalRequirements": [
                {"id": "FR-01", "title": "Dashboard Speed", "description": "System should be blazing fast and load quickly.", "priority": "P0"},
                {"id": "FR-02", "title": "Admin Permissions", "description": "Admin should have full control over all team data with clean UI.", "priority": "P0"}
            ]
        }
    },
    {
        "id": "TC-03",
        "name": "Fintech Onboarding (Conflicting Authentication & Guest Checkout)",
        "defect_type": "Conflicting Requirements",
        "description": "Tests detection of direct contradictions between mandatory KYC auth and instant guest access.",
        "expected_issue_types": ["conflicting"],
        "expected_categories": ["consistency"],
        "sample_prd": {
            "title": "Instant Bank Transfer",
            "problemStatement": "Friction during onboarding.",
            "functionalRequirements": [
                {"id": "FR-01", "title": "Guest Transfer", "description": "Customers can complete transactions without logging in or verifying identity.", "priority": "P0"},
                {"id": "FR-02", "title": "Mandatory KYC", "description": "All customers must complete 2-factor authentication and identity verification before initiating any transfer.", "priority": "P0"}
            ]
        }
    },
    {
        "id": "TC-04",
        "name": "Logistics Dispatch (Incomplete Requirements Missing Triggers & Validation)",
        "defect_type": "Incomplete Requirements",
        "description": "Tests detection of requirements lacking actor, trigger condition, validation, and acceptance criteria.",
        "expected_issue_types": ["incomplete"],
        "expected_categories": ["completeness"],
        "sample_prd": {
            "title": "Automated Fleet Dispatch",
            "problemStatement": "Manual dispatching causes route delays.",
            "functionalRequirements": [
                {"id": "FR-01", "title": "Route Optimization", "description": "System dispatches vehicles automatically.", "priority": "P0"}
            ]
        }
    },
    {
        "id": "TC-05",
        "name": "High-Quality Gold Standard Microservices PRD",
        "defect_type": "Clean & Complete",
        "description": "Tests false positive resistance on an already rigorous, verified PRD.",
        "expected_issue_types": [],
        "expected_categories": [],
        "sample_prd": {
            "title": "OAuth 2.1 Token Exchange Gateway",
            "problemStatement": "Legacy session cookies do not scale across third-party microservices.",
            "functionalRequirements": [
                {
                    "id": "FR-01",
                    "title": "PKCE Authorization Code Exchange",
                    "description": "Given valid client_id and code_verifier, when client posts to /token within 60s, return cryptographically signed JWT with 15-minute expiry. If expired, return HTTP 400 invalid_grant.",
                    "priority": "P0"
                }
            ],
            "nonFunctionalRequirements": [
                {"category": "Security", "requirement": "RS256 asymmetric signature with 2048-bit key rotation every 90 days."}
            ],
            "assumptionsAndRisks": [
                {"risk": "IdP latency during key verification", "impact": "Medium", "mitigation": "Cache public JWKS with 1-hour TTL."}
            ]
        }
    }
]


@router.post("/benchmark-evaluation")
async def run_benchmark_evaluation(
    payload: BenchmarkEvaluationIn,
    user: User = Depends(current_user),
    x_gemini_key: str | None = Header(None, alias="X-Gemini-Key"),
):
    """
    Module 12: AI Evaluation and Accuracy Engine.
    Executes Gemini against benchmark PRD test cases to calculate empirical
    Precision, Recall, F1 score, False Positives, and False Negatives.
    """
    api_key = get_api_key(x_gemini_key)
    if not api_key:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Gemini API key is required to run the evaluation.")

    model = payload.model_name or settings.gemini_model or "gemini-2.5-flash"
    test_results = []
    total_true_positives = 0
    total_false_positives = 0
    total_false_negatives = 0
    valid_json_count = 0

    for tc in BENCHMARK_TEST_CASES:
        prd_text = json.dumps(tc["sample_prd"], indent=2)
        gemini_body = {
            "contents": [
                {"role": "user", "parts": [{"text": f"Evaluate this PRD for requirement defects:\n\n{prd_text}"}]}
            ],
            "systemInstruction": {"parts": [{"text": REQUIREMENT_ANALYSIS_SYSTEM_PROMPT}]},
            "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"},
        }
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(endpoint, json=gemini_body)

            if resp.status_code == 200:
                data = resp.json()
                raw_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                parsed = json.loads(raw_text.strip())
                valid_json_count += 1
                latency = round((time.time() - start_time) * 1000)

                detected_types = []
                if parsed.get("missingRequirements"):
                    detected_types.append("missing")
                if parsed.get("ambiguousRequirements"):
                    detected_types.append("ambiguous")
                if parsed.get("conflictingRequirements"):
                    detected_types.append("conflicting")
                if parsed.get("incompleteRequirements"):
                    detected_types.append("incomplete")

                expected = set(tc["expected_issue_types"])
                detected = set(detected_types)

                tp = len(expected.intersection(detected))
                fp = len(detected - expected)
                fn = len(expected - detected)

                total_true_positives += tp
                total_false_positives += fp
                total_false_negatives += fn

                test_results.append({
                    "test_case_id": tc["id"],
                    "name": tc["name"],
                    "defect_type": tc["defect_type"],
                    "expected_defects": list(expected),
                    "detected_defects": list(detected),
                    "true_positives": tp,
                    "false_positives": fp,
                    "false_negatives": fn,
                    "latency_ms": latency,
                    "passed": fp == 0 and fn == 0,
                })
            else:
                test_results.append({
                    "test_case_id": tc["id"],
                    "name": tc["name"],
                    "passed": False,
                    "error": f"Status {resp.status_code}",
                })
        except Exception as e:
            test_results.append({
                "test_case_id": tc["id"],
                "name": tc["name"],
                "passed": False,
                "error": str(e),
            })

    total_predicted = total_true_positives + total_false_positives
    total_actual = total_true_positives + total_false_negatives

    precision = round((total_true_positives / total_predicted) * 100, 1) if total_predicted > 0 else 100.0
    recall = round((total_true_positives / total_actual) * 100, 1) if total_actual > 0 else 100.0
    f1 = round((2 * precision * recall) / (precision + recall), 1) if (precision + recall) > 0 else 100.0
    valid_json_rate = round((valid_json_count / len(BENCHMARK_TEST_CASES)) * 100, 1)

    return {
        "model_evaluated": model,
        "test_cases_count": len(BENCHMARK_TEST_CASES),
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "false_positive_count": total_false_positives,
        "false_negative_count": total_false_negatives,
        "valid_json_response_rate": valid_json_rate,
        "test_results": test_results,
        "evaluated_at": datetime.utcnow().isoformat(),
    }
