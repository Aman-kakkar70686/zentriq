-- Migration: Create AI Story & QA Intelligence Studio Tables (Week 3)
-- Enables transformation of approved requirements into user stories, acceptance criteria, edge cases, and QA test cases with full traceability

-- 1. User Stories Table
CREATE TABLE IF NOT EXISTS public.user_stories (
    id BIGSERIAL PRIMARY KEY,
    story_key VARCHAR(50) NOT NULL,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    prd_id BIGINT REFERENCES public.prds(id) ON DELETE CASCADE,
    requirement_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    user_role VARCHAR(100) NOT NULL,
    user_story_text TEXT NOT NULL,
    functionality TEXT NOT NULL,
    business_benefit TEXT NOT NULL,
    business_value VARCHAR(50) DEFAULT 'High',
    priority VARCHAR(20) DEFAULT 'P1',
    dependencies JSONB DEFAULT '[]'::jsonb,
    assumptions JSONB DEFAULT '[]'::jsonb,
    open_questions JSONB DEFAULT '[]'::jsonb,
    split_reason TEXT,
    clarification_item TEXT,
    review_status VARCHAR(30) DEFAULT 'pending', -- draft, pending, approved, rejected, needs_clarification
    review_notes TEXT,
    reviewed_by_id BIGINT REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    is_converted_to_task BOOLEAN DEFAULT FALSE,
    task_id BIGINT REFERENCES public.tasks(id) ON DELETE SET NULL,
    validation_results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Acceptance Criteria Table (Given / When / Then)
CREATE TABLE IF NOT EXISTS public.acceptance_criteria (
    id BIGSERIAL PRIMARY KEY,
    criteria_key VARCHAR(50) NOT NULL,
    story_id BIGINT REFERENCES public.user_stories(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    prd_id BIGINT REFERENCES public.prds(id) ON DELETE CASCADE,
    requirement_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    scenario_type VARCHAR(50) DEFAULT 'happy_path', -- happy_path, failure_workflow, input_validation, permissions, boundary, business_rule
    given_text TEXT NOT NULL,
    when_text TEXT NOT NULL,
    then_text TEXT NOT NULL,
    review_status VARCHAR(30) DEFAULT 'pending', -- draft, pending, approved, rejected, needs_clarification
    review_notes TEXT,
    reviewed_by_id BIGINT REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    validation_results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Edge Cases Table
CREATE TABLE IF NOT EXISTS public.edge_cases (
    id BIGSERIAL PRIMARY KEY,
    edge_case_key VARCHAR(50) NOT NULL,
    story_id BIGINT REFERENCES public.user_stories(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    prd_id BIGINT REFERENCES public.prds(id) ON DELETE CASCADE,
    requirement_id VARCHAR(100) NOT NULL,
    category VARCHAR(60) NOT NULL, -- empty_input, invalid_input, boundary_values, duplicate_submissions, network_failures, api_failures, session_expiration, permission_restrictions, concurrent_actions, missing_data, integration_failures, recovery_scenarios
    scenario TEXT NOT NULL,
    trigger_condition TEXT NOT NULL,
    expected_behaviour TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'Medium', -- Critical, High, Medium, Low
    evidence_reference TEXT,
    assumptions TEXT,
    clarification_required TEXT,
    review_status VARCHAR(30) DEFAULT 'pending', -- draft, pending, approved, rejected, needs_clarification
    review_notes TEXT,
    reviewed_by_id BIGINT REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    validation_results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. QA Test Cases Table
CREATE TABLE IF NOT EXISTS public.qa_test_cases (
    id BIGSERIAL PRIMARY KEY,
    test_case_key VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(60) NOT NULL, -- positive, negative, boundary, validation, error_handling, integration, security_permission, regression
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    prd_id BIGINT REFERENCES public.prds(id) ON DELETE CASCADE,
    requirement_id VARCHAR(100) NOT NULL,
    story_id BIGINT REFERENCES public.user_stories(id) ON DELETE CASCADE,
    acceptance_criteria_id BIGINT REFERENCES public.acceptance_criteria(id) ON DELETE SET NULL,
    preconditions TEXT,
    test_data TEXT,
    test_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected_result TEXT NOT NULL,
    actual_result TEXT,
    priority VARCHAR(20) DEFAULT 'P1', -- P0, P1, P2, P3
    risk_level VARCHAR(20) DEFAULT 'Medium', -- Critical, High, Medium, Low
    review_status VARCHAR(30) DEFAULT 'pending', -- draft, pending, approved, rejected, needs_clarification
    execution_status VARCHAR(30) DEFAULT 'not_run', -- not_run, passed, failed, blocked
    execution_notes TEXT,
    executed_by_id BIGINT REFERENCES public.users(id),
    executed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by_id BIGINT REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    validation_results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. AI Generation History Table
CREATE TABLE IF NOT EXISTS public.ai_generation_history (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    prd_id BIGINT REFERENCES public.prds(id) ON DELETE CASCADE,
    requirement_id VARCHAR(100),
    user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    generation_type VARCHAR(60) NOT NULL, -- generate_user_stories, generate_acceptance_criteria, generate_edge_cases, generate_qa_test_cases, validate_generated_artifact
    model_name VARCHAR(80) DEFAULT 'gemini-2.5-flash',
    prompt_summary TEXT,
    status VARCHAR(30) DEFAULT 'success', -- success, failed, rate_limited, parsing_error
    tokens_used INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    raw_response TEXT,
    parsed_data JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Artifact Review History / Audit Trail Table
CREATE TABLE IF NOT EXISTS public.artifact_review_history (
    id BIGSERIAL PRIMARY KEY,
    artifact_type VARCHAR(40) NOT NULL, -- user_story, acceptance_criteria, edge_case, qa_test_case
    artifact_id BIGINT NOT NULL,
    user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- approved, edited, rejected, needs_clarification, status_changed, executed
    previous_value JSONB,
    updated_value JSONB,
    review_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-performance querying and relational lookups
CREATE INDEX IF NOT EXISTS idx_user_stories_project ON public.user_stories(project_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_prd ON public.user_stories(prd_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_req ON public.user_stories(requirement_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_status ON public.user_stories(review_status);

CREATE INDEX IF NOT EXISTS idx_acceptance_criteria_story ON public.acceptance_criteria(story_id);
CREATE INDEX IF NOT EXISTS idx_acceptance_criteria_prd ON public.acceptance_criteria(prd_id);
CREATE INDEX IF NOT EXISTS idx_acceptance_criteria_req ON public.acceptance_criteria(requirement_id);
CREATE INDEX IF NOT EXISTS idx_acceptance_criteria_status ON public.acceptance_criteria(review_status);

CREATE INDEX IF NOT EXISTS idx_edge_cases_story ON public.edge_cases(story_id);
CREATE INDEX IF NOT EXISTS idx_edge_cases_prd ON public.edge_cases(prd_id);
CREATE INDEX IF NOT EXISTS idx_edge_cases_cat ON public.edge_cases(category);
CREATE INDEX IF NOT EXISTS idx_edge_cases_status ON public.edge_cases(review_status);

CREATE INDEX IF NOT EXISTS idx_qa_test_cases_story ON public.qa_test_cases(story_id);
CREATE INDEX IF NOT EXISTS idx_qa_test_cases_criteria ON public.qa_test_cases(acceptance_criteria_id);
CREATE INDEX IF NOT EXISTS idx_qa_test_cases_prd ON public.qa_test_cases(prd_id);
CREATE INDEX IF NOT EXISTS idx_qa_test_cases_review ON public.qa_test_cases(review_status);
CREATE INDEX IF NOT EXISTS idx_qa_test_cases_exec ON public.qa_test_cases(execution_status);

CREATE INDEX IF NOT EXISTS idx_ai_generation_history_prd ON public.ai_generation_history(prd_id);
CREATE INDEX IF NOT EXISTS idx_artifact_review_history_art ON public.artifact_review_history(artifact_type, artifact_id);

-- Row Level Security (RLS)
ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acceptance_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edge_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_review_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read user stories"
    ON public.user_stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert user stories"
    ON public.user_stories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update user stories"
    ON public.user_stories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete user stories"
    ON public.user_stories FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read acceptance criteria"
    ON public.acceptance_criteria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert acceptance criteria"
    ON public.acceptance_criteria FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update acceptance criteria"
    ON public.acceptance_criteria FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete acceptance criteria"
    ON public.acceptance_criteria FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read edge cases"
    ON public.edge_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert edge cases"
    ON public.edge_cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update edge cases"
    ON public.edge_cases FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete edge cases"
    ON public.edge_cases FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read qa test cases"
    ON public.qa_test_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert qa test cases"
    ON public.qa_test_cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update qa test cases"
    ON public.qa_test_cases FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete qa test cases"
    ON public.qa_test_cases FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage ai generation history"
    ON public.ai_generation_history FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage artifact review history"
    ON public.artifact_review_history FOR ALL TO authenticated USING (true);

