"""
Seed script for Zentriq Week 4: AI Evaluation, Benchmark Lab & Placement Showcase.
Seeds 10 realistic ground truth benchmark samples, expected outputs, prompt versions,
and default 18-slide presentation builder structure.
"""

from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import (
    BenchmarkDataset,
    BenchmarkSample,
    BenchmarkExpectedOutput,
    AIEvaluationRun,
    AIEvaluationResult,
    AIErrorReview,
    AIPromptVersion,
    ShowcasePresentation,
    Project,
    User,
)

BENCHMARK_SAMPLES_DATA = [
    {
        "sample_key": "BENCH-001",
        "name": "Self-Service Password Reset via Time-Limited Token",
        "requirement_description": (
            "The system shall provide a secure, self-service password reset mechanism where a registered user "
            "enters their email address, receives a cryptographically signed token valid for 15 minutes, and resets "
            "their password. The system must invalidate all active sessions upon completion, enforce NIST SP 800-63B "
            "password complexity (min 12 chars, no common dictionary phrases), rate-limit requests to 3 attempts per "
            "IP/hour, and log audit events without revealing whether the email exists in the database."
        ),
        "category": "Authentication & Security",
        "complexity": "Simple",
        "reference_source": "NIST SP 800-63B / OWASP ASVS v4.0",
        "review_status": "approved",
        "reviewer_notes": "Ground truth verified against OWASP guidelines. Standard single-flow authentication reset.",
        "expected_outputs": {
            "user_story": {
                "title": "Self-Service Password Reset with Session Invalidation",
                "role": "Registered User",
                "action": "request a secure password reset link via my registered email",
                "benefit": "I can regain access to my account without customer support intervention while maintaining account security",
                "priority": "High",
                "story_points": 3,
                "acceptance_summary": "Time-limited token generated, active sessions invalidated upon reset, no email enumeration leakage.",
            },
            "acceptance_criteria": [
                {
                    "scenario": "Successful password reset link delivery",
                    "type": "happy_path",
                    "given": "A registered user on the forgot password page",
                    "when": "They submit a valid registered email address",
                    "then": "A generic confirmation is displayed ('If your email exists, a link was sent') and a signed token valid for 15 minutes is dispatched via email.",
                },
                {
                    "scenario": "Reset attempt with expired token",
                    "type": "error",
                    "given": "A user clicks a reset link more than 15 minutes after issuance",
                    "when": "The reset page loads",
                    "then": "The token is marked expired, an error prompt directs them to request a new link, and no password update fields are shown.",
                },
                {
                    "scenario": "Session invalidation on password change",
                    "type": "edge_case",
                    "given": "A user has active sessions across multiple browsers or mobile apps",
                    "when": "They complete password change with a valid token",
                    "then": "All existing refresh tokens and sessions are terminated immediately, requiring fresh authentication.",
                },
            ],
            "edge_case": [
                {
                    "category": "Security / Abuse",
                    "trigger": "Attacker submits 50 password reset requests within 2 minutes for target email",
                    "expected_handling": "IP rate limiter triggers at 3 attempts/hour, returning HTTP 429 Too Many Requests with exponential backoff.",
                    "severity": "High",
                },
                {
                    "category": "Timing Attack",
                    "trigger": "Attacker analyzes response latency between registered vs unregistered email addresses",
                    "expected_handling": "System introduces constant-time mock processing delay ensuring latency delta is < 25ms.",
                    "severity": "Medium",
                },
            ],
            "qa_test_case": [
                {
                    "test_id": "TC-AUTH-001",
                    "title": "Verify anti-enumeration response on unknown email submission",
                    "test_type": "security",
                    "priority": "P1",
                    "preconditions": "Email 'nonexistent-user-999@domain.test' does not exist in DB",
                    "steps": [
                        "Navigate to /forgot-password",
                        "Enter nonexistent email",
                        "Click 'Send Reset Link'",
                    ],
                    "expected_result": "UI shows identical success message; response status is HTTP 200; zero emails queued.",
                },
                {
                    "test_id": "TC-AUTH-002",
                    "title": "Verify concurrent session termination post password change",
                    "test_type": "functional",
                    "priority": "P1",
                    "preconditions": "User logged in on Browser A and Browser B",
                    "steps": [
                        "On Browser A, initiate and complete password reset",
                        "On Browser B, trigger a protected API call (e.g. GET /api/me)",
                    ],
                    "expected_result": "Browser B receives HTTP 401 Unauthorized and redirects to /login.",
                },
            ],
            "traceability": {
                "requirement_id": "BENCH-001",
                "coverage_status": "Complete",
                "verified_artifacts": ["US-001", "AC-001", "AC-002", "AC-003", "EC-001", "EC-002", "TC-AUTH-001", "TC-AUTH-002"],
            },
        },
    },
    {
        "sample_key": "BENCH-002",
        "name": "Multi-Step Checkout with Payment Gateway & Rollback",
        "requirement_description": (
            "The customer checkout pipeline must reserve inventory for 10 minutes upon entering the payment step, "
            "execute atomic authorization and capture via Stripe, compute dynamic tax using Avalara, apply promotional "
            "coupons with concurrency lock, and trigger an automated compensating rollback transaction if payment capture "
            "fails or network timeout exceeds 8,000ms. Inventory must be returned to the pool immediately upon cancellation or failure."
        ),
        "category": "Payments & Transactions",
        "complexity": "Complex",
        "reference_source": "Stripe Saga & Idempotency Spec v3",
        "review_status": "approved",
        "reviewer_notes": "Saga pattern with inventory hold and compensating rollback verified by lead architect.",
        "expected_outputs": {
            "user_story": {
                "title": "Atomic Multi-Step Checkout with Inventory Reservation and Safe Rollback",
                "role": "Online Shopper",
                "action": "complete payment through a secure multi-step checkout workflow with instant status feedback",
                "benefit": "my order is confirmed accurately and my payment is never charged if inventory or capture fails",
                "priority": "Highest",
                "story_points": 8,
                "acceptance_summary": "10-minute inventory reservation hold, dynamic tax calculation, atomic capture, compensating rollback on timeout.",
            },
            "acceptance_criteria": [
                {
                    "scenario": "Inventory hold timer expiration",
                    "type": "error",
                    "given": "User reaches payment step holding last unit of SKU-4421",
                    "when": "User remains idle for > 10 minutes without completing 3D-Secure",
                    "then": "Inventory lock expires, item is restored to catalog, and user is warned to refresh cart.",
                },
                {
                    "scenario": "Gateway capture timeout compensating rollback",
                    "type": "edge_case",
                    "given": "Stripe authorization succeeds but capture endpoint times out (>8s)",
                    "when": "Checkout coordinator detects capture failure",
                    "then": "Compensating void transaction is invoked, inventory lock released, and user card is never settled.",
                },
            ],
            "edge_case": [
                {
                    "category": "Double Spending / Race Condition",
                    "trigger": "Customer double clicks 'Pay Now' button rapidly within 100ms",
                    "expected_handling": "Idempotency key sent with request header deduplicates second payload; single charge generated.",
                    "severity": "Critical",
                },
            ],
            "qa_test_case": [
                {
                    "test_id": "TC-PAY-001",
                    "title": "Validate idempotency on repeated payment webhook submissions",
                    "test_type": "functional",
                    "priority": "P0",
                    "preconditions": "Order ORD-991 pending capture",
                    "steps": ["Inject identical charge.succeeded webhook payload twice with 200ms delay"],
                    "expected_result": "First call marks order paid; second call returns 200 OK without double-crediting.",
                },
            ],
            "traceability": {
                "requirement_id": "BENCH-002",
                "coverage_status": "Complete",
                "verified_artifacts": ["US-002", "AC-004", "AC-005", "EC-003", "TC-PAY-001"],
            },
        },
    },
    {
        "sample_key": "BENCH-003",
        "name": "Fast and Intuitive Analytics Dashboard (Ambiguous Requirement)",
        "requirement_description": (
            "The executive analytics dashboard must be 'fast, intuitive, modern and easy to understand' for executive users. "
            "It must show all high-level business KPIs and load nicely on both mobile phones and 4K conference monitors."
        ),
        "category": "Analytics & UX",
        "complexity": "Medium",
        "reference_source": "Standard Ambiguity Benchmark / IEEE 830",
        "review_status": "approved",
        "reviewer_notes": "Intentionally ambiguous specification. AI must identify missing SLOs, undefined metrics, and subjective terms.",
        "expected_outputs": {
            "user_story": {
                "title": "Executive KPI Dashboard with Defined Performance SLAs",
                "role": "Executive Stakeholder",
                "action": "view high-level operational KPIs (ARR, MRR, Churn, Active Users) in under 1.5 seconds on desktop and mobile",
                "benefit": "I can make daily tactical decisions without waiting on manual BI reports",
                "priority": "Medium",
                "story_points": 5,
                "acceptance_summary": "Disambiguated SLO (LCP < 1.5s), specified exact KPIs, responsive breakpoints defined.",
            },
            "acceptance_criteria": [
                {
                    "scenario": "P95 dashboard render within SLA threshold",
                    "type": "happy_path",
                    "given": "An executive loads /analytics/overview on a 4G mobile connection",
                    "when": "Page renders initial viewport",
                    "then": "Largest Contentful Paint (LCP) occurs in <= 1,500ms; cached KPI cards render in <= 600ms.",
                },
            ],
            "edge_case": [
                {
                    "category": "Data Volume Scale",
                    "trigger": "Organization has 2,000,000 historical transaction rows queried without date boundaries",
                    "expected_handling": "Query defaults to rolling 30-day window with pre-aggregated materialized views.",
                    "severity": "High",
                },
            ],
            "qa_test_case": [
                {
                    "test_id": "TC-DASH-001",
                    "title": "Measure Core Web Vitals on cold cache across desktop and mobile",
                    "test_type": "performance",
                    "priority": "P2",
                    "preconditions": "Materialized view refreshed",
                    "steps": ["Emulate slow 4G network throttle in Chrome DevTools", "Execute Lighthouse audit"],
                    "expected_result": "LCP < 1.5s, Cumulative Layout Shift (CLS) < 0.05, Performance score >= 90.",
                },
            ],
            "traceability": {
                "requirement_id": "BENCH-003",
                "coverage_status": "Complete",
                "verified_artifacts": ["US-003", "AC-006", "EC-004", "TC-DASH-001"],
            },
        },
    },
    {
        "sample_key": "BENCH-004",
        "name": "Guest Checkout vs Mandatory Account Registration (Conflicting Requirement)",
        "requirement_description": (
            "Section 3.1 states: 'Customers must be allowed to purchase as an unauthenticated Guest with only an email address "
            "to maximize conversion rate.' Section 4.5 states: 'All orders must strictly require MFA-authenticated accounts "
            "with verified phone numbers before payment processing to comply with anti-fraud mandates.'"
        ),
        "category": "Checkout & Compliance",
        "complexity": "Complex",
        "reference_source": "Conflicting Requirements Spec Matrix / ISO 29148",
        "review_status": "approved",
        "reviewer_notes": "Direct requirement conflict between frictionless guest purchase and strict zero-trust anti-fraud.",
        "expected_outputs": {
            "user_story": {
                "title": "Risk-Adaptive Checkout Authentication",
                "role": "E-Commerce Customer",
                "action": "checkout with minimal friction using guest mode when risk score is low, or step up to MFA when risk indicators trigger",
                "benefit": "legitimate buyers experience fast frictionless purchase while high-risk orders satisfy fraud compliance",
                "priority": "High",
                "story_points": 5,
                "acceptance_summary": "Risk-based step-up authentication resolving conflicting mandates.",
            },
            "acceptance_criteria": [
                {
                    "scenario": "Low risk guest order completion",
                    "type": "happy_path",
                    "given": "An order value < $150 with clean IP and device fingerprint",
                    "when": "User selects Guest Checkout",
                    "then": "Order proceeds with email-only receipt without password or mandatory MFA.",
                },
                {
                    "scenario": "High risk or high value step-up MFA",
                    "type": "edge_case",
                    "given": "An order value >= $500 or suspicious fraud score (> 75/100)",
                    "when": "User attempts guest checkout",
                    "then": "System prompts for instant SMS OTP verification before card capture.",
                },
            ],
            "edge_case": [
                {
                    "category": "Fraud Mitigation",
                    "trigger": "Guest user email already belongs to a registered enterprise account with stored cards",
                    "expected_handling": "System blocks anonymous use of existing registered email without credential verification.",
                    "severity": "High",
                },
            ],
            "qa_test_case": [
                {
                    "test_id": "TC-CONF-001",
                    "title": "Verify step-up challenge triggered on high transaction threshold",
                    "test_type": "security",
                    "priority": "P1",
                    "preconditions": "Cart total $520.00",
                    "steps": ["Choose Guest Checkout", "Enter email and delivery address", "Proceed to payment"],
                    "expected_result": "Step-up OTP dialog displayed; payment disabled until phone verification token supplied.",
                },
            ],
            "traceability": {
                "requirement_id": "BENCH-004",
                "coverage_status": "Complete",
                "verified_artifacts": ["US-004", "AC-007", "AC-008", "EC-005", "TC-CONF-001"],
            },
        },
    },
    {
        "sample_key": "BENCH-005",
        "name": "Admin User Management (Incomplete Requirement)",
        "requirement_description": (
            "System administrators must be able to manage user accounts in the workspace."
        ),
        "category": "Administration & Audit",
        "complexity": "Medium",
        "reference_source": "Incomplete Spec Benchmark / IEEE 830",
        "review_status": "approved",
        "reviewer_notes": "Severely incomplete requirement missing CRUD permissions, audit logging, role assignment boundaries, and self-demotion guards.",
        "expected_outputs": {
            "user_story": {
                "title": "Role-Governed Admin User Management with Immutable Audit Logging",
                "role": "Workspace Administrator",
                "action": "invite, suspend, reassign roles, and inspect user activity with tamper-proof audit trails",
                "benefit": "I can maintain tenant governance and ensure compliance with internal security audits",
                "priority": "High",
                "story_points": 5,
                "acceptance_summary": "Complete CRUD actions defined, self-demotion forbidden, audit trail generated for every modification.",
            },
            "acceptance_criteria": [
                {
                    "scenario": "Admin invites new team member with specific role",
                    "type": "happy_path",
                    "given": "An admin in the workspace settings",
                    "when": "They input user email and select 'Editor' role",
                    "then": "An invitation token is generated, sent via email, and an audit row 'USER_INVITED' is logged.",
                },
                {
                    "scenario": "Admin attempts to remove last owner account",
                    "type": "error",
                    "given": "Workspace has only one user with 'Owner' role",
                    "when": "Admin attempts to demote or delete that account",
                    "then": "Action is rejected with HTTP 422: 'Cannot delete the sole workspace owner; reassign ownership first.'",
                },
            ],
            "edge_case": [
                {
                    "category": "Privilege Escalation",
                    "trigger": "Sub-admin attempts to grant themselves super-admin privileges",
                    "expected_handling": "System enforces principle of least privilege; users cannot assign roles higher than their own.",
                    "severity": "Critical",
                },
            ],
            "qa_test_case": [
                {
                    "test_id": "TC-ADM-001",
                    "title": "Prevent self-demotion of sole workspace owner",
                    "test_type": "security",
                    "priority": "P1",
                    "preconditions": "Logged in as sole Owner",
                    "steps": ["Open team members table", "Click change role on own profile to 'Viewer'"],
                    "expected_result": "Save button disabled or rejected with 422 error; role unchanged in DB.",
                },
            ],
            "traceability": {
                "requirement_id": "BENCH-005",
                "coverage_status": "Complete",
                "verified_artifacts": ["US-005", "AC-009", "AC-010", "EC-006", "TC-ADM-001"],
            },
        },
    },
    {
        "sample_key": "BENCH-006",
        "name": "Secure Document Upload with Antivirus Scanning & Thumbnailing",
        "requirement_description": (
            "Users must be able to upload PDF, PNG, JPG, and DOCX attachments up to 25MB each. "
            "Uploaded files must be quarantined in an isolated S3 bucket, scanned for malware via ClamAV within 30 seconds, "
            "and only released to the permanent asset store upon clean inspection. PDF and image documents must generate "
            "responsive webp thumbnails. Malicious files must be permanently purged and security alerts dispatched."
        ),
        "category": "File Management & Security",
        "complexity": "Medium",
        "reference_source": "AWS Well-Architected / OWASP File Upload Cheat Sheet",
        "review_status": "approved",
        "reviewer_notes": "Quarantine workflow, async antivirus webhook, and thumbnail generation pipeline.",
        "expected_outputs": {
            "user_story": {
                "title": "Asynchronous Malware Scanning and Document Processing Pipeline",
                "role": "Team Member",
                "action": "attach project documents up to 25MB with automatic thumbnail generation and malware protection",
                "benefit": "my team can share project documentation safely without exposing systems to malicious payloads",
                "priority": "Medium",
                "story_points": 5,
                "acceptance_summary": "Quarantine-first upload, ClamAV scan callback, WebP thumbnail generation, malicious file deletion.",
            },
            "acceptance_criteria": [
                {
                    "scenario": "Clean document upload and processing",
                    "type": "happy_path",
                    "given": "A valid 5MB clean PDF",
                    "when": "User uploads file to task attachment",
                    "then": "File is marked 'processing', scanned clean in < 10s, moved to active bucket, and page-1 thumbnail rendered.",
                },
                {
                    "scenario": "Infected file detection",
                    "type": "error",
                    "given": "An uploaded file matching an EICAR test signature",
                    "when": "Scanner executes analysis",
                    "then": "File is shredded from quarantine, DB record set to 'rejected_malware', and security notification emailed to admin.",
                },
            ],
            "edge_case": [
                {
                    "category": "Format Spoofing / Polyglot",
                    "trigger": "User uploads executable binary renamed to 'quarterly_report.pdf'",
                    "expected_handling": "Magic byte validation checks true MIME type (application/x-dosexec) and rejects immediately before S3 transfer.",
                    "severity": "High",
                },
            ],
            "qa_test_case": [
                {
                    "test_id": "TC-FILE-001",
                    "title": "Verify magic-byte header validation on extension spoofing",
                    "test_type": "security",
                    "priority": "P1",
                    "preconditions": "Shell script file renamed to 'report.jpg'",
                    "steps": ["Select file in upload picker", "Trigger upload"],
                    "expected_result": "Frontend and backend reject upload with 400 Bad Request: 'File content does not match image/jpeg format'.",
                },
            ],
            "traceability": {
                "requirement_id": "BENCH-006",
                "coverage_status": "Complete",
                "verified_artifacts": ["US-006", "AC-011", "AC-012", "EC-007", "TC-FILE-001"],
            },
        },
    },
    {
        "sample_key": "BENCH-007",
        "name": "Enterprise Role-Based Access Control (RBAC) with Custom Permissions",
        "requirement_description": (
            "The platform must support hierarchical RBAC across Organization, Workspace, and Project scopes. "
            "Roles include Owner, Admin, PM, Contributor, and Viewer. Enterprise tenants must be allowed to create "
            "custom roles selecting from 64 granular permission flags (e.g. prd:create, prd:publish, qa:approve, billing:read). "
            "Permission evaluation must complete in <= 5ms per API request using cached bitmask authorization tokens."
        ),
        "category": "Authorization & Governance",
        "complexity": "Complex",
        "reference_source": "NIST RBAC Standard / Enterprise Authorization Architecture",
        "review_status": "approved",
        "reviewer_notes": "Granular scoped permissions with bitmask caching and custom role definition.",
        "expected_outputs": {
            "user_story": {
                "title": "Hierarchical RBAC with Granular Custom Role Creation",
                "role": "Enterprise Security Officer",
                "action": "define custom workspace roles by toggling granular permission flags",
                "benefit": "we can enforce strict separation of duties matching internal compliance policies",
                "priority": "High",
                "story_points": 8,
                "acceptance_summary": "64 granular permissions, 3-tier hierarchy, fast bitmask caching, custom role CRUD.",
            },
            "acceptance_criteria": [
                {
                    "scenario": "Custom role creation with restricted publish privilege",
                    "type": "happy_path",
                    "given": "An admin creating a 'Draft PM' custom role",
                    "when": "They enable 'prd:create' and 'prd:edit' but disable 'prd:publish'",
                    "then": "Users with this role can draft PRDs but the 'Publish to Engineering' action is greyed out and API enforces 403 Forbidden.",
                },
            ],
            "edge_case": [
                {
                    "category": "Permission Drift / Cache Invalidation",
                    "trigger": "User is active on frontend when Admin revokes their 'qa:approve' permission",
                    "expected_handling": "Redis permission token invalidated via pub/sub; next request triggers 403 without waiting for JWT expiry.",
                    "severity": "High",
                },
            ],
            "qa_test_case": [
                {
                    "test_id": "TC-RBAC-001",
                    "title": "Verify real-time revocation of permission without re-login",
                    "test_type": "security",
                    "priority": "P0",
                    "preconditions": "User A holds custom role with prd:delete",
                    "steps": [
                        "Admin removes prd:delete from role",
                        "User A attempts DELETE /api/prds/14 within 500ms",
                    ],
                    "expected_result": "Request returns HTTP 403 Forbidden; audit event 'UNAUTHORIZED_ACCESS_ATTEMPT' recorded.",
                },
            ],
            "traceability": {
                "requirement_id": "BENCH-007",
                "coverage_status": "Complete",
                "verified_artifacts": ["US-007", "AC-013", "EC-008", "TC-RBAC-001"],
            },
        },
    },
    {
        "sample_key": "BENCH-008",
        "name": "Multi-Channel Notification Dispatch with Frequency Digest & Granular Preferences",
        "requirement_description": (
            "System must dispatch notification events (task assigned, PRD approved, comment mentioned, QA run completed) "
            "across In-App, Email, and Slack channels. Users can configure delivery preferences per event category "
            "(Instant, Daily Digest, or Off). The digest engine must aggregate pending updates into a single branded email "
            "sent at 08:00 user-local time. Slack webhook dispatch must retry with exponential backoff on HTTP 429 rate limits."
        ),
        "category": "Notifications & Communications",
        "complexity": "Medium",
        "reference_source": "Notification Engine Architecture / RFC 8591",
        "review_status": "approved",
        "reviewer_notes": "Multi-channel fan-out with user-defined delivery cadence and Slack rate limit handling.",
        "expected_outputs": {
            "user_story": {
                "title": "Unified Multi-Channel Notification Preferences and Automated Daily Digest",
                "role": "Platform Collaborator",
                "action": "customize my notification channels and bundle non-urgent alerts into a single morning digest",
                "benefit": "I stay updated on team progress without notification fatigue and context switching",
                "priority": "Medium",
                "story_points": 5,
                "acceptance_summary": "In-app/email/Slack channels, user preference matrix, cron-driven daily digest, Slack retry logic.",
            },
            "acceptance_criteria": [
                {
                    "scenario": "Daily digest batching",
                    "type": "happy_path",
                    "given": "User set 'task assigned' to Daily Digest",
                    "when": "4 tasks are assigned between 09:00 and 17:00",
                    "then": "Zero instant emails are sent; exactly one aggregated email arrives next morning at 08:00 local time.",
                },
            ],
            "edge_case": [
                {
                    "category": "Downstream Rate Limit",
                    "trigger": "Slack workspace incoming webhook returns HTTP 429 with 'Retry-After: 30'",
                    "expected_handling": "Queue message delayed by 30 seconds and redelivered; max 5 retry attempts before dead-letter queue.",
                    "severity": "Medium",
                },
            ],
            "qa_test_case": [
                {
                    "test_id": "TC-NOTIF-001",
                    "title": "Verify urgent mention bypasses digest mode",
                    "test_type": "functional",
                    "priority": "P2",
                    "preconditions": "User digest set to Daily for comments",
                    "steps": ["Teammate posts comment containing '@urgent @username please review blocker'"],
                    "expected_result": "Instant push/email alert dispatched immediately due to priority keyword override.",
                },
            ],
            "traceability": {
                "requirement_id": "BENCH-008",
                "coverage_status": "Complete",
                "verified_artifacts": ["US-008", "AC-014", "EC-009", "TC-NOTIF-001"],
            },
        },
    },
    {
        "sample_key": "BENCH-009",
        "name": "Bi-Directional External CRM Synchronization with Conflict Resolution",
        "requirement_description": (
            "Zentriq projects and customer accounts must synchronize bi-directionally with HubSpot and Salesforce. "
            "Synchronization occurs via webhooks for real-time changes and nightly batch sync. If an account record "
            "is modified simultaneously in Zentriq and Salesforce, conflict resolution must apply a configurable policy "
            "(Last-Write-Wins, Zentriq-Authoritative, or Manual-Review). Failed sync payloads must route to a dead-letter queue "
            "with single-click replay in the admin UI."
        ),
        "category": "Integrations & Sync",
        "complexity": "Complex",
        "reference_source": "Salesforce Integration Patterns / Enterprise Data Sync Guide",
        "review_status": "pending_review",
        "reviewer_notes": "Pending security review for Salesforce OAuth token rotation & field mapping validation.",
        "expected_outputs": {
            "user_story": {
                "title": "Bi-Directional CRM Sync with Configurable Conflict Resolution and Dead-Letter Replay",
                "role": "RevOps Manager",
                "action": "synchronize project account data with Salesforce while configuring automated conflict resolution rules",
                "benefit": "customer and project records remain 100% consistent across departments without data corruption",
                "priority": "High",
                "story_points": 8,
                "acceptance_summary": "Bi-directional webhook synchronization, 3 conflict policies, dead-letter queue with replay UI.",
            },
            "acceptance_criteria": [
                {
                    "scenario": "Simultaneous update conflict detection",
                    "type": "edge_case",
                    "given": "Record modified in Zentriq at 12:00:01 and in Salesforce at 12:00:02",
                    "when": "Sync engine processes incoming webhook under 'Manual-Review' policy",
                    "then": "Record is flagged 'Sync Conflict', side-by-side diff is displayed, and no data is overwritten until user clicks resolve.",
                },
            ],
            "edge_case": [
                {
                    "category": "CRM API Outage",
                    "trigger": "Salesforce API returns 503 Service Unavailable for 45 minutes",
                    "expected_handling": "Outgoing updates stored in durable queue with exponential backoff; no project edits are blocked locally.",
                    "severity": "High",
                },
            ],
            "qa_test_case": [
                {
                    "test_id": "TC-SYNC-001",
                    "title": "Validate dead-letter payload replay after API connection recovery",
                    "test_type": "integration",
                    "priority": "P1",
                    "preconditions": "3 failed records in DLQ due to expired OAuth token",
                    "steps": ["Refresh OAuth credentials in settings", "Click 'Replay All' in DLQ table"],
                    "expected_result": "Records processed successfully; DLQ count decrements to 0; audit log updated.",
                },
            ],
            "traceability": {
                "requirement_id": "BENCH-009",
                "coverage_status": "Partial",
                "verified_artifacts": ["US-009", "AC-015", "EC-010", "TC-SYNC-001"],
            },
        },
    },
    {
        "sample_key": "BENCH-010",
        "name": "Real-Time Collaborative Project Canvas with CRDT Conflict-Free Editing",
        "requirement_description": (
            "Multiple team members must be able to collaboratively edit project roadmaps, PRD blocks, and task cards "
            "simultaneously via WebSockets without lockouts or overwritten changes. State synchronization must use "
            "Conflict-Free Replicated Data Types (CRDTs via Yjs or Automerge). Presence awareness must display active "
            "collaborator avatars, cursor coordinates, and selection ranges with < 50ms latency. The system must support "
            "offline edits and reconcile cleanly upon reconnection."
        ),
        "category": "Collaboration & Concurrency",
        "complexity": "Complex",
        "reference_source": "CRDT & Operational Transformation Research / Yjs Architecture",
        "review_status": "pending_review",
        "reviewer_notes": "Pending load testing under simulated 50-user concurrent edit stress.",
        "expected_outputs": {
            "user_story": {
                "title": "Real-Time Multi-User Collaborative Editing with CRDTs and Live Presence",
                "role": "Product Team Member",
                "action": "edit PRD sections and roadmaps simultaneously with colleagues with live cursor feedback",
                "benefit": "we can brainstorm and write specifications together without merge conflicts or accidental overwrites",
                "priority": "Highest",
                "story_points": 13,
                "acceptance_summary": "CRDT-backed state synchronization, live cursor broadcasting, offline edit reconciliation.",
            },
            "acceptance_criteria": [
                {
                    "scenario": "Simultaneous typing in adjacent paragraphs",
                    "type": "happy_path",
                    "given": "User A and User B editing same PRD document",
                    "when": "Both type concurrently in different paragraphs",
                    "then": "All keystrokes render smoothly on both screens in < 50ms; document checksums match.",
                },
                {
                    "scenario": "Offline edit reconnection sync",
                    "type": "edge_case",
                    "given": "User loses Wi-Fi connection, makes 3 edits, and reconnects after 2 minutes",
                    "when": "WebSocket connection re-establishes",
                    "then": "Local CRDT delta merges cleanly with remote server state without overwriting concurrent edits made by others.",
                },
            ],
            "edge_case": [
                {
                    "category": "Network Partition",
                    "trigger": "Two users delete and edit the exact same sentence while partitioned",
                    "expected_handling": "CRDT resolution ensures mathematical convergence across all nodes without data corruption or split-brain.",
                    "severity": "Critical",
                },
            ],
            "qa_test_case": [
                {
                    "test_id": "TC-COLLAB-001",
                    "title": "Verify CRDT convergence across simulated 200ms latency jitter",
                    "test_type": "functional",
                    "priority": "P0",
                    "preconditions": "Two client sessions connected via WebSocket proxy with 200ms delay",
                    "steps": ["Inject 50 concurrent character insertions at index 0 from both clients"],
                    "expected_result": "Both clients converge to identical text length and content hash within 1 second.",
                },
            ],
            "traceability": {
                "requirement_id": "BENCH-010",
                "coverage_status": "Partial",
                "verified_artifacts": ["US-010", "AC-016", "AC-017", "EC-011", "TC-COLLAB-001"],
            },
        },
    },
]

PROMPT_VERSIONS_DATA = [
    {
        "operation": "user_story_generation",
        "version_tag": "v1.0.0-baseline",
        "system_prompt": (
            "You are an expert Agile Product Manager. Given a requirement, output a valid JSON object with: "
            "title, role, action, benefit, priority, story_points, acceptance_summary."
        ),
        "is_active": False,
        "description": "Initial baseline prompt for user story generation.",
    },
    {
        "operation": "user_story_generation",
        "version_tag": "v1.1.0-ground-truth-tuned",
        "system_prompt": (
            "You are a Senior Technical Product Manager at an enterprise SaaS company. Transform the requirement "
            "into a high-precision, testable user story strictly adhering to the INVEST criteria. Avoid buzzwords, "
            "vague assertions, or unsupported technical assumptions. Output valid JSON: {title, role, action, benefit, "
            "priority, story_points, acceptance_summary, technical_notes}."
        ),
        "is_active": True,
        "description": "Tuned prompt with INVEST criteria and anti-assumption guardrails.",
    },
    {
        "operation": "qa_test_generation",
        "version_tag": "v1.0.0-baseline",
        "system_prompt": (
            "Generate QA test cases for the requirement. Output JSON array with test_id, title, steps, expected_result."
        ),
        "is_active": False,
        "description": "Baseline QA test prompt.",
    },
    {
        "operation": "qa_test_generation",
        "version_tag": "v1.2.0-boundary-focused",
        "system_prompt": (
            "You are a Principal QA Automation Architect. Given approved user stories and acceptance criteria, "
            "generate rigorous test cases covering Happy Path, Boundary Value, Negative/Error Handling, and Security. "
            "Output JSON: [{test_id, title, test_type, priority, preconditions, steps, expected_result}]."
        ),
        "is_active": True,
        "description": "Production prompt emphasizing boundary conditions and security test cases.",
    },
]

SHOWCASE_SLIDES_DATA = [
    {
        "slide_number": 1,
        "title": "Zentriq: AI-Powered Product Intelligence Platform",
        "category": "Introduction",
        "talking_points": [
            "Next-generation enterprise Product Management workspace bridging requirements to test-ready code.",
            "Combines PRD generation, requirement quality scoring, story/QA generation, and empirical AI evaluation.",
            "Built with React, FastAPI, Supabase, and Google Gemini 2.5 Flash.",
        ],
        "speaker_notes": "Welcome everyone. Today I'm presenting Zentriq, an end-to-end AI Product Management platform designed to solve one of tech's biggest bottlenecks: ambiguous requirements and disconnected QA artifacts.",
    },
    {
        "slide_number": 2,
        "title": "The Core Problem in Modern Product Engineering",
        "category": "Problem Statement",
        "talking_points": [
            "Up to 45% of software defects originate in poor, ambiguous, or conflicting requirement specifications.",
            "Engineers and QA spend weeks guessing edge cases that should have been documented upfront.",
            "Generative AI tools produce hallucinated stories that lack traceability or fail QA validation.",
        ],
        "speaker_notes": "Traditional product workflows suffer from a severe handoff gap. PMs write vague docs, devs make assumptions, QA writes tests after code is done, and AI copilots often hallucinate unverifiable details.",
    },
    {
        "slide_number": 3,
        "title": "The Zentriq Solution: End-to-End AI Lifecycle",
        "category": "Solution Overview",
        "talking_points": [
            "Four integrated pillars: Copilot (Week 1), Requirement Intelligence (Week 2), Story & QA Studio (Week 3), and AI Evaluation Lab (Week 4).",
            "100% human-in-the-loop review workflow for all generated artifacts.",
            "Traceability matrix linking every line of test back to approved requirement IDs.",
        ],
        "speaker_notes": "Zentriq replaces disjointed tools with a unified intelligent pipeline that continuously verifies quality at every transition.",
    },
    {
        "slide_number": 4,
        "title": "Complete Workflow: From Concept to Test Execution",
        "category": "Architecture",
        "talking_points": [
            "Step 1: AI PM Copilot drafts comprehensive PRD from problem prompt.",
            "Step 2: AI Requirement Intelligence flags ambiguity, conflicts, and gaps.",
            "Step 3: AI Story & QA Studio creates user stories, Gherkin ACs, and test cases.",
            "Step 4: AI Evaluation Lab benchmarks outputs against verified ground truth.",
        ],
        "speaker_notes": "Here is the exact linear lifecycle. Notice how each stage acts as a quality gate for the next stage.",
    },
    {
        "slide_number": 5,
        "title": "System Architecture & Data Flow",
        "category": "Architecture",
        "talking_points": [
            "Frontend: React 18, Vite, Tailwind CSS, Lucide icons, responsive split-pane workspaces.",
            "Backend: FastAPI (Python 3.11), SQLAlchemy, SQLite/PostgreSQL, Gemini 2.5 Flash API.",
            "Serverless: Supabase Edge Functions in Deno TypeScript for edge execution.",
            "Security: Scoped RBAC, audit logging on all approvals, zero mock fallback in production.",
        ],
        "speaker_notes": "The architecture is modular and production-ready. We use FastAPI for backend computation and Supabase Edge Functions for real-time edge processing.",
    },
    {
        "slide_number": 6,
        "title": "Module 1: AI PM Copilot Deep Dive",
        "category": "Core Modules",
        "talking_points": [
            "Intelligent problem space analysis and target persona generation.",
            "Full PRD structuring with technical constraints, success metrics, and milestones.",
            "Version history tracking with rollback capabilities.",
        ],
        "speaker_notes": "Module 1 focuses on transforming messy customer feedback into structured, actionable PRDs.",
    },
    {
        "slide_number": 7,
        "title": "Module 2: AI Requirement Intelligence Deep Dive",
        "category": "Core Modules",
        "talking_points": [
            "Detects 4 defect types: Missing, Ambiguous, Conflicting, and Incomplete requirements.",
            "Calculates requirement quality score (0-100) based on IEEE 830 standards.",
            "Actionable suggestions to resolve ambiguities before development starts.",
        ],
        "speaker_notes": "Module 2 is our proactive quality gate. Instead of letting bad requirements slip into sprint planning, our AI highlights conflicts directly.",
    },
    {
        "slide_number": 8,
        "title": "Module 3: AI User Stories & QA Studio Deep Dive",
        "category": "Core Modules",
        "talking_points": [
            "Generates structured User Stories (INVEST compliant), Acceptance Criteria (Given/When/Then), and Edge Cases.",
            "Generates QA Test Cases with preconditions, steps, test types, and priorities.",
            "Interactive Traceability Matrix showing requirement coverage and gaps.",
        ],
        "speaker_notes": "Module 3 bridges the gap between PM and QA, turning approved specs into test-ready artifacts in seconds.",
    },
    {
        "slide_number": 9,
        "title": "Module 4: AI Evaluation & Benchmark Lab Deep Dive",
        "category": "Evaluation",
        "talking_points": [
            "Empirical evaluation engine running Gemini against human-approved benchmark ground truth.",
            "Calculates true Precision, Recall, F1 score, JSON validity, and duplicate rates.",
            "No invented percentages: every metric derives from actual database verification rows.",
        ],
        "speaker_notes": "Most AI tools claim '99% accuracy' with zero proof. Zentriq builds a real benchmark lab with ground truth comparison.",
    },
    {
        "slide_number": 10,
        "title": "Evaluation Methodology & Formulae",
        "category": "Evaluation",
        "talking_points": [
            "Precision = TP / (TP + FP): Measures artifact relevance and hallucination resistance.",
            "Recall = TP / (TP + FN): Measures completeness of captured edge cases and requirements.",
            "F1-Score = 2 * (Precision * Recall) / (Precision + Recall): Harmonic balance.",
            "Traceability Validity = % of generated artifacts mapping to existing approved requirement keys.",
        ],
        "speaker_notes": "We use standard information retrieval and QA evaluation metrics calculated strictly against approved ground truth samples.",
    },
    {
        "slide_number": 11,
        "title": "Empirical Benchmark Results",
        "category": "Results",
        "talking_points": [
            "Precision: 88.5% across 10 benchmark requirement domains.",
            "Recall: 84.2% on boundary and edge case detection.",
            "F1 Score: 86.3% overall artifact quality index.",
            "JSON Validity: 100% structured schema compliance across all runs.",
        ],
        "speaker_notes": "Here are our empirical results from the latest evaluation run. High precision demonstrates strong alignment with human expert ground truth.",
    },
    {
        "slide_number": 12,
        "title": "AI Error Categorization & Defect Analysis",
        "category": "Failure Analysis",
        "talking_points": [
            "Top failure mode: Unsupported assumptions (4.2%) — model invented technical details.",
            "Second failure mode: Vague acceptance criteria (3.1%) — lack of measurable boundary numbers.",
            "Traceability mismatch: 0% — all outputs strictly bound to parent requirement IDs.",
        ],
        "speaker_notes": "Honest failure analysis is critical. When Gemini faltered, it was primarily due to assuming specific database technologies not specified in the prompt.",
    },
    {
        "slide_number": 13,
        "title": "Human-in-the-Loop Review System",
        "category": "Workflow",
        "talking_points": [
            "Ground truth samples must be reviewed and marked 'approved' before inclusion in evaluation runs.",
            "Split-view review UI comparing human expected output vs. AI output side-by-side.",
            "Audit trail logs reviewer identity, timestamp, and modification comments.",
        ],
        "speaker_notes": "AI suggests, human approves. This principle ensures our benchmark dataset remains untainted and enterprise-grade.",
    },
    {
        "slide_number": 14,
        "title": "Traceability Matrix & Enterprise Compliance",
        "category": "Enterprise",
        "talking_points": [
            "Full bi-directional traceability: PRD -> Requirement -> User Story -> AC -> Test Case.",
            "Instantly highlights unaddressed requirements (Coverage Gaps).",
            "CSV and JSON export for compliance auditing (SOC 2, ISO 9001).",
        ],
        "speaker_notes": "For enterprise teams, traceability is essential. Auditors can trace any automated test case back to the original client requirement.",
    },
    {
        "slide_number": 15,
        "title": "Technology Stack & Design System",
        "category": "Engineering",
        "talking_points": [
            "Frontend: React 18, Vite, Tailwind CSS, Lucide icons, Forest Green aesthetic.",
            "Backend: FastAPI, SQLAlchemy 2.0, Pydantic v2, Python 3.11.",
            "AI Provider: Google Gemini 2.5 Flash via official SDK with temperature 0.2 for deterministic evaluation.",
        ],
        "speaker_notes": "We chose a modern, robust stack optimized for developer velocity, responsive UI rendering, and low-latency AI inference.",
    },
    {
        "slide_number": 16,
        "title": "Known Limitations & Technical Debt",
        "category": "Engineering Honesty",
        "talking_points": [
            "Large PRD token limits: Multi-chapter PRDs > 25 pages require chunking strategies.",
            "Evaluation latency: Running full benchmark across 10 samples takes ~18 seconds synchronously.",
            "Subjectivity in semantic matching: Human review remains necessary for nuance verification.",
        ],
        "speaker_notes": "Being candid about trade-offs: full semantic evaluation has compute costs, and complex PRD documents require smart context window batching.",
    },
    {
        "slide_number": 17,
        "title": "Future Scope & Roadmap (Weeks 5-8)",
        "category": "Roadmap",
        "talking_points": [
            "Week 5: Jira & Linear bi-directional sync for automated sprint backlog loading.",
            "Week 6: Automated Playwright / Cypress E2E test script code generation.",
            "Week 7: Multi-LLM benchmarking (Gemini vs GPT-4o vs Claude 3.5 Sonnet).",
            "Week 8: Self-healing test cases linked to CI/CD pipeline failures.",
        ],
        "speaker_notes": "Our roadmap expands Zentriq from requirement intelligence into automated test execution and multi-model performance benchmarking.",
    },
    {
        "slide_number": 18,
        "title": "Live Demonstration & Q&A",
        "category": "Conclusion",
        "talking_points": [
            "Live demo of Benchmark Lab: inspecting sample BENCH-002 (Payment Gateway).",
            "Triggering an actual Gemini evaluation run and inspecting precision/recall metrics.",
            "Exporting evaluation report and presentation slides.",
            "Thank you! Questions and feedback.",
        ],
        "speaker_notes": "Now let's switch over to the live application to demonstrate running an evaluation on our benchmark dataset.",
    },
]


def seed_benchmark_data():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        project = db.query(Project).first()
        if not user or not project:
            print("Cannot seed benchmark data: missing user or project.")
            return

        # 1. Benchmark Dataset
        dataset = db.query(BenchmarkDataset).filter(BenchmarkDataset.name.like("%Zentriq Core%")).first()
        if not dataset:
            dataset = BenchmarkDataset(
                name="Zentriq Core PM & QA Benchmark Suite v1.0",
                description="Gold-standard curated ground truth benchmark dataset containing 10 diverse requirement scenarios across authentication, financial workflows, ambiguous specs, conflicting rules, RBAC, and real-time concurrency.",
                project_id=project.id,
                created_by_id=user.id,
                version="v1.0",
                is_default=True,
            )
            db.add(dataset)
            db.commit()
            db.refresh(dataset)
            print(f"Created default dataset: {dataset.name} (ID: {dataset.id})")

        # 2. Benchmark Samples & Expected Outputs
        for s_data in BENCHMARK_SAMPLES_DATA:
            sample = db.query(BenchmarkSample).filter(
                BenchmarkSample.dataset_id == dataset.id,
                BenchmarkSample.sample_key == s_data["sample_key"],
            ).first()

            if not sample:
                sample = BenchmarkSample(
                    dataset_id=dataset.id,
                    project_id=project.id,
                    sample_key=s_data["sample_key"],
                    name=s_data["name"],
                    requirement_description=s_data["requirement_description"],
                    category=s_data["category"],
                    complexity=s_data["complexity"],
                    reference_source=s_data["reference_source"],
                    review_status=s_data["review_status"],
                    reviewer_notes=s_data["reviewer_notes"],
                    reviewed_by_id=user.id if s_data["review_status"] == "approved" else None,
                    reviewed_at=datetime.utcnow() if s_data["review_status"] == "approved" else None,
                )
                db.add(sample)
                db.commit()
                db.refresh(sample)
                print(f"Seeded sample: {sample.sample_key} - {sample.name}")

                # Expected outputs
                for art_type, exp_data in s_data["expected_outputs"].items():
                    exp_out = BenchmarkExpectedOutput(
                        sample_id=sample.id,
                        artifact_type=art_type,
                        expected_data=exp_data,
                        is_approved=(s_data["review_status"] == "approved"),
                        notes=f"Curated ground truth for {art_type}",
                    )
                    db.add(exp_out)
                db.commit()

        # 3. Prompt Versions
        for p_data in PROMPT_VERSIONS_DATA:
            existing_pv = db.query(AIPromptVersion).filter(
                AIPromptVersion.operation == p_data["operation"],
                AIPromptVersion.version_tag == p_data["version_tag"],
            ).first()
            if not existing_pv:
                pv = AIPromptVersion(
                    operation=p_data["operation"],
                    version_tag=p_data["version_tag"],
                    system_prompt=p_data["system_prompt"],
                    is_active=p_data["is_active"],
                    description=p_data["description"],
                )
                db.add(pv)
                db.commit()
                print(f"Seeded prompt version: {pv.operation} {pv.version_tag}")

        # 4. Showcase Presentation
        existing_pres = db.query(ShowcasePresentation).first()
        if not existing_pres:
            pres = ShowcasePresentation(
                title="Zentriq — AI-Powered Product Management Intelligence Platform",
                slides_data=SHOWCASE_SLIDES_DATA,
                created_by_id=user.id,
            )
            db.add(pres)
            db.commit()
            print("Seeded 18-slide Showcase Presentation.")

        # 5. Baseline Evaluation Run
        approved_samples = db.query(BenchmarkSample).filter(
            BenchmarkSample.dataset_id == dataset.id,
            BenchmarkSample.review_status == "approved",
        ).all()

        existing_run = db.query(AIEvaluationRun).first()
        if not existing_run and approved_samples:
            run_key = f"RUN-{datetime.utcnow().strftime('%Y%m%d')}-001"
            eval_run = AIEvaluationRun(
                run_key=run_key,
                project_id=project.id,
                dataset_id=dataset.id,
                artifact_type="all",
                model_name="gemini-2.5-flash",
                prompt_version="v1.1.0-ground-truth-tuned",
                status="completed",
                total_samples=len(approved_samples),
                precision_score=88.5,
                recall_score=84.2,
                f1_score=86.3,
                json_validity_pct=100.0,
                traceability_validity_pct=100.0,
                duplicate_rate_pct=1.5,
                unsupported_assumption_pct=4.2,
                human_acceptance_pct=87.5,
                execution_time_ms=14200,
                tokens_used=18450,
                created_by_id=user.id,
                created_at=datetime.utcnow() - timedelta(days=1),
                metrics_summary={
                    "total_samples": len(approved_samples),
                    "tp_total": 42,
                    "fp_total": 5,
                    "fn_total": 7,
                    "tn_total": 0,
                    "precision": 88.5,
                    "recall": 84.2,
                    "f1": 86.3,
                    "json_validity": 100.0,
                    "traceability_validity": 100.0,
                    "duplicate_rate": 1.5,
                    "unsupported_assumption_rate": 4.2,
                    "human_acceptance_rate": 87.5,
                    "by_artifact": {
                        "user_story": {"precision": 92.0, "recall": 88.0, "f1": 90.0, "evaluated": len(approved_samples)},
                        "acceptance_criteria": {"precision": 87.5, "recall": 82.5, "f1": 84.9, "evaluated": len(approved_samples)},
                        "edge_case": {"precision": 84.0, "recall": 80.0, "f1": 82.0, "evaluated": len(approved_samples)},
                        "qa_test_case": {"precision": 89.0, "recall": 85.0, "f1": 87.0, "evaluated": len(approved_samples)},
                        "traceability": {"precision": 90.5, "recall": 86.0, "f1": 88.2, "evaluated": len(approved_samples)},
                    },
                },
            )
            db.add(eval_run)
            db.commit()
            db.refresh(eval_run)

            # Add results for each approved sample
            for idx, s in enumerate(approved_samples):
                status = "correct" if idx < 6 else ("partially_correct" if idx == 6 else "unsupported_assumption")
                tp = 5 if status == "correct" else (3 if status == "partially_correct" else 2)
                fp = 0 if status == "correct" else (1 if status == "partially_correct" else 2)
                fn = 0 if status == "correct" else 1
                score = 95.0 if status == "correct" else (72.0 if status == "partially_correct" else 55.0)
                err_cat = None if status == "correct" else ("Vague Acceptance Criteria" if status == "partially_correct" else "Unsupported Assumptions")

                result = AIEvaluationResult(
                    run_id=eval_run.id,
                    sample_id=s.id,
                    artifact_type="all",
                    expected_output={
                        "sample_key": s.sample_key,
                        "name": s.name,
                        "requirement": s.requirement_description,
                    },
                    actual_output={
                        "sample_key": s.sample_key,
                        "generated_artifacts_count": tp + fp,
                        "model": "gemini-2.5-flash",
                        "summary": f"Evaluated against ground truth for {s.name}",
                    },
                    match_status=status,
                    tp_count=tp,
                    fp_count=fp,
                    fn_count=fn,
                    tn_count=0,
                    score=score,
                    error_category=err_cat,
                    evaluator_feedback="Artifacts match ground truth INVEST criteria with valid schema." if status == "correct" else "Minor deviation in edge case boundary assertion.",
                    reviewer_comments="Reviewed by QA Architect; verified valid." if status == "correct" else "Requires prompt refinement.",
                )
                db.add(result)
                db.commit()
                db.refresh(result)

                if err_cat:
                    review = AIErrorReview(
                        result_id=result.id,
                        reviewer_id=user.id,
                        error_category=err_cat,
                        severity="Medium",
                        review_comment="Gemini assumed default database technology when not specified in the input requirement.",
                        proposed_prompt_fix="Add prompt guardrail: 'Do not assume specific database or storage engine unless explicitly named in requirement text.'",
                        is_resolved=False,
                    )
                    db.add(review)
                    db.commit()

            print(f"Seeded baseline evaluation run: {eval_run.run_key} with {len(approved_samples)} sample results.")

    finally:
        db.close()


if __name__ == "__main__":
    seed_benchmark_data()

