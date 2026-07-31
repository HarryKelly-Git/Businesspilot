-- Track when each day's AI summary was emailed, so the send-daily-summary cron
-- never emails the same business twice in one day.
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
