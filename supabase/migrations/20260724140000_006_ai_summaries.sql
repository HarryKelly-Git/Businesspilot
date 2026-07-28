-- Caches the AI daily/Monday summary so it is generated at most ONCE per
-- business per day. Without this the dashboard would call the model on every
-- load — this keeps credit spend to one Haiku call a day per business.
CREATE TABLE IF NOT EXISTS ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, summary_date)
);

ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;

-- Owners can read their own summaries. Writes are done by the edge function via
-- the service role, so no client insert/update policy is granted.
CREATE POLICY "select_own_summaries" ON ai_summaries FOR SELECT
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_ai_summaries_business_date
  ON ai_summaries(business_id, summary_date DESC);
