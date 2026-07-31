-- Ghost Lead Resurrector: import a business's old quotes / dead leads and run
-- SMS reactivation campaigns. The actual SEND step is wired separately once the
-- outbound SMS provider (TNZ) is live — this migration is the data model that
-- import, campaign building, message preview, and the results dashboard run on.

-- ---------------------------------------------------------------------------
-- Suppression list (NZ Unsolicited Electronic Messages Act 2007 compliance).
-- A STOP reply adds a permanent row here; every send, across all campaigns for
-- the business, is checked against it first.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,                      -- E.164, e.g. +642885175144
  reason TEXT NOT NULL DEFAULT 'stop_reply',-- stop_reply | manual
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, phone)
);

-- ---------------------------------------------------------------------------
-- A reactivation campaign.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resurrection_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  angle TEXT NOT NULL DEFAULT 'checking_in', -- checking_in | availability | seasonal | custom
  custom_message TEXT,                       -- used when angle = 'custom'
  status TEXT NOT NULL DEFAULT 'draft',       -- draft | ready | sending | sent | paused
  batch_size INT NOT NULL DEFAULT 25,        -- messages per batch when sending
  delay_seconds INT NOT NULL DEFAULT 60,     -- gap between batches (anti-spam)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- One imported lead within a campaign. `included` lets the owner pick which to
-- send to; `lead_id` links to the real leads row created if they reply.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resurrection_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES resurrection_campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT NOT NULL,                        -- E.164
  job_description TEXT,
  quote_amount NUMERIC(10,2),
  quote_date DATE,
  generated_message TEXT,
  included BOOLEAN NOT NULL DEFAULT TRUE,
  -- pending | sent | replied | booked | suppressed | failed
  status TEXT NOT NULL DEFAULT 'pending',
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sms_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resurrection_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE resurrection_recipients ENABLE ROW LEVEL SECURITY;

-- Owner-scoped policies (same pattern as leads/appointments). Edge functions use
-- the service role and bypass these; the frontend reads/updates under them.
CREATE POLICY "select_own_suppressions" ON sms_suppressions FOR SELECT
  TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "insert_own_suppressions" ON sms_suppressions FOR INSERT
  TO authenticated WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "delete_own_suppressions" ON sms_suppressions FOR DELETE
  TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "select_own_campaigns" ON resurrection_campaigns FOR SELECT
  TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "insert_own_campaigns" ON resurrection_campaigns FOR INSERT
  TO authenticated WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "update_own_campaigns" ON resurrection_campaigns FOR UPDATE
  TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "delete_own_campaigns" ON resurrection_campaigns FOR DELETE
  TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "select_own_recipients" ON resurrection_recipients FOR SELECT
  TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "insert_own_recipients" ON resurrection_recipients FOR INSERT
  TO authenticated WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "update_own_recipients" ON resurrection_recipients FOR UPDATE
  TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "delete_own_recipients" ON resurrection_recipients FOR DELETE
  TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suppressions_business_phone ON sms_suppressions(business_id, phone);
CREATE INDEX IF NOT EXISTS idx_res_campaigns_business ON resurrection_campaigns(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_res_recipients_campaign ON resurrection_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_res_recipients_business ON resurrection_recipients(business_id);

-- Keep updated_at fresh on campaigns (reuses the shared trigger fn from 001).
CREATE TRIGGER update_res_campaigns_updated_at BEFORE UPDATE ON resurrection_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
