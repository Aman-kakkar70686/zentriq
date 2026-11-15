-- Migration: Create email_logs, email_preferences, and update meetings table
-- Date: 2026-11-06

-- 1. Extend meetings table with agenda, location, description, and attendee list
ALTER TABLE IF EXISTS meetings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS meetings ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS meetings ADD COLUMN IF NOT EXISTS agenda TEXT;
ALTER TABLE IF EXISTS meetings ADD COLUMN IF NOT EXISTS location VARCHAR(300);
ALTER TABLE IF EXISTS meetings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS meetings ADD COLUMN IF NOT EXISTS attendee_ids JSONB DEFAULT '[]'::jsonb;

-- 2. Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    cc JSONB,
    subject VARCHAR(255) NOT NULL,
    email_body TEXT NOT NULL,
    email_type VARCHAR(60) NOT NULL, -- task_assignment / meeting_invitation / meeting_update / meeting_cancellation / direct_email
    related_task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
    related_meeting_id BIGINT REFERENCES meetings(id) ON DELETE SET NULL,
    project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
    provider_message_id VARCHAR(120),
    delivery_status VARCHAR(30) DEFAULT 'sent', -- delivered / sent / pending / failed
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_user ON email_logs(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sender ON email_logs(sender_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

-- 3. Create email_preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_assignment_emails BOOLEAN DEFAULT TRUE,
    meeting_invitation_emails BOOLEAN DEFAULT TRUE,
    meeting_update_emails BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view email logs where they are the sender, recipient, or if they are an admin/manager
CREATE POLICY "Users can view authorized email logs"
ON email_logs FOR SELECT
USING (
    sender_id = auth.uid() OR
    recipient_user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND (LOWER(users.role) LIKE '%manager%' OR LOWER(users.role) LIKE '%admin%' OR LOWER(users.role) LIKE '%lead%')
    )
);

-- Policy: Authorized managers and admins can insert email logs
CREATE POLICY "Authorized users can insert email logs"
ON email_logs FOR INSERT
WITH CHECK (
    sender_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND (LOWER(users.role) LIKE '%manager%' OR LOWER(users.role) LIKE '%admin%')
    )
);

-- Policy: Users can view and manage their own email preferences
CREATE POLICY "Users can manage their own email preferences"
ON email_preferences FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

