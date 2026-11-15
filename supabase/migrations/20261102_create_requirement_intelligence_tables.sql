-- Migration: Create Requirement Intelligence Tables for Week 2 AI Requirement Intelligence & Quality Engine

-- 1. Requirement Analyses Table
CREATE TABLE IF NOT EXISTS public.requirement_analyses (
    id BIGSERIAL PRIMARY KEY,
    prd_id BIGINT REFERENCES public.prds(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    model_name VARCHAR(80) DEFAULT 'gemini-2.5-flash',
    analysis_status VARCHAR(50) DEFAULT 'completed',
    overall_score INTEGER DEFAULT 0,
    score_label VARCHAR(50) DEFAULT 'Needs Improvement',
    category_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    issue_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Requirement Issues Table
CREATE TABLE IF NOT EXISTS public.requirement_issues (
    id BIGSERIAL PRIMARY KEY,
    analysis_id BIGINT REFERENCES public.requirement_analyses(id) ON DELETE CASCADE,
    prd_id BIGINT REFERENCES public.prds(id) ON DELETE CASCADE,
    issue_type VARCHAR(30) NOT NULL, -- missing, ambiguous, conflicting, incomplete
    severity VARCHAR(20) NOT NULL, -- Critical, High, Medium, Low
    category VARCHAR(80),
    requirement_reference VARCHAR(100),
    original_text TEXT,
    ambiguous_phrase VARCHAR(200),
    conflict_requirement_b TEXT,
    conflict_ref_b VARCHAR(100),
    missing_elements JSONB,
    explanation TEXT NOT NULL,
    evidence TEXT NOT NULL,
    why_it_matters TEXT,
    suggested_improvement TEXT NOT NULL,
    clarification_question TEXT,
    review_status VARCHAR(30) DEFAULT 'pending', -- pending, accepted, edited, rejected, needs_clarification, resolved
    resolution_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Requirement Review History Table
CREATE TABLE IF NOT EXISTS public.requirement_review_history (
    id BIGSERIAL PRIMARY KEY,
    issue_id BIGINT REFERENCES public.requirement_issues(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- accepted, edited, rejected, needs_clarification, resolved
    previous_value TEXT,
    updated_value TEXT,
    review_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_req_analyses_prd ON public.requirement_analyses(prd_id);
CREATE INDEX IF NOT EXISTS idx_req_analyses_project ON public.requirement_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_req_issues_analysis ON public.requirement_issues(analysis_id);
CREATE INDEX IF NOT EXISTS idx_req_issues_prd ON public.requirement_issues(prd_id);
CREATE INDEX IF NOT EXISTS idx_req_issues_type ON public.requirement_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_req_review_history_issue ON public.requirement_review_history(issue_id);

-- Row Level Security (RLS)
ALTER TABLE public.requirement_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_review_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read requirement analyses"
    ON public.requirement_analyses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert requirement analyses"
    ON public.requirement_analyses FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read requirement issues"
    ON public.requirement_issues FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to update requirement issues"
    ON public.requirement_issues FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage review history"
    ON public.requirement_review_history FOR ALL TO authenticated USING (true);
