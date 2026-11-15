-- Migration: Create Week 4 AI Evaluation, Benchmark Lab & Placement Showcase Tables
-- Enables empirical quality measurement of AI-generated artifacts against human-reviewed ground truth

-- 1. Benchmark Datasets Table
CREATE TABLE IF NOT EXISTS public.benchmark_datasets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    description TEXT,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    created_by_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    version VARCHAR(50) DEFAULT 'v1.0',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Benchmark Samples Table
CREATE TABLE IF NOT EXISTS public.benchmark_samples (
    id BIGSERIAL PRIMARY KEY,
    dataset_id BIGINT REFERENCES public.benchmark_datasets(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    sample_key VARCHAR(60) NOT NULL,
    name VARCHAR(255) NOT NULL,
    requirement_description TEXT NOT NULL,
    category VARCHAR(80) NOT NULL,
    complexity VARCHAR(40) DEFAULT 'Medium', -- Simple, Medium, Complex, Ambiguous, Incomplete, Integration-heavy, Edge-case-heavy
    reference_source VARCHAR(255),
    review_status VARCHAR(40) DEFAULT 'draft', -- draft, pending_review, approved, rejected
    reviewer_notes TEXT,
    reviewed_by_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Benchmark Expected Outputs Table (Ground Truth)
CREATE TABLE IF NOT EXISTS public.benchmark_expected_outputs (
    id BIGSERIAL PRIMARY KEY,
    sample_id BIGINT REFERENCES public.benchmark_samples(id) ON DELETE CASCADE,
    artifact_type VARCHAR(50) NOT NULL, -- user_story, acceptance_criteria, edge_case, qa_test_case, traceability
    expected_data JSONB NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. AI Evaluation Runs Table
CREATE TABLE IF NOT EXISTS public.ai_evaluation_runs (
    id BIGSERIAL PRIMARY KEY,
    run_key VARCHAR(60) NOT NULL,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    dataset_id BIGINT REFERENCES public.benchmark_datasets(id) ON DELETE CASCADE,
    artifact_type VARCHAR(50) DEFAULT 'all', -- all, user_story, acceptance_criteria, edge_case, qa_test_case
    model_name VARCHAR(80) DEFAULT 'gemini-2.5-flash',
    prompt_version VARCHAR(50) DEFAULT 'v1.0.0',
    status VARCHAR(30) DEFAULT 'completed', -- running, completed, failed
    total_samples INTEGER DEFAULT 0,
    precision_score FLOAT DEFAULT 0.0,
    recall_score FLOAT DEFAULT 0.0,
    f1_score FLOAT DEFAULT 0.0,
    json_validity_pct FLOAT DEFAULT 100.0,
    traceability_validity_pct FLOAT DEFAULT 100.0,
    duplicate_rate_pct FLOAT DEFAULT 0.0,
    unsupported_assumption_pct FLOAT DEFAULT 0.0,
    human_acceptance_pct FLOAT DEFAULT 0.0,
    metrics_summary JSONB DEFAULT '{}'::jsonb,
    execution_time_ms INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    created_by_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. AI Evaluation Results Table (Sample-by-sample outcomes)
CREATE TABLE IF NOT EXISTS public.ai_evaluation_results (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT REFERENCES public.ai_evaluation_runs(id) ON DELETE CASCADE,
    sample_id BIGINT REFERENCES public.benchmark_samples(id) ON DELETE CASCADE,
    artifact_type VARCHAR(50) NOT NULL,
    expected_output JSONB NOT NULL,
    actual_output JSONB NOT NULL,
    match_status VARCHAR(40) DEFAULT 'correct', -- correct, partially_correct, incorrect, missing, unsupported_assumption
    tp_count INTEGER DEFAULT 0,
    fp_count INTEGER DEFAULT 0,
    fn_count INTEGER DEFAULT 0,
    tn_count INTEGER DEFAULT 0,
    score FLOAT DEFAULT 0.0,
    error_category VARCHAR(80), -- missing_information, hallucinated_information, incorrect_user_role, incomplete_acceptance_criteria, invalid_test_steps, duplicate_artifacts, unsupported_assumptions, none
    evaluator_feedback TEXT,
    reviewer_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. AI Error Reviews & Root-Cause Categorisation Table
CREATE TABLE IF NOT EXISTS public.ai_error_reviews (
    id BIGSERIAL PRIMARY KEY,
    result_id BIGINT REFERENCES public.ai_evaluation_results(id) ON DELETE CASCADE,
    reviewer_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    error_category VARCHAR(80) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Medium',
    review_comment TEXT NOT NULL,
    proposed_prompt_fix TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. AI Prompt Versions Table
CREATE TABLE IF NOT EXISTS public.ai_prompt_versions (
    id BIGSERIAL PRIMARY KEY,
    operation VARCHAR(60) NOT NULL,
    version_tag VARCHAR(40) NOT NULL,
    system_prompt TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Showcase Presentations Table
CREATE TABLE IF NOT EXISTS public.showcase_presentations (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL DEFAULT 'Zentriq — AI-Powered Product Management Intelligence Platform',
    slides_data JSONB NOT NULL,
    last_exported_at TIMESTAMP WITH TIME ZONE,
    created_by_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bench_samples_dataset ON public.benchmark_samples(dataset_id);
CREATE INDEX IF NOT EXISTS idx_bench_samples_status ON public.benchmark_samples(review_status);
CREATE INDEX IF NOT EXISTS idx_bench_outputs_sample ON public.benchmark_expected_outputs(sample_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_project ON public.ai_evaluation_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_dataset ON public.ai_evaluation_runs(dataset_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_run ON public.ai_evaluation_results(run_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_sample ON public.ai_evaluation_results(sample_id);
CREATE INDEX IF NOT EXISTS idx_error_reviews_result ON public.ai_error_reviews(result_id);

-- Row Level Security (RLS)
ALTER TABLE public.benchmark_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_expected_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_error_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage benchmark datasets"
    ON public.benchmark_datasets FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage benchmark samples"
    ON public.benchmark_samples FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage benchmark outputs"
    ON public.benchmark_expected_outputs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage ai evaluation runs"
    ON public.ai_evaluation_runs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage ai evaluation results"
    ON public.ai_evaluation_results FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage ai error reviews"
    ON public.ai_error_reviews FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage prompt versions"
    ON public.ai_prompt_versions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage showcase presentations"
    ON public.showcase_presentations FOR ALL TO authenticated USING (true);

