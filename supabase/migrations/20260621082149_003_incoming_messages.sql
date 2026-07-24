-- Add incoming_messages table for tracking raw SMS/web messages
CREATE TABLE incoming_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  phone TEXT NOT NULL,
  name TEXT,
  message TEXT NOT NULL,
  source TEXT DEFAULT 'sms',
  processed BOOLEAN DEFAULT false,
  ai_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add last_message column to leads for quick preview
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_message TEXT;

-- Enable RLS
ALTER TABLE incoming_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incoming_messages
CREATE POLICY "select_business_messages" ON incoming_messages FOR SELECT
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "insert_business_messages" ON incoming_messages FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- Create index for faster queries
CREATE INDEX idx_incoming_messages_business ON incoming_messages(business_id);
CREATE INDEX idx_incoming_messages_phone ON incoming_messages(phone);
CREATE INDEX idx_leads_business_created ON leads(business_id, created_at DESC);