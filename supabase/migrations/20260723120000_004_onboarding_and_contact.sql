-- Tracks whether the guided setup flow has been completed, and whether the
-- new-user sample data banner has been dismissed. Both drive the first-run
-- experience on the dashboard.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS sample_data_dismissed_at TIMESTAMPTZ;

-- Backfill: any business that already exists predates the guided flow and has
-- effectively completed setup, so it should not be pushed back through it.
UPDATE businesses SET onboarding_complete = true WHERE onboarding_complete IS NOT true;

-- Contact form submissions from the marketing site.
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT DEFAULT 'website',
  handled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- The form sits on the public marketing site, so anonymous visitors must be
-- able to INSERT. They must not be able to read anything back — without an
-- explicit SELECT policy, RLS denies reads to anon and authenticated alike,
-- so submissions are write-only from the browser and readable only via the
-- service role (dashboard / SQL editor).
CREATE POLICY "anyone_can_submit_contact_form" ON contact_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_created
  ON contact_submissions(created_at DESC);
