export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  industry: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;
  website: string | null;
  logo_url: string | null;
  timezone: string;
  business_hours: BusinessHours;
  settings: Record<string, unknown>;
  ai_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  monday: DayHours | null;
  tuesday: DayHours | null;
  wednesday: DayHours | null;
  thursday: DayHours | null;
  friday: DayHours | null;
  saturday: DayHours | null;
  sunday: DayHours | null;
}

export interface DayHours {
  start: string;
  end: string;
}

export interface Lead {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  service_needed: string | null;
  budget: string | null;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  status: 'new' | 'contacted' | 'qualified' | 'quoted' | 'negotiating' | 'converted' | 'lost';
  source: string;
  notes: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  estimated_value: number | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  ai_score: number;
  ai_probability: number | null;
  converted_at: string | null;
  last_message: string | null;
  /** Flagged when an inbound message shows clear frustration / churn risk. */
  frustrated?: boolean;
  /** Short label for why, e.g. "Explicit dissatisfaction". */
  frustration_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MissedCall {
  id: string;
  business_id: string;
  caller_phone: string;
  caller_name: string | null;
  called_at: string;
  recovered: boolean;
  lead_id: string | null;
  sms_sent: boolean;
  sms_sent_at: string | null;
  response_received: boolean;
  response_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  lead_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  service_type: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  confirmation_sent: boolean;
  reminder_sent: boolean;
  estimated_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface AIAction {
  id: string;
  business_id: string;
  type: 'follow_up' | 'reminder' | 'lead_qualification' | 'appointment_booking' | 'general' | 'revenue';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action_data: Record<string, unknown>;
  status: 'pending' | 'executed' | 'dismissed';
  executed_at: string | null;
  executed_by: string | null;
  result: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  business_id: string;
  user_id: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Subscription {
  id: string;
  business_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_name: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface IndustryTemplate {
  id: string;
  industry: string;
  name: string;
  services: string[];
  common_issues: string[];
  qualification_questions: string[];
  sms_templates: Record<string, string>;
  created_at: string;
}

export interface AIConversation {
  id: string;
  business_id: string;
  lead_id: string | null;
  channel: string;
  messages: ChatMessage[];
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface DailyMetrics {
  id: string;
  business_id: string;
  date: string;
  leads_received: number;
  leads_converted: number;
  appointments_booked: number;
  missed_calls: number;
  calls_recovered: number;
  revenue_recovered: number;
  messages_sent: number;
  response_time_avg: number | null;
  created_at: string;
}

export interface AIReport {
  enquiries_replied: number;
  missed_calls_recovered: number;
  appointments_booked: number;
  leads_followed_up: number;
  revenue_generated: number;
  greeting: string;
}

export interface PricingPlan {
  name: string;
  price: number;
  annualPrice: number;
  features: string[];
  highlighted?: boolean;
  priceId?: string;
  annualPriceId?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Starter',
    price: 49,
    annualPrice: 39,
    features: [
      'Up to 50 leads/month',
      'Missed call recovery',
      'AI follow-up messages',
      'Basic appointment booking',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    price: 99,
    annualPrice: 79,
    features: [
      'Up to 200 leads/month',
      'Everything in Starter',
      'AI lead qualification',
      'Smart recommendations',
      'Priority support',
      'Weekly AI reports',
    ],
    highlighted: true,
  },
  {
    name: 'Business',
    price: 199,
    annualPrice: 159,
    features: [
      'Unlimited leads',
      'Everything in Professional',
      'Full AI assistant',
      'Custom workflows',
      'API access',
      'Dedicated support',
    ],
  },
];

export const INDUSTRIES = [
  { value: 'electrician', label: 'Electrician', icon: 'Zap' },
  { value: 'plumber', label: 'Plumber', icon: 'Droplets' },
  { value: 'builder', label: 'Builder', icon: 'Hammer' },
  { value: 'mechanic', label: 'Mechanic', icon: 'Wrench' },
  { value: 'landscaper', label: 'Landscaper', icon: 'TreePine' },
  { value: 'hvac', label: 'HVAC', icon: 'Thermometer' },
  { value: 'other', label: 'Other', icon: 'Briefcase' },
] as const;

export type IndustryType = typeof INDUSTRIES[number]['value'];
