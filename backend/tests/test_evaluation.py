"""
Test suite for Week 4: AI Evaluation, Benchmark Lab & Placement Showcase.
Direct controller invocation against SQLite session for maximum reliability.
"""

import sys
from app.database import SessionLocal
from app.models import (
    User,
    Project,
    BenchmarkDataset,
    BenchmarkSample,
    BenchmarkExpectedOutput,
    AIEvaluationRun,
    AIEvaluationResult,
    AIErrorReview,
    ShowcasePresentation,
)
from app.routers.evaluation import (
    get_overview_metrics,
    list_benchmark_datasets,
    create_benchmark_dataset,
    list_benchmark_samples,
    get_benchmark_sample,
    update_benchmark_sample,
    review_benchmark_sample,
    list_evaluation_runs,
    get_evaluation_run_detail,
    export_run_csv,
    get_quality_analysis,
    compare_evaluation_runs,
    get_presentation,
    update_presentation,
    export_presentation,
)
from app.schemas import (
    BenchmarkDatasetCreateIn,
    BenchmarkSamplePatchIn,
    GroundTruthReviewIn,
    PresentationUpdateIn,
)


def run_tests():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        project = db.query(Project).first()
        assert user is not None, "User must exist"
        assert project is not None, "Project must exist"

        print("--- Test 1: Overview Metrics ---")
        metrics_resp = get_overview_metrics(project_id=project.id, db=db, user=user)
        assert metrics_resp["has_data"] is True, "Expected overview data"
        assert metrics_resp["total_runs"] >= 1, "Expected at least 1 run"
        assert "precision" in metrics_resp["metrics"], "Expected precision in metrics"
        assert "recall" in metrics_resp["metrics"], "Expected recall in metrics"
        assert "f1" in metrics_resp["metrics"], "Expected f1 in metrics"
        print("✓ Overview metrics returned valid calculation:", metrics_resp["metrics"]["f1"], "% F1")

        print("\n--- Test 2: Benchmark Datasets ---")
        datasets = list_benchmark_datasets(project_id=project.id, db=db, user=user)
        assert len(datasets) >= 1, "Expected at least 1 dataset"
        default_ds = datasets[0]
        print(f"✓ Dataset verified: {default_ds['name']} (Samples: {default_ds['total_samples']})")

        print("\n--- Test 3: Benchmark Samples (10 Scenarios) ---")
        samples = list_benchmark_samples(dataset_id=default_ds["id"], db=db, user=user)
        assert len(samples) >= 10, f"Expected 10 benchmark samples, got {len(samples)}"
        sample_keys = [s["sample_key"] for s in samples]
        print("✓ 10 Seed benchmark samples present:", sample_keys[:5], "...")

        # Test single sample detail
        first_sample = samples[0]
        sample_detail = get_benchmark_sample(sample_id=first_sample["id"], db=db, user=user)
        assert "expected_outputs" in sample_detail, "Expected expected_outputs in sample detail"
        print(f"✓ Sample detail verified for {first_sample['sample_key']}: {len(sample_detail['expected_outputs'])} artifact types")

        print("\n--- Test 4: Ground Truth Review Workflow ---")
        review_res = review_benchmark_sample(
            sample_id=first_sample["id"],
            payload=GroundTruthReviewIn(review_status="approved", reviewer_notes="Verified against NIST standard"),
            db=db,
            user=user,
        )
        assert review_res["review_status"] == "approved"
        print(f"✓ Ground truth review approved for {first_sample['sample_key']}")

        print("\n--- Test 5: Evaluation Runs Log & Detail ---")
        runs = list_evaluation_runs(project_id=project.id, db=db, user=user)
        assert len(runs) >= 1, "Expected at least 1 run in log"
        run_obj = runs[0]
        detail = get_evaluation_run_detail(run_id=run_obj["id"], db=db, user=user)
        assert detail["f1_score"] > 0, "Expected non-zero F1 score"
        assert len(detail["sample_results"]) >= 1, "Expected sample results in run detail"
        print(f"✓ Run detail verified for {run_obj['run_key']}: F1={detail['f1_score']}%, Samples={len(detail['sample_results'])}")

        print("\n--- Test 6: CSV Export ---")
        csv_resp = export_run_csv(run_id=run_obj["id"], db=db, user=user)
        csv_body = csv_resp.body.decode("utf-8")
        assert "Run Key" in csv_body, "CSV missing headers"
        assert run_obj["run_key"] in csv_body, "CSV missing run key data"
        print("✓ CSV export successfully streamed, bytes:", len(csv_body))

        print("\n--- Test 7: Quality Analysis & 10 Defect Vectors ---")
        qa_data = get_quality_analysis(project_id=project.id, db=db, user=user)
        assert qa_data["has_data"] is True, "Expected QA data"
        assert len(qa_data["defect_categories"]) == 10, "Expected 10 standardized defect categories"
        print("✓ 10 Defect vectors verified. Top defect:", qa_data["defect_categories"][0]["category"])

        print("\n--- Test 8: Presentation Builder (18 Slides) ---")
        pres = get_presentation(db=db, user=user)
        assert pres["slides_count"] == 18, f"Expected 18 presentation slides, got {pres['slides_count']}"
        print(f"✓ Presentation verified: {pres['title']} with {pres['slides_count']} slides")

        # Export test
        md_export = export_presentation(format="markdown", db=db, user=user)
        assert len(md_export.body) > 500, "Markdown export content too short"
        json_export = export_presentation(format="json", db=db, user=user)
        assert len(json_export.body) > 500, "JSON export content too short"
        print("✓ Presentation exported to Markdown and JSON successfully.")

        print("\n==========================================")
        print("ALL WEEK 4 EVALUATION TESTS PASSED (100%)")
        print("==========================================")

    finally:
        db.close()


if __name__ == "__main__":
    run_tests()

