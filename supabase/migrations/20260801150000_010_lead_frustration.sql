-- Frustrated-customer detection. Alongside the existing emergency/urgency
-- classifier (which stays regex-based — the reliable floor documented in
-- _shared/emergency.ts), inbound messages are now also checked for clear signs a
-- customer is frustrated or at risk of walking away. When flagged, the owner
-- alert is PREPARED but not sent (sending stays disabled pending TNZ).

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS frustrated BOOLEAN NOT NULL DEFAULT FALSE,
  -- short label for why, e.g. "Explicit dissatisfaction" — drives the Leads badge
  ADD COLUMN IF NOT EXISTS frustration_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_frustrated ON leads(business_id, frustrated);
