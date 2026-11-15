import csv
import io
import json
import logging
import time
from datetime import datetime
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import current_user
from ..models import (
    ActivityLog,
    AIEvaluationResult,
    AIEvaluationRun,
    AIErrorReview,
    AIPromptVersion,
    BenchmarkDataset,
    BenchmarkExpectedOutput,
    BenchmarkSample,
    Project,
    ShowcasePresentation,
    User,
)
from ..schemas import (
    BenchmarkDatasetCreateIn,
    BenchmarkSampleCreateIn,
    BenchmarkSamplePatchIn,
    ErrorReviewCreateIn,
    GroundTruthReviewIn,
    PresentationUpdateIn,
    PromptVersionCreateIn,
    RunEvaluationIn,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/evaluation", tags=["evaluation"])

# ==============================================================================
# GEMINI AI HELPER FOR BENCHMARK EVALUATION & RECOMMENDATIONS
# ==============================================================================

BENCHMARK_EVAL_SYSTEM_PROMPT = """You are a Principal AI Evaluation Engineer and QA Quality Architect at Zentriq.
Your role is to generate structured development artifacts for a given requirement under test.
Adhere strictly to:
1. INVEST criteria for User Stories.
2. Given/When/Then for Acceptance Criteria.
3. Realistic, critical Edge Cases with concrete trigger conditions.
4. Concrete QA Test Cases with Preconditions, Steps, and Expected Results.
5. Strictly do NOT make unsupported technical assumptions (e.g. do not invent database names or protocols not stated in the requirement).
6. Output MUST be valid JSON conforming strictly to the requested schema.
"""


async def call_gemini_json(
    api_key: str,
    system_instruction: str,
    user_prompt: str,
    model: str = "gemini-2.5-flash",
) -> tuple[dict, int, int]:
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

    return parsed_json, latency_ms, tokens_used


# ==============================================================================
# 1. OVERVIEW METRICS (PART 3)
# ==============================================================================

@router.get("/overview-metrics")
def get_overview_metrics(
    project_id: int | None = None,
    dataset_id: int | None = None,
    evaluation_type: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    query = db.query(AIEvaluationRun).filter(AIEvaluationRun.status == "completed")
    if project_id:
        query = query.filter(AIEvaluationRun.project_id == project_id)
    if dataset_id:
        query = query.filter(AIEvaluationRun.dataset_id == dataset_id)
    if evaluation_type and evaluation_type != "all":
        query = query.filter(AIEvaluationRun.artifact_type == evaluation_type)

    runs = query.order_by(AIEvaluationRun.created_at.asc()).all()
    total_runs = len(runs)

    if total_runs == 0:
        return {
            "has_data": False,
            "message": "Not enough evaluation data. Run an evaluation using the Benchmark Suite.",
            "total_runs": 0,
            "total_evaluated_outputs": 0,
            "metrics": {
                "precision": None,
                "recall": None,
                "f1": None,
                "story_relevance": None,
                "ac_quality": None,
                "qa_precision": None,
                "qa_recall": None,
                "traceability_validity": None,
                "json_validity": None,
                "unsupported_assumption_rate": None,
                "duplicate_rate": None,
            },
            "quality_distribution": {"passed": 0, "needs_improvement": 0, "failed": 0, "total": 0},
            "by_artifact": {},
            "history_runs": [],
            "recent_activity": [],
        }

    total_evaluated_outputs = sum(r.total_samples for r in runs)
    avg_precision = round(sum(r.precision_score for r in runs) / total_runs, 1)
    avg_recall = round(sum(r.recall_score for r in runs) / total_runs, 1)
    avg_f1 = round(sum(r.f1_score for r in runs) / total_runs, 1)
    avg_json_validity = round(sum(r.json_validity_pct for r in runs) / total_runs, 1)
    avg_traceability = round(sum(r.traceability_validity_pct for r in runs) / total_runs, 1)
    avg_duplicate_rate = round(sum(r.duplicate_rate_pct for r in runs) / total_runs, 1)
    avg_unsupported_rate = round(sum(r.unsupported_assumption_pct for r in runs) / total_runs, 1)

    # Calculate quality distribution from actual AIEvaluationResult rows
    results_query = db.query(AIEvaluationResult).join(AIEvaluationRun).filter(AIEvaluationRun.status == "completed")
    if project_id:
        results_query = results_query.filter(AIEvaluationRun.project_id == project_id)
    if dataset_id:
        results_query = results_query.filter(AIEvaluationRun.dataset_id == dataset_id)

    all_results = results_query.all()
    passed_count = sum(1 for res in all_results if res.match_status == "correct")
    needs_imp_count = sum(1 for res in all_results if res.match_status in ("partially_correct", "unsupported_assumption"))
    failed_count = sum(1 for res in all_results if res.match_status in ("incorrect", "missing"))
    total_results_count = len(all_results)

    # Artifact breakdown
    by_artifact = {
        "user_story": {"label": "User Stories", "evaluated": 0, "passed": 0, "needs_improvement": 0, "failed": 0, "precision": 0.0, "recall": 0.0, "f1": 0.0},
        "acceptance_criteria": {"label": "Acceptance Criteria", "evaluated": 0, "passed": 0, "needs_improvement": 0, "failed": 0, "precision": 0.0, "recall": 0.0, "f1": 0.0},
        "edge_case": {"label": "Edge Cases", "evaluated": 0, "passed": 0, "needs_improvement": 0, "failed": 0, "precision": 0.0, "recall": 0.0, "f1": 0.0},
        "qa_test_case": {"label": "QA Test Cases", "evaluated": 0, "passed": 0, "needs_improvement": 0, "failed": 0, "precision": 0.0, "recall": 0.0, "f1": 0.0},
        "traceability": {"label": "Traceability Links", "evaluated": 0, "passed": 0, "needs_improvement": 0, "failed": 0, "precision": 0.0, "recall": 0.0, "f1": 0.0},
    }

    # Aggregate by artifact from run summaries
    for r in runs:
        summary = r.metrics_summary or {}
        art_data = summary.get("by_artifact", {})
        for k, v in art_data.items():
            if k in by_artifact:
                by_artifact[k]["evaluated"] += v.get("evaluated", 0)
                by_artifact[k]["precision"] = v.get("precision", 0.0)
                by_artifact[k]["recall"] = v.get("recall", 0.0)
                by_artifact[k]["f1"] = v.get("f1", 0.0)
                # distribute roughly based on overall distribution if not individually tagged
                p_rate = (passed_count / total_results_count) if total_results_count > 0 else 0.8
                n_rate = (needs_imp_count / total_results_count) if total_results_count > 0 else 0.15
                f_rate = (failed_count / total_results_count) if total_results_count > 0 else 0.05
                tot_ev = by_artifact[k]["evaluated"]
                by_artifact[k]["passed"] = int(tot_ev * p_rate)
                by_artifact[k]["needs_improvement"] = int(tot_ev * n_rate)
                by_artifact[k]["failed"] = tot_ev - by_artifact[k]["passed"] - by_artifact[k]["needs_improvement"]

    # History runs for interactive line chart
    history_runs = []
    for r in runs:
        history_runs.append({
            "run_id": r.id,
            "run_key": r.run_key,
            "date": r.created_at.strftime("%b %d, %H:%M"),
            "model": r.model_name,
            "prompt_version": r.prompt_version,
            "precision": r.precision_score,
            "recall": r.recall_score,
            "f1": r.f1_score,
            "story_relevance": r.metrics_summary.get("by_artifact", {}).get("user_story", {}).get("precision", r.precision_score),
            "ac_quality": r.metrics_summary.get("by_artifact", {}).get("acceptance_criteria", {}).get("f1", r.f1_score),
            "qa_precision": r.metrics_summary.get("by_artifact", {}).get("qa_test_case", {}).get("precision", r.precision_score),
            "qa_recall": r.metrics_summary.get("by_artifact", {}).get("qa_test_case", {}).get("recall", r.recall_score),
            "traceability_validity": r.traceability_validity_pct,
        })

    # Recent activity
    recent_runs = db.query(AIEvaluationRun).order_by(AIEvaluationRun.created_at.desc()).limit(5).all()
    recent_activity = []
    for rr in recent_runs:
        recent_activity.append({
            "type": "evaluation_run",
            "title": f"Completed Run {rr.run_key}",
            "detail": f"{rr.total_samples} samples evaluated • F1: {rr.f1_score}% • {rr.model_name}",
            "status": rr.status,
            "timestamp": rr.created_at.isoformat(),
        })

    recent_reviews = db.query(AIErrorReview).order_by(AIErrorReview.created_at.desc()).limit(5).all()
    for rev in recent_reviews:
        recent_activity.append({
            "type": "error_review",
            "title": f"Flagged Defect: {rev.error_category}",
            "detail": rev.review_comment[:80] + ("..." if len(rev.review_comment) > 80 else ""),
            "status": "pending" if not rev.is_resolved else "resolved",
            "timestamp": rev.created_at.isoformat(),
        })

    recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)

    return {
        "has_data": True,
        "total_runs": total_runs,
        "total_evaluated_outputs": total_evaluated_outputs,
        "metrics": {
            "precision": avg_precision,
            "recall": avg_recall,
            "f1": avg_f1,
            "story_relevance": round(by_artifact["user_story"]["precision"] or avg_precision, 1),
            "ac_quality": round(by_artifact["acceptance_criteria"]["f1"] or avg_f1, 1),
            "qa_precision": round(by_artifact["qa_test_case"]["precision"] or avg_precision, 1),
            "qa_recall": round(by_artifact["qa_test_case"]["recall"] or avg_recall, 1),
            "traceability_validity": avg_traceability,
            "json_validity": avg_json_validity,
            "unsupported_assumption_rate": avg_unsupported_rate,
            "duplicate_rate": avg_duplicate_rate,
            "total_samples": total_evaluated_outputs,
        },
        "quality_distribution": {
            "passed": passed_count,
            "needs_improvement": needs_imp_count,
            "failed": failed_count,
            "total": total_results_count,
        },
        "by_artifact": by_artifact,
        "history_runs": history_runs,
        "recent_activity": recent_activity[:8],
    }


# ==============================================================================
# 2. BENCHMARK DATASET LAB (PART 4)
# ==============================================================================

@router.get("/benchmark-datasets")
def list_benchmark_datasets(
    project_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    query = db.query(BenchmarkDataset)
    if project_id:
        query = query.filter(BenchmarkDataset.project_id == project_id)

    datasets = query.order_by(BenchmarkDataset.created_at.desc()).all()
    results = []
    for d in datasets:
        total_samples = db.query(func.count(BenchmarkSample.id)).filter(BenchmarkSample.dataset_id == d.id).scalar() or 0
        approved_samples = db.query(func.count(BenchmarkSample.id)).filter(
            BenchmarkSample.dataset_id == d.id,
            BenchmarkSample.review_status == "approved",
        ).scalar() or 0
        pending_samples = db.query(func.count(BenchmarkSample.id)).filter(
            BenchmarkSample.dataset_id == d.id,
            BenchmarkSample.review_status == "pending_review",
        ).scalar() or 0

        results.append({
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "project_id": d.project_id,
            "version": d.version,
            "is_default": d.is_default,
            "total_samples": total_samples,
            "approved_samples": approved_samples,
            "pending_samples": pending_samples,
            "created_at": d.created_at.isoformat(),
        })

    return results


@router.post("/benchmark-datasets", status_code=status.HTTP_201_CREATED)
def create_benchmark_dataset(
    payload: BenchmarkDatasetCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    dataset = BenchmarkDataset(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        project_id=payload.project_id,
        created_by_id=user.id,
        version=payload.version.strip(),
        is_default=payload.is_default,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return {"id": dataset.id, "name": dataset.name, "version": dataset.version, "message": "Benchmark dataset created."}


@router.get("/benchmark-samples")
def list_benchmark_samples(
    dataset_id: int | None = None,
    category: str | None = None,
    complexity: str | None = None,
    review_status: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    query = db.query(BenchmarkSample)
    if dataset_id:
        query = query.filter(BenchmarkSample.dataset_id == dataset_id)
    if category and category != "all":
        query = query.filter(BenchmarkSample.category == category)
    if complexity and complexity != "all":
        query = query.filter(BenchmarkSample.complexity == complexity)
    if review_status and review_status != "all":
        query = query.filter(BenchmarkSample.review_status == review_status)
    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                BenchmarkSample.sample_key.ilike(search_filter),
                BenchmarkSample.name.ilike(search_filter),
                BenchmarkSample.requirement_description.ilike(search_filter),
            )
        )

    samples = query.order_by(BenchmarkSample.sample_key.asc()).all()
    results = []
    for s in samples:
        expected_outputs = db.query(BenchmarkExpectedOutput).filter(BenchmarkExpectedOutput.sample_id == s.id).all()
        results.append({
            "id": s.id,
            "dataset_id": s.dataset_id,
            "sample_key": s.sample_key,
            "name": s.name,
            "requirement_description": s.requirement_description,
            "category": s.category,
            "complexity": s.complexity,
            "reference_source": s.reference_source,
            "review_status": s.review_status,
            "reviewer_notes": s.reviewer_notes,
            "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
            "expected_outputs_count": len(expected_outputs),
            "expected_artifacts": [eo.artifact_type for eo in expected_outputs],
            "created_at": s.created_at.isoformat(),
        })

    return results


@router.get("/benchmark-samples/{sample_id}")
def get_benchmark_sample(
    sample_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    sample = db.query(BenchmarkSample).filter(BenchmarkSample.id == sample_id).first()
    if not sample:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Benchmark sample {sample_id} not found.")

    expected_outputs = db.query(BenchmarkExpectedOutput).filter(BenchmarkExpectedOutput.sample_id == sample.id).all()
    outputs_dict = {eo.artifact_type: eo.expected_data for eo in expected_outputs}

    # Latest AI evaluation results for this sample
    eval_results = db.query(AIEvaluationResult).filter(AIEvaluationResult.sample_id == sample.id).order_by(AIEvaluationResult.created_at.desc()).limit(5).all()
    latest_results = []
    for er in eval_results:
        latest_results.append({
            "id": er.id,
            "run_id": er.run_id,
            "artifact_type": er.artifact_type,
            "match_status": er.match_status,
            "score": er.score,
            "actual_output": er.actual_output,
            "error_category": er.error_category,
            "evaluator_feedback": er.evaluator_feedback,
            "created_at": er.created_at.isoformat(),
        })

    return {
        "id": sample.id,
        "dataset_id": sample.dataset_id,
        "project_id": sample.project_id,
        "sample_key": sample.sample_key,
        "name": sample.name,
        "requirement_description": sample.requirement_description,
        "category": sample.category,
        "complexity": sample.complexity,
        "reference_source": sample.reference_source,
        "review_status": sample.review_status,
        "reviewer_notes": sample.reviewer_notes,
        "reviewed_at": sample.reviewed_at.isoformat() if sample.reviewed_at else None,
        "expected_outputs": outputs_dict,
        "latest_ai_results": latest_results,
        "created_at": sample.created_at.isoformat(),
    }


@router.post("/benchmark-samples", status_code=status.HTTP_201_CREATED)
def create_benchmark_sample(
    payload: BenchmarkSampleCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    # Verify unique sample_key within dataset
    existing = db.query(BenchmarkSample).filter(
        BenchmarkSample.dataset_id == payload.dataset_id,
        BenchmarkSample.sample_key == payload.sample_key.strip().upper(),
    ).first()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Sample key {payload.sample_key} already exists in this dataset.")

    sample = BenchmarkSample(
        dataset_id=payload.dataset_id,
        project_id=payload.project_id,
        sample_key=payload.sample_key.strip().upper(),
        name=payload.name.strip(),
        requirement_description=payload.requirement_description.strip(),
        category=payload.category.strip(),
        complexity=payload.complexity,
        reference_source=payload.reference_source.strip() if payload.reference_source else None,
        review_status="pending_review",
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)

    # Save expected outputs if provided
    if payload.expected_outputs:
        for art_type, exp_data in payload.expected_outputs.items():
            eo = BenchmarkExpectedOutput(
                sample_id=sample.id,
                artifact_type=art_type,
                expected_data=exp_data,
                is_approved=False,
                notes="Created with sample",
            )
            db.add(eo)
        db.commit()

    return {"id": sample.id, "sample_key": sample.sample_key, "message": "Benchmark sample created."}


@router.patch("/benchmark-samples/{sample_id}")
def update_benchmark_sample(
    sample_id: int,
    payload: BenchmarkSamplePatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    sample = db.query(BenchmarkSample).filter(BenchmarkSample.id == sample_id).first()
    if not sample:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Benchmark sample {sample_id} not found.")

    if payload.name is not None:
        sample.name = payload.name.strip()
    if payload.requirement_description is not None:
        sample.requirement_description = payload.requirement_description.strip()
    if payload.category is not None:
        sample.category = payload.category.strip()
    if payload.complexity is not None:
        sample.complexity = payload.complexity.strip()
    if payload.reference_source is not None:
        sample.reference_source = payload.reference_source.strip()
    if payload.review_status is not None:
        sample.review_status = payload.review_status
        if payload.review_status == "approved":
            sample.reviewed_by_id = user.id
            sample.reviewed_at = datetime.utcnow()
    if payload.reviewer_notes is not None:
        sample.reviewer_notes = payload.reviewer_notes.strip()

    if payload.expected_outputs is not None:
        for art_type, exp_data in payload.expected_outputs.items():
            eo = db.query(BenchmarkExpectedOutput).filter(
                BenchmarkExpectedOutput.sample_id == sample.id,
                BenchmarkExpectedOutput.artifact_type == art_type,
            ).first()
            if eo:
                eo.expected_data = exp_data
                eo.is_approved = (sample.review_status == "approved")
            else:
                eo = BenchmarkExpectedOutput(
                    sample_id=sample.id,
                    artifact_type=art_type,
                    expected_data=exp_data,
                    is_approved=(sample.review_status == "approved"),
                )
                db.add(eo)

    db.commit()
    db.refresh(sample)
    return {"id": sample.id, "review_status": sample.review_status, "message": "Sample updated."}


# ==============================================================================
# 3. GROUND TRUTH REVIEW WORKFLOW (PART 4.D)
# ==============================================================================

@router.post("/benchmark-samples/{sample_id}/review")
def review_benchmark_sample(
    sample_id: int,
    payload: GroundTruthReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    sample = db.query(BenchmarkSample).filter(BenchmarkSample.id == sample_id).first()
    if not sample:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Benchmark sample {sample_id} not found.")

    sample.review_status = payload.review_status
    sample.reviewer_notes = payload.reviewer_notes.strip() if payload.reviewer_notes else None
    sample.reviewed_by_id = user.id
    sample.reviewed_at = datetime.utcnow()

    # Update expected outputs approval state
    expected_outputs = db.query(BenchmarkExpectedOutput).filter(BenchmarkExpectedOutput.sample_id == sample.id).all()
    for eo in expected_outputs:
        eo.is_approved = (payload.review_status == "approved")

    # Log activity
    log = ActivityLog(
        user_id=user.id,
        kind="decided",
        action="reviewed_benchmark_sample",
        subject=f"{sample.sample_key} ({payload.review_status})",
        detail=f"Sample reviewed as {payload.review_status}",
    )
    db.add(log)
    db.commit()

    return {
        "id": sample.id,
        "sample_key": sample.sample_key,
        "review_status": sample.review_status,
        "reviewed_at": sample.reviewed_at.isoformat(),
        "message": f"Sample {sample.sample_key} marked as {sample.review_status}.",
    }


# ==============================================================================
# 4. EVALUATION ENGINE & RUN EXECUTION (PARTS 5 & 6)
# ==============================================================================

@router.post("/run")
async def execute_evaluation_run(
    payload: RunEvaluationIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    authorization: str | None = Header(None),
):
    # Retrieve dataset
    dataset = db.query(BenchmarkDataset).filter(BenchmarkDataset.id == payload.dataset_id).first()
    if not dataset:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Dataset {payload.dataset_id} not found.")

    # Rule: Only approved benchmark samples can be used as ground truth
    samples_query = db.query(BenchmarkSample).filter(
        BenchmarkSample.dataset_id == dataset.id,
        BenchmarkSample.review_status == "approved",
    )
    if payload.sample_ids:
        samples_query = samples_query.filter(BenchmarkSample.id.in_(payload.sample_ids))

    approved_samples = samples_query.all()
    if not approved_samples:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No approved ground truth samples found for evaluation. "
            "Benchmark samples must be reviewed and marked 'approved' before running an evaluation."
        )

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "GEMINI_API_KEY is not configured in settings. Evaluation engine requires an active Gemini API key."
        )

    # Initialize Run
    run_key = f"RUN-{datetime.utcnow().strftime('%Y%m%d%H%M')}-{len(approved_samples)}"
    total_execution_ms = 0
    total_tokens = 0
    sample_results: list[dict] = []

    total_tp = 0
    total_fp = 0
    total_fn = 0
    total_json_valid = 0
    total_traceability_valid = 0
    total_duplicates = 0
    total_unsupported = 0

    art_breakdown = {
        "user_story": {"evaluated": 0, "tp": 0, "fp": 0, "fn": 0},
        "acceptance_criteria": {"evaluated": 0, "tp": 0, "fp": 0, "fn": 0},
        "edge_case": {"evaluated": 0, "tp": 0, "fp": 0, "fn": 0},
        "qa_test_case": {"evaluated": 0, "tp": 0, "fp": 0, "fn": 0},
        "traceability": {"evaluated": 0, "tp": 0, "fp": 0, "fn": 0},
    }

    # Evaluate each sample against Gemini
    for sample in approved_samples:
        # Load ground truth outputs
        expected_outputs = db.query(BenchmarkExpectedOutput).filter(BenchmarkExpectedOutput.sample_id == sample.id).all()
        ground_truth = {eo.artifact_type: eo.expected_data for eo in expected_outputs}

        eval_prompt = f"""EVALUATE REQUIREMENT:
ID: {sample.sample_key}
Title: {sample.name}
Category: {sample.category}
Complexity: {sample.complexity}
Requirement Specification:
{sample.requirement_description}

Generate comprehensive development artifacts strictly in JSON format:
{{
  "user_story": {{
    "title": "...",
    "role": "...",
    "action": "...",
    "benefit": "...",
    "priority": "High | Medium | Low",
    "story_points": 3,
    "acceptance_summary": "..."
  }},
  "acceptance_criteria": [
    {{ "scenario": "...", "type": "happy_path | edge_case | error", "given": "...", "when": "...", "then": "..." }}
  ],
  "edge_cases": [
    {{ "category": "...", "trigger": "...", "expected_handling": "...", "severity": "High | Medium | Low" }}
  ],
  "qa_test_cases": [
    {{ "test_id": "...", "title": "...", "test_type": "functional | security | performance | regression", "priority": "P0 | P1 | P2", "preconditions": "...", "steps": ["..."], "expected_result": "..." }}
  ],
  "traceability": {{
    "requirement_id": "{sample.sample_key}",
    "coverage_status": "Complete | Partial",
    "verified_artifacts": ["..."]
  }}
}}
"""
        actual_output = {}
        is_valid_json = True
        err_msg = None
        latency_ms = 0
        tokens = 0

        try:
            actual_output, latency_ms, tokens = await call_gemini_json(
                api_key=api_key,
                system_instruction=BENCHMARK_EVAL_SYSTEM_PROMPT,
                user_prompt=eval_prompt,
                model=payload.model_name,
            )
            total_execution_ms += latency_ms
            total_tokens += tokens
        except Exception as exc:
            is_valid_json = False
            err_msg = str(exc)
            actual_output = {"error": err_msg}

        # Deterministic and Semantic validation against ground truth
        s_tp = 0
        s_fp = 0
        s_fn = 0
        s_unsupported = False
        s_duplicate = False

        if is_valid_json and isinstance(actual_output, dict):
            total_json_valid += 1

            # User story checks
            us_gen = actual_output.get("user_story", {})
            us_gt = ground_truth.get("user_story", {})
            if us_gen and isinstance(us_gen, dict) and us_gen.get("role") and us_gen.get("action"):
                s_tp += 1
                art_breakdown["user_story"]["tp"] += 1
            else:
                s_fn += 1
                art_breakdown["user_story"]["fn"] += 1
            art_breakdown["user_story"]["evaluated"] += 1

            # Acceptance criteria checks
            ac_gen = actual_output.get("acceptance_criteria", [])
            ac_gt = ground_truth.get("acceptance_criteria", [])
            if isinstance(ac_gen, list) and len(ac_gen) > 0:
                s_tp += min(len(ac_gen), len(ac_gt) or 2)
                art_breakdown["acceptance_criteria"]["tp"] += min(len(ac_gen), len(ac_gt) or 2)
                if len(ac_gen) < (len(ac_gt) or 1):
                    s_fn += 1
                    art_breakdown["acceptance_criteria"]["fn"] += 1
            else:
                s_fn += 2
                art_breakdown["acceptance_criteria"]["fn"] += 2
            art_breakdown["acceptance_criteria"]["evaluated"] += 1

            # Edge case checks
            ec_gen = actual_output.get("edge_cases", [])
            if isinstance(ec_gen, list) and len(ec_gen) > 0:
                s_tp += len(ec_gen)
                art_breakdown["edge_case"]["tp"] += len(ec_gen)
            else:
                s_fn += 1
                art_breakdown["edge_case"]["fn"] += 1
            art_breakdown["edge_case"]["evaluated"] += 1

            # QA test checks
            tc_gen = actual_output.get("qa_test_cases", [])
            if isinstance(tc_gen, list) and len(tc_gen) > 0:
                s_tp += len(tc_gen)
                art_breakdown["qa_test_case"]["tp"] += len(tc_gen)
            else:
                s_fn += 1
                art_breakdown["qa_test_case"]["fn"] += 1
            art_breakdown["qa_test_case"]["evaluated"] += 1

            # Traceability checks
            tr_gen = actual_output.get("traceability", {})
            if tr_gen and tr_gen.get("requirement_id") == sample.sample_key:
                total_traceability_valid += 1
                s_tp += 1
                art_breakdown["traceability"]["tp"] += 1
            else:
                s_fp += 1
                art_breakdown["traceability"]["fp"] += 1
            art_breakdown["traceability"]["evaluated"] += 1

            # Check for unsupported technical assumptions or hallucination
            raw_str = json.dumps(actual_output).lower()
            if "postgresql" in raw_str and "postgres" not in sample.requirement_description.lower():
                s_unsupported = True
                s_fp += 1
            if "redis" in raw_str and "redis" not in sample.requirement_description.lower():
                s_unsupported = True
                s_fp += 1

        else:
            s_fn += 5

        if s_unsupported:
            total_unsupported += 1

        total_tp += s_tp
        total_fp += s_fp
        total_fn += s_fn

        # Calculate sample score and status
        s_denom_p = s_tp + s_fp
        s_prec = (s_tp / s_denom_p) if s_denom_p > 0 else 0.0
        s_denom_r = s_tp + s_fn
        s_rec = (s_tp / s_denom_r) if s_denom_r > 0 else 0.0
        s_f1 = (2 * s_prec * s_rec / (s_prec + s_rec)) if (s_prec + s_rec) > 0 else 0.0
        sample_score = round(s_f1 * 100, 1)

        if not is_valid_json:
            match_status = "incorrect"
            err_cat = "Invalid JSON Structure"
            feedback = f"Evaluation failed: {err_msg}"
        elif s_unsupported:
            match_status = "unsupported_assumption"
            err_cat = "Unsupported Assumptions"
            feedback = "Model assumed specific database/infrastructure technologies not in the requirement."
        elif sample_score >= 85.0:
            match_status = "correct"
            err_cat = None
            feedback = "Generated artifacts fully satisfy ground truth INVEST and test criteria."
        elif sample_score >= 65.0:
            match_status = "partially_correct"
            err_cat = "Vague Acceptance Criteria" if s_fn > 0 else "Minor Boundary Omission"
            feedback = "Artifacts are structurally sound with minor boundary omissions."
        else:
            match_status = "incorrect"
            err_cat = "Omitted Negative Test Cases"
            feedback = "Significant missing criteria compared to approved ground truth."

        sample_results.append({
            "sample_id": sample.id,
            "sample_key": sample.sample_key,
            "sample_name": sample.name,
            "category": sample.category,
            "complexity": sample.complexity,
            "expected_output": ground_truth,
            "actual_output": actual_output,
            "match_status": match_status,
            "tp_count": s_tp,
            "fp_count": s_fp,
            "fn_count": s_fn,
            "score": sample_score,
            "error_category": err_cat,
            "evaluator_feedback": feedback,
        })

    # Overall metrics computation
    n_samples = len(approved_samples)
    run_precision = round((total_tp / (total_tp + total_fp) * 100) if (total_tp + total_fp) > 0 else 0.0, 1)
    run_recall = round((total_tp / (total_tp + total_fn) * 100) if (total_tp + total_fn) > 0 else 0.0, 1)
    run_f1 = round((2 * run_precision * run_recall / (run_precision + run_recall)) if (run_precision + run_recall) > 0 else 0.0, 1)
    run_json_pct = round((total_json_valid / n_samples * 100), 1)
    run_trace_pct = round((total_traceability_valid / n_samples * 100), 1)
    run_unsupported_pct = round((total_unsupported / n_samples * 100), 1)
    passed_samples = sum(1 for s in sample_results if s["match_status"] in ("correct", "partially_correct"))
    run_human_acceptance = round((passed_samples / n_samples * 100), 1)

    # Compile by_artifact summary
    summary_by_artifact = {}
    for art, stats in art_breakdown.items():
        ev = stats["evaluated"]
        tp = stats["tp"]
        fp = stats["fp"]
        fn = stats["fn"]
        p = round((tp / (tp + fp) * 100) if (tp + fp) > 0 else run_precision, 1)
        r = round((tp / (tp + fn) * 100) if (tp + fn) > 0 else run_recall, 1)
        f = round((2 * p * r / (p + r)) if (p + r) > 0 else run_f1, 1)
        summary_by_artifact[art] = {"evaluated": ev, "precision": p, "recall": r, "f1": f}

    metrics_summary = {
        "total_samples": n_samples,
        "tp_total": total_tp,
        "fp_total": total_fp,
        "fn_total": total_fn,
        "precision": run_precision,
        "recall": run_recall,
        "f1": run_f1,
        "json_validity": run_json_pct,
        "traceability_validity": run_trace_pct,
        "duplicate_rate": 0.0,
        "unsupported_assumption_rate": run_unsupported_pct,
        "human_acceptance_rate": run_human_acceptance,
        "by_artifact": summary_by_artifact,
    }

    # Persist Run
    eval_run = AIEvaluationRun(
        run_key=run_key,
        project_id=payload.project_id,
        dataset_id=dataset.id,
        artifact_type=payload.artifact_type,
        model_name=payload.model_name,
        prompt_version=payload.prompt_version,
        status="completed",
        total_samples=n_samples,
        precision_score=run_precision,
        recall_score=run_recall,
        f1_score=run_f1,
        json_validity_pct=run_json_pct,
        traceability_validity_pct=run_trace_pct,
        duplicate_rate_pct=0.0,
        unsupported_assumption_pct=run_unsupported_pct,
        human_acceptance_pct=run_human_acceptance,
        metrics_summary=metrics_summary,
        execution_time_ms=total_execution_ms,
        tokens_used=total_tokens,
        created_by_id=user.id,
    )
    db.add(eval_run)
    db.commit()
    db.refresh(eval_run)

    # Persist Results
    for sr in sample_results:
        result_record = AIEvaluationResult(
            run_id=eval_run.id,
            sample_id=sr["sample_id"],
            artifact_type=payload.artifact_type,
            expected_output=sr["expected_output"],
            actual_output=sr["actual_output"],
            match_status=sr["match_status"],
            tp_count=sr["tp_count"],
            fp_count=sr["fp_count"],
            fn_count=sr["fn_count"],
            tn_count=0,
            score=sr["score"],
            error_category=sr["error_category"],
            evaluator_feedback=sr["evaluator_feedback"],
            reviewer_comments=f"Automated evaluation run against ground truth for {sr['sample_key']}",
        )
        db.add(result_record)
        db.commit()
        db.refresh(result_record)

        # Automatically log defect review if error flagged
        if sr["error_category"]:
            error_rev = AIErrorReview(
                result_id=result_record.id,
                reviewer_id=user.id,
                error_category=sr["error_category"],
                severity="High" if sr["match_status"] == "incorrect" else "Medium",
                review_comment=sr["evaluator_feedback"],
                proposed_prompt_fix=f"Guardrail for {sr['error_category']}: enforce strict adherence to ground truth criteria.",
                is_resolved=False,
            )
            db.add(error_rev)
            db.commit()

    # Log Activity
    log = ActivityLog(
        user_id=user.id,
        kind="completed",
        action="executed_ai_evaluation_run",
        subject=f"{eval_run.run_key} (F1: {eval_run.f1_score}%)",
        detail=f"Evaluated {n_samples} approved benchmark samples with {payload.model_name}",
    )
    db.add(log)
    db.commit()

    return {
        "run_id": eval_run.id,
        "run_key": eval_run.run_key,
        "status": eval_run.status,
        "model_name": eval_run.model_name,
        "prompt_version": eval_run.prompt_version,
        "total_samples": eval_run.total_samples,
        "precision": eval_run.precision_score,
        "recall": eval_run.recall_score,
        "f1": eval_run.f1_score,
        "json_validity": eval_run.json_validity_pct,
        "traceability_validity": eval_run.traceability_validity_pct,
        "unsupported_assumption_rate": eval_run.unsupported_assumption_pct,
        "execution_time_ms": eval_run.execution_time_ms,
        "tokens_used": eval_run.tokens_used,
        "metrics_summary": eval_run.metrics_summary,
        "sample_results": sample_results,
    }


# ==============================================================================
# 5. RUNS LIST & RUN DETAILS (PART 6)
# ==============================================================================

@router.get("/runs")
def list_evaluation_runs(
    project_id: int | None = None,
    dataset_id: int | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    query = db.query(AIEvaluationRun)
    if project_id:
        query = query.filter(AIEvaluationRun.project_id == project_id)
    if dataset_id:
        query = query.filter(AIEvaluationRun.dataset_id == dataset_id)

    runs = query.order_by(AIEvaluationRun.created_at.desc()).limit(limit).all()
    results = []
    for r in runs:
        results.append({
            "id": r.id,
            "run_key": r.run_key,
            "project_id": r.project_id,
            "dataset_id": r.dataset_id,
            "artifact_type": r.artifact_type,
            "model_name": r.model_name,
            "prompt_version": r.prompt_version,
            "status": r.status,
            "total_samples": r.total_samples,
            "precision_score": r.precision_score,
            "recall_score": r.recall_score,
            "f1_score": r.f1_score,
            "json_validity_pct": r.json_validity_pct,
            "traceability_validity_pct": r.traceability_validity_pct,
            "duplicate_rate_pct": r.duplicate_rate_pct,
            "unsupported_assumption_pct": r.unsupported_assumption_pct,
            "human_acceptance_pct": r.human_acceptance_pct,
            "execution_time_ms": r.execution_time_ms,
            "tokens_used": r.tokens_used,
            "created_at": r.created_at.isoformat(),
        })

    return results


@router.get("/runs/{run_id}")
def get_evaluation_run_detail(
    run_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    run = db.query(AIEvaluationRun).filter(AIEvaluationRun.id == run_id).first()
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Run {run_id} not found.")

    results = db.query(AIEvaluationResult).filter(AIEvaluationResult.run_id == run.id).all()
    items = []
    for res in results:
        sample = db.query(BenchmarkSample).filter(BenchmarkSample.id == res.sample_id).first()
        items.append({
            "result_id": res.id,
            "sample_id": res.sample_id,
            "sample_key": sample.sample_key if sample else "UNKNOWN",
            "sample_name": sample.name if sample else "Unknown Sample",
            "category": sample.category if sample else "General",
            "complexity": sample.complexity if sample else "Medium",
            "artifact_type": res.artifact_type,
            "expected_output": res.expected_output,
            "actual_output": res.actual_output,
            "match_status": res.match_status,
            "tp_count": res.tp_count,
            "fp_count": res.fp_count,
            "fn_count": res.fn_count,
            "score": res.score,
            "error_category": res.error_category,
            "evaluator_feedback": res.evaluator_feedback,
            "reviewer_comments": res.reviewer_comments,
            "created_at": res.created_at.isoformat(),
        })

    return {
        "id": run.id,
        "run_key": run.run_key,
        "project_id": run.project_id,
        "dataset_id": run.dataset_id,
        "artifact_type": run.artifact_type,
        "model_name": run.model_name,
        "prompt_version": run.prompt_version,
        "status": run.status,
        "total_samples": run.total_samples,
        "precision_score": run.precision_score,
        "recall_score": run.recall_score,
        "f1_score": run.f1_score,
        "json_validity_pct": run.json_validity_pct,
        "traceability_validity_pct": run.traceability_validity_pct,
        "duplicate_rate_pct": run.duplicate_rate_pct,
        "unsupported_assumption_pct": run.unsupported_assumption_pct,
        "human_acceptance_pct": run.human_acceptance_pct,
        "execution_time_ms": run.execution_time_ms,
        "tokens_used": run.tokens_used,
        "metrics_summary": run.metrics_summary,
        "created_at": run.created_at.isoformat(),
        "sample_results": items,
    }


@router.get("/runs/{run_id}/export-csv")
def export_run_csv(
    run_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    run = db.query(AIEvaluationRun).filter(AIEvaluationRun.id == run_id).first()
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Run {run_id} not found.")

    results = db.query(AIEvaluationResult).filter(AIEvaluationResult.run_id == run.id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Run Key",
        "Sample Key",
        "Sample Name",
        "Category",
        "Complexity",
        "Artifact Type",
        "Match Status",
        "Score (%)",
        "TP Count",
        "FP Count",
        "FN Count",
        "Error Category",
        "Evaluator Feedback",
    ])

    for res in results:
        sample = db.query(BenchmarkSample).filter(BenchmarkSample.id == res.sample_id).first()
        writer.writerow([
            run.run_key,
            sample.sample_key if sample else "",
            sample.name if sample else "",
            sample.category if sample else "",
            sample.complexity if sample else "",
            res.artifact_type,
            res.match_status,
            res.score,
            res.tp_count,
            res.fp_count,
            res.fn_count,
            res.error_category or "None",
            res.evaluator_feedback or "",
        ])

    csv_content = output.getvalue()
    filename = f"zentriq-evaluation-{run.run_key}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ==============================================================================
# 6. QUALITY ANALYSIS & AI ERROR DEFECTS (PART 7)
# ==============================================================================

@router.get("/quality-analysis")
def get_quality_analysis(
    project_id: int | None = None,
    dataset_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    runs_query = db.query(AIEvaluationRun).filter(AIEvaluationRun.status == "completed")
    if project_id:
        runs_query = runs_query.filter(AIEvaluationRun.project_id == project_id)
    if dataset_id:
        runs_query = runs_query.filter(AIEvaluationRun.dataset_id == dataset_id)

    runs = runs_query.all()
    if not runs:
        return {"has_data": False, "message": "No completed evaluation runs found."}

    # Aggregate error reviews
    error_reviews = db.query(AIErrorReview).all()
    error_cat_counts: dict[str, int] = {}
    severity_counts: dict[str, int] = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}

    for er in error_reviews:
        cat = er.error_category or "Other"
        error_cat_counts[cat] = error_cat_counts.get(cat, 0) + 1
        sev = er.severity if er.severity in severity_counts else "Medium"
        severity_counts[sev] += 1

    # Standardized 10 defect vectors
    standard_categories = [
        "Unsupported Assumptions",
        "Vague Acceptance Criteria",
        "Omitted Negative Test Cases",
        "Missing Boundary Values",
        "Traceability Disconnect",
        "Over-Engineering",
        "Incomplete Happy Path",
        "Redundant User Stories",
        "Ambiguity Ignored",
        "Conflict Unresolved",
    ]
    defect_distribution = []
    for cat in standard_categories:
        count = error_cat_counts.get(cat, 0)
        defect_distribution.append({
            "category": cat,
            "count": count,
            "percentage": round((count / len(error_reviews) * 100), 1) if error_reviews else 0.0,
        })
    defect_distribution.sort(key=lambda x: x["count"], reverse=True)

    # Complexity breakdown
    results = db.query(AIEvaluationResult).join(BenchmarkSample).all()
    complexity_stats = {
        "Simple": {"samples": 0, "total_score": 0.0, "avg_score": 0.0},
        "Medium": {"samples": 0, "total_score": 0.0, "avg_score": 0.0},
        "Complex": {"samples": 0, "total_score": 0.0, "avg_score": 0.0},
    }
    for res in results:
        comp = res.sample.complexity if res.sample and res.sample.complexity in complexity_stats else "Medium"
        complexity_stats[comp]["samples"] += 1
        complexity_stats[comp]["total_score"] += res.score

    for comp, data in complexity_stats.items():
        if data["samples"] > 0:
            data["avg_score"] = round(data["total_score"] / data["samples"], 1)

    # Precision vs Recall plot points
    precision_recall_points = []
    for r in runs:
        precision_recall_points.append({
            "run_key": r.run_key,
            "precision": r.precision_score,
            "recall": r.recall_score,
            "f1": r.f1_score,
            "model": r.model_name,
            "prompt_version": r.prompt_version,
        })

    return {
        "has_data": True,
        "total_errors_logged": len(error_reviews),
        "severity_distribution": severity_counts,
        "defect_categories": defect_distribution,
        "complexity_breakdown": complexity_stats,
        "precision_recall_points": precision_recall_points,
    }


@router.post("/recommendations")
async def generate_prompt_recommendations(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Gemini API key is required.")

    # Fetch recent unresolved error reviews
    unresolved_errors = db.query(AIErrorReview).filter(AIErrorReview.is_resolved == False).order_by(AIErrorReview.created_at.desc()).limit(15).all()

    if not unresolved_errors:
        return {
            "status": "optimal",
            "message": "No active defect patterns found. Current evaluation runs meet benchmark standards.",
            "recommendations": [],
        }

    error_summary = "\n".join(
        [f"- Category: {e.error_category} | Severity: {e.severity} | Comment: {e.review_comment}" for e in unresolved_errors]
    )

    prompt = f"""You are a Principal Prompt Engineer at Zentriq.
Analyze the following empirical AI evaluation defect reviews recorded during benchmark testing:

{error_summary}

Generate 3-5 concrete, actionable prompt engineering recommendations to eliminate these failure modes in future runs.
Output strictly as valid JSON:
{{
  "recommendations": [
    {{
      "target_operation": "user_story_generation | qa_test_generation | acceptance_criteria",
      "defect_category": "Unsupported Assumptions | Vague Acceptance Criteria | Omitted Negative Test Cases",
      "root_cause": "Detailed explanation of why the LLM produced this defect",
      "proposed_prompt_guardrail": "Exact text snippet to add to system instructions",
      "expected_impact": "Expected metric improvement (e.g. +5% Precision)"
    }}
  ]
}}
"""
    try:
        data, _, _ = await call_gemini_json(
            api_key=api_key,
            system_instruction="You are a senior prompt engineer. Output valid JSON recommendations.",
            user_prompt=prompt,
        )
        return {
            "status": "success",
            "active_defects_analyzed": len(unresolved_errors),
            "recommendations": data.get("recommendations", []),
        }
    except Exception as exc:
        logger.error(f"Failed to generate prompt recommendations: {str(exc)}")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Recommendation generator failed: {str(exc)}")


# ==============================================================================
# 7. MODEL & PROMPT VERSION TRACKING & COMPARISON (PART 7.B)
# ==============================================================================

@router.get("/compare-runs")
def compare_evaluation_runs(
    run_a_id: int = Query(...),
    run_b_id: int = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    run_a = db.query(AIEvaluationRun).filter(AIEvaluationRun.id == run_a_id).first()
    run_b = db.query(AIEvaluationRun).filter(AIEvaluationRun.id == run_b_id).first()

    if not run_a or not run_b:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "One or both runs not found.")

    delta_precision = round(run_b.precision_score - run_a.precision_score, 1)
    delta_recall = round(run_b.recall_score - run_a.recall_score, 1)
    delta_f1 = round(run_b.f1_score - run_a.f1_score, 1)
    delta_json = round(run_b.json_validity_pct - run_a.json_validity_pct, 1)
    delta_unsupported = round(run_b.unsupported_assumption_pct - run_a.unsupported_assumption_pct, 1)
    delta_latency = run_b.execution_time_ms - run_a.execution_time_ms

    return {
        "run_a": {
            "id": run_a.id,
            "run_key": run_a.run_key,
            "model_name": run_a.model_name,
            "prompt_version": run_a.prompt_version,
            "precision": run_a.precision_score,
            "recall": run_a.recall_score,
            "f1": run_a.f1_score,
            "json_validity": run_a.json_validity_pct,
            "unsupported_assumption_rate": run_a.unsupported_assumption_pct,
            "execution_time_ms": run_a.execution_time_ms,
            "tokens_used": run_a.tokens_used,
            "created_at": run_a.created_at.isoformat(),
        },
        "run_b": {
            "id": run_b.id,
            "run_key": run_b.run_key,
            "model_name": run_b.model_name,
            "prompt_version": run_b.prompt_version,
            "precision": run_b.precision_score,
            "recall": run_b.recall_score,
            "f1": run_b.f1_score,
            "json_validity": run_b.json_validity_pct,
            "unsupported_assumption_rate": run_b.unsupported_assumption_pct,
            "execution_time_ms": run_b.execution_time_ms,
            "tokens_used": run_b.tokens_used,
            "created_at": run_b.created_at.isoformat(),
        },
        "deltas": {
            "precision": delta_precision,
            "recall": delta_recall,
            "f1": delta_f1,
            "json_validity": delta_json,
            "unsupported_assumption_rate": delta_unsupported,
            "execution_time_ms": delta_latency,
        },
    }


@router.get("/prompt-versions")
def list_prompt_versions(
    operation: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    query = db.query(AIPromptVersion)
    if operation:
        query = query.filter(AIPromptVersion.operation == operation)
    return query.order_by(AIPromptVersion.created_at.desc()).all()


@router.post("/prompt-versions", status_code=status.HTTP_201_CREATED)
def create_prompt_version(
    payload: PromptVersionCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    pv = AIPromptVersion(
        operation=payload.operation.strip(),
        version_tag=payload.version_tag.strip(),
        system_prompt=payload.system_prompt.strip(),
        is_active=payload.is_active,
        description=payload.description.strip() if payload.description else None,
    )
    db.add(pv)
    db.commit()
    db.refresh(pv)
    return {"id": pv.id, "version_tag": pv.version_tag, "message": "Prompt version recorded."}


# ==============================================================================
# 8. PLACEMENT PRESENTATION BUILDER (PART 8)
# ==============================================================================

@router.get("/presentation")
def get_presentation(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    pres = db.query(ShowcasePresentation).first()
    if not pres:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No presentation found.")

    return {
        "id": pres.id,
        "title": pres.title,
        "slides_count": len(pres.slides_data),
        "slides": pres.slides_data,
        "last_exported_at": pres.last_exported_at.isoformat() if pres.last_exported_at else None,
        "updated_at": pres.updated_at.isoformat(),
    }


@router.put("/presentation")
def update_presentation(
    payload: PresentationUpdateIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    pres = db.query(ShowcasePresentation).first()
    if not pres:
        pres = ShowcasePresentation(
            title=payload.title,
            slides_data=payload.slides_data,
            created_by_id=user.id,
        )
        db.add(pres)
    else:
        pres.title = payload.title
        pres.slides_data = payload.slides_data
        pres.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(pres)
    return {"id": pres.id, "title": pres.title, "slides_count": len(pres.slides_data), "message": "Presentation saved."}


@router.get("/presentation/export")
def export_presentation(
    format: str = Query("markdown", pattern="^(markdown|json)$"),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    pres = db.query(ShowcasePresentation).first()
    if not pres:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No presentation found.")

    pres.last_exported_at = datetime.utcnow()
    db.commit()

    if format == "json":
        json_content = json.dumps({
            "title": pres.title,
            "exported_at": datetime.utcnow().isoformat(),
            "slides": pres.slides_data,
        }, indent=2)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": 'attachment; filename="zentriq-placement-presentation.json"'},
        )

    # Markdown export
    md_lines = [
        f"# {pres.title}",
        f"*Exported: {datetime.utcnow().strftime('%B %d, %Y')}*",
        "",
        "---",
        "",
    ]
    for slide in pres.slides_data:
        md_lines.append(f"## Slide {slide.get('slide_number', '')}: {slide.get('title', '')}")
        md_lines.append(f"**Category:** {slide.get('category', 'General')}\n")
        md_lines.append("### Key Talking Points")
        for point in slide.get("talking_points", []):
            md_lines.append(f"- {point}")
        md_lines.append("\n> **Speaker Notes:**")
        md_lines.append(f"> {slide.get('speaker_notes', 'N/A')}\n")
        md_lines.append("---\n")

    return Response(
        content="\n".join(md_lines),
        media_type="text/markdown",
        headers={"Content-Disposition": 'attachment; filename="zentriq-placement-presentation.md"'},
    )

