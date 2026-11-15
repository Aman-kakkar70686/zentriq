import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import Base, engine, SessionLocal
from app.models import User, Project, PRD, UserStory, AcceptanceCriterion, EdgeCase, QATestCase, Task
from app.security import hash_password
from app.routers import stories_qa
from app.schemas import UserStoryPatchIn, BulkCriteriaReviewIn, QATestCasePatchIn

def test_direct():
    print("1. Initializing DB schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    user = db.query(User).filter(User.email == "aman@zentriq.dev").first()
    if not user:
        user = User(name="Aman", email="aman@zentriq.dev", password_hash=hash_password("zentriq123"))
        db.add(user)
        db.commit()
        db.refresh(user)

    proj = db.query(Project).first()
    if not proj:
        proj = Project(name="E-Commerce Platform", owner_id=user.id)
        db.add(proj)
        db.commit()
        db.refresh(proj)

    prd = db.query(PRD).first()
    if not prd:
        prd = PRD(
            project_id=proj.id,
            user_id=user.id,
            title="Digital Wallet Integration",
            feature_name="Apple Pay & Google Pay",
            problem_statement="High checkout friction",
            content={"version": "1.0.0", "functionalRequirements": [{"id": "FR-01", "title": "Apple Pay", "priority": "P0"}]}
        )
        db.add(prd)
        db.commit()
        db.refresh(prd)

    print("2. Testing User Story creation...")
    story = UserStory(
        story_key="US-DIR-01",
        project_id=proj.id,
        prd_id=prd.id,
        requirement_id="FR-01",
        title="Biometric Checkout",
        user_role="mobile shopper",
        functionality="pay in 1 tap with Face ID",
        business_benefit="avoid entering credit card manually",
        user_story_text="As a mobile shopper, I want to pay in 1 tap with Face ID, So that I avoid entering credit card manually.",
        business_value="High",
        priority="P0",
        review_status="approved",
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    print(f"✓ Created UserStory #{story.id} ({story.story_key})")

    print("3. Testing convert_story_to_task...")
    res = stories_qa.convert_story_to_task(story_id=story.id, db=db, user=user)
    assert res["success"] is True
    print(f"✓ Successfully converted to Task #{res['task_id']}")

    print("4. Testing Acceptance Criteria & Bulk Review...")
    crit = AcceptanceCriterion(
        criteria_key="AC-DIR-01",
        story_id=story.id,
        project_id=proj.id,
        prd_id=prd.id,
        requirement_id="FR-01",
        title="Valid Apple Pay Token Processing",
        scenario_type="happy_path",
        given_text="Given customer has Apple Pay with loaded cards",
        when_text="When customer scans Face ID",
        then_text="Then authorization completes in < 1.5s",
        review_status="pending",
    )
    db.add(crit)
    db.commit()
    db.refresh(crit)

    bulk_res = stories_qa.bulk_review_acceptance_criteria(
        payload=BulkCriteriaReviewIn(criteria_ids=[crit.id], review_status="approved", review_notes="LGTM"),
        db=db,
        user=user,
    )
    assert bulk_res["updated_count"] == 1
    print("✓ Bulk review criteria passed")

    print("5. Testing Edge Case & QA Test Case with Manual Execution...")
    ec = EdgeCase(
        edge_case_key="EC-DIR-01",
        story_id=story.id,
        project_id=proj.id,
        prd_id=prd.id,
        requirement_id="FR-01",
        category="duplicate_submissions",
        scenario="Double tap payment button",
        trigger_condition="2 POST requests in 100ms",
        expected_behaviour="Idempotency lock halts duplicate",
        severity="Critical",
        review_status="approved",
    )
    db.add(ec)

    tc = QATestCase(
        test_case_key="TC-DIR-01",
        title="Verify concurrent payment idempotency",
        category="boundary",
        project_id=proj.id,
        prd_id=prd.id,
        requirement_id="FR-01",
        story_id=story.id,
        acceptance_criteria_id=crit.id,
        preconditions="Active cart total $50",
        test_steps=["1. Dispatch rapid payments", "2. Verify ledger"],
        expected_result="1 charge recorded, duplicate rejected",
        priority="P0",
        risk_level="Critical",
        review_status="approved",
        execution_status="not_run",
    )
    db.add(tc)
    db.commit()
    db.refresh(tc)

    # Manual execution log update
    tc_res = stories_qa.update_qa_test_case(
        test_id=tc.id,
        payload=QATestCasePatchIn(
            execution_status="passed",
            actual_result="Verified single charge in sandbox PSP",
            execution_notes="Passed on test run #402",
        ),
        db=db,
        user=user,
    )
    assert tc_res["test_case"].execution_status == "passed"
    print("✓ Manual QA execution status updated to passed")

    print("6. Testing Traceability Matrix & Overview Metrics...")
    metrics = stories_qa.get_overview_metrics(project_id=proj.id, prd_id=prd.id, db=db, _=user)
    assert metrics["metrics"]["total_user_stories"] >= 1
    assert metrics["metrics"]["total_acceptance_criteria"] >= 1
    assert metrics["metrics"]["total_qa_test_cases"] >= 1
    assert metrics["metrics"]["passed_tests"] >= 1
    print("✓ Overview metrics verified:", metrics["metrics"])

    matrix = stories_qa.get_traceability_matrix(project_id=proj.id, prd_id=prd.id, db=db, _=user)
    assert matrix["summary"]["total_requirements"] >= 1
    print("✓ Traceability matrix verified. Coverage:", matrix["summary"]["coverage_rate_pct"], "%")

    print("7. Testing CSV Export...")
    csv_resp = stories_qa.export_test_cases_csv(project_id=proj.id, prd_id=prd.id, db=db, _=user)
    csv_content = csv_resp.body.decode() if isinstance(csv_resp.body, bytes) else str(csv_resp.body)
    assert "TC-DIR-01" in csv_content
    assert "Test ID,Title,Category" in csv_content
    print("✓ CSV export successfully generated and validated")

    db.close()
    print("\nALL BACKEND ROUTINES AND DATABASE TRANSACTIONS VERIFIED 100% SUCCEEDED! ✓")

if __name__ == "__main__":
    test_direct()
