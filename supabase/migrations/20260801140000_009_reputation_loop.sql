-- Reputation Loop: turn completed jobs into Google reviews, and catch unhappy
-- customers privately before they post publicly.
--
-- When an appointment is marked complete (and the business has switched the
-- feature on and saved a Google review link), a review_requests row is created,
-- scheduled for `completion + delay hours`. The prepared "how did the job go?"
-- text, the customer's eventual reply, its sentiment (classified by Claude
-- Haiku), and the branched follow-up all live here.
--
-- The actual SMS SEND stays disabled until the outbound provider (TNZ) is live —
-- exactly the pattern used by the Ghost Lead Resurrector. Nothing here sends.

CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  -- One request per completed appointment. UNIQUE lets the app upsert without
  -- creating duplicates if an appointment is toggled complete more than once.
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,                       -- E.164 once sending is live
  service_type TEXT,

  -- The prepared "how did the job go?" ask. Templated (no AI) at creation.
  ask_message TEXT,
  -- completion time + the business's configured delay; when we WOULD send.
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- scheduled | prepared | sent | replied | skipped
  -- sending is disabled, so real rows sit at 'scheduled'/'replied'.
  status TEXT NOT NULL DEFAULT 'scheduled',
  sent_at TIMESTAMPTZ,                        -- stays NULL until TNZ is live

  -- The customer's reply and its Haiku classification.
  reply_text TEXT,
  replied_at TIMESTAMPTZ,
  sentiment TEXT,                            -- positive | negative | mixed | NULL

  -- Branched follow-up prepared from the sentiment:
  --  positive        -> thank-you + review link
  --  negative | mixed -> apologetic reply, NO link, owner alert prepared
  followup_message TEXT,
  review_link_sent BOOLEAN NOT NULL DEFAULT FALSE,   -- stays FALSE until TNZ is live
  owner_alert_prepared BOOLEAN NOT NULL DEFAULT FALSE,
  owner_alert_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (appointment_id)
);

ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

-- Owner-scoped policies (same pattern as leads/appointments/resurrection).
-- Edge functions use the service role and bypass these; the frontend reads and
-- writes under them.
CREATE POLICY "select_own_review_requests" ON review_requests FOR SELECT
  TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "insert_own_review_requests" ON review_requests FOR INSERT
  TO authenticated WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "update_own_review_requests" ON review_requests FOR UPDATE
  TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "delete_own_review_requests" ON review_requests FOR DELETE
  TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_review_requests_business ON review_requests(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_requests_appointment ON review_requests(appointment_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(business_id, status);

-- Keep updated_at fresh (reuses the shared trigger fn from migration 001).
CREATE TRIGGER update_review_requests_updated_at BEFORE UPDATE ON review_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
