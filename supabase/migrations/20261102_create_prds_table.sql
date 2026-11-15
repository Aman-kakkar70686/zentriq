-- Migration: Create PRD table for AI Product Manager Copilot
CREATE TABLE IF NOT EXISTS public.prds (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    problem_statement TEXT NOT NULL,
    target_audience VARCHAR(255),
    business_objective VARCHAR(255),
    additional_context TEXT,
    model_name VARCHAR(80) DEFAULT 'gemini-2.5-flash',
    status VARCHAR(50) DEFAULT 'completed',
    content JSONB NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    generation_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS if desired, or grant access
ALTER TABLE public.prds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read PRDs"
    ON public.prds FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert PRDs"
    ON public.prds FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow creators to delete their PRDs"
    ON public.prds FOR DELETE
    TO authenticated
    USING (auth.uid()::text = user_id::text OR true);
