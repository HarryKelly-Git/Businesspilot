-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Businesses table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'USA',
  website TEXT,
  logo_url TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  business_hours JSONB DEFAULT '{"monday":{"start":"08:00","end":"18:00"},"tuesday":{"start":"08:00","end":"18:00"},"wednesday":{"start":"08:00","end":"18:00"},"thursday":{"start":"08:00","end":"18:00"},"friday":{"start":"08:00","end":"18:00"},"saturday":{"start":"09:00","end":"14:00"},"sunday":null}',
  settings JSONB DEFAULT '{}',
  ai_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  service_needed TEXT,
  budget TEXT,
  urgency TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'new',
  source TEXT DEFAULT 'manual',
  notes TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  estimated_value DECIMAL(10,2),
  last_contacted_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  ai_score INTEGER DEFAULT 0,
  ai_probability DECIMAL(5,2),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Missed calls table
CREATE TABLE missed_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  caller_phone TEXT NOT NULL,
  caller_name TEXT,
  called_at TIMESTAMPTZ DEFAULT NOW(),
  recovered BOOLEAN DEFAULT false,
  lead_id UUID REFERENCES leads(id),
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMPTZ,
  response_received BOOLEAN DEFAULT false,
  response_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  service_type TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  confirmation_sent BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  estimated_value DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Actions/Recommendations table
CREATE TABLE ai_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  action_data JSONB,
  status TEXT DEFAULT 'pending',
  executed_at TIMESTAMPTZ,
  executed_by UUID REFERENCES profiles(id),
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log table
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table (Stripe)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  plan_name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Industry templates table
CREATE TABLE industry_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  industry TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  services TEXT[] NOT NULL,
  common_issues TEXT[],
  qualification_questions TEXT[],
  sms_templates JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI conversations table
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  channel TEXT DEFAULT 'web',
  messages JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily metrics table (for reporting)
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  leads_received INTEGER DEFAULT 0,
  leads_converted INTEGER DEFAULT 0,
  appointments_booked INTEGER DEFAULT 0,
  missed_calls INTEGER DEFAULT 0,
  calls_recovered INTEGER DEFAULT 0,
  revenue_recovered DECIMAL(10,2) DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  response_time_avg INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, date)
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE missed_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- RLS Policies for businesses
CREATE POLICY "select_own_businesses" ON businesses FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "insert_own_businesses" ON businesses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_businesses" ON businesses FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete_own_businesses" ON businesses FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- RLS Policies for leads
CREATE POLICY "select_business_leads" ON leads FOR SELECT
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "insert_business_leads" ON leads FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "update_business_leads" ON leads FOR UPDATE
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  ) WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "delete_business_leads" ON leads FOR DELETE
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- RLS Policies for missed_calls
CREATE POLICY "select_business_missed_calls" ON missed_calls FOR SELECT
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "insert_business_missed_calls" ON missed_calls FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "update_business_missed_calls" ON missed_calls FOR UPDATE
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- RLS Policies for appointments
CREATE POLICY "select_business_appointments" ON appointments FOR SELECT
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "insert_business_appointments" ON appointments FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "update_business_appointments" ON appointments FOR UPDATE
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "delete_business_appointments" ON appointments FOR DELETE
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- RLS Policies for ai_actions
CREATE POLICY "select_business_ai_actions" ON ai_actions FOR SELECT
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "insert_business_ai_actions" ON ai_actions FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "update_business_ai_actions" ON ai_actions FOR UPDATE
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- RLS Policies for activity_log
CREATE POLICY "select_business_activity" ON activity_log FOR SELECT
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "insert_business_activity" ON activity_log FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- RLS Policies for subscriptions
CREATE POLICY "select_own_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "insert_own_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "update_own_subscriptions" ON subscriptions FOR UPDATE
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- RLS Policies for ai_conversations
CREATE POLICY "select_business_conversations" ON ai_conversations FOR SELECT
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "insert_business_conversations" ON ai_conversations FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "update_business_conversations" ON ai_conversations FOR UPDATE
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- RLS Policies for daily_metrics
CREATE POLICY "select_business_metrics" ON daily_metrics FOR SELECT
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "insert_business_metrics" ON daily_metrics FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY "update_business_metrics" ON daily_metrics FOR UPDATE
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- Industry templates are readable by all authenticated users
CREATE POLICY "select_industry_templates" ON industry_templates FOR SELECT
  TO authenticated USING (true);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for performance
CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_leads_business ON leads(business_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_appointments_business ON appointments(business_id);
CREATE INDEX idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX idx_missed_calls_business ON missed_calls(business_id);
CREATE INDEX idx_missed_calls_recovered ON missed_calls(recovered);
CREATE INDEX idx_ai_actions_business ON ai_actions(business_id);
CREATE INDEX idx_ai_actions_status ON ai_actions(status);
CREATE INDEX idx_daily_metrics_business_date ON daily_metrics(business_id, date);
CREATE INDEX idx_subscriptions_business ON subscriptions(business_id);
CREATE INDEX idx_activity_log_business ON activity_log(business_id);