import type { Lead, Appointment } from '../types';

/**
 * Sample data shown to brand-new accounts so the dashboard demonstrates what a
 * working week looks like instead of a wall of zeros.
 *
 * Every record carries `isSample: true` and is rendered with a visible "Sample"
 * badge. It is never written to the database and disappears the moment the user
 * dismisses the banner, or after 7 days, or as soon as a single real lead
 * arrives — whichever comes first.
 */
export interface SampleFlag {
  isSample: true;
}

export type SampleLead = Lead & SampleFlag;
export type SampleAppointment = Appointment & SampleFlag;

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const daysAhead = (d: number) =>
  new Date(Date.now() + d * 86_400_000).toISOString().split('T')[0];

export const SAMPLE_REVENUE_RECOVERED = 480;

export const sampleLeads: SampleLead[] = [
  {
    id: 'sample-lead-1',
    business_id: 'sample',
    name: 'Sarah Thompson',
    email: null,
    phone: '+64 21 555 0142',
    service_needed: 'Hot water cylinder leaking',
    budget: null,
    urgency: 'urgent',
    status: 'new',
    source: 'sms',
    notes: null,
    preferred_date: null,
    preferred_time: null,
    estimated_value: 480,
    last_contacted_at: hoursAgo(2),
    next_follow_up_at: null,
    ai_score: 88,
    ai_probability: 88,
    converted_at: null,
    last_message: 'Hi, just tried calling — water everywhere in the garage!',
    created_at: hoursAgo(2),
    updated_at: hoursAgo(2),
  } as SampleLead,
  {
    id: 'sample-lead-2',
    business_id: 'sample',
    name: 'Mike Chen',
    email: null,
    phone: '+64 27 555 0198',
    service_needed: 'Quote — new outdoor lighting',
    budget: null,
    urgency: 'normal',
    status: 'contacted',
    source: 'sms',
    notes: null,
    preferred_date: null,
    preferred_time: null,
    estimated_value: 350,
    last_contacted_at: hoursAgo(19),
    next_follow_up_at: null,
    ai_score: 61,
    ai_probability: 61,
    converted_at: null,
    last_message: 'Sounds good, can you do next Tuesday?',
    created_at: hoursAgo(26),
    updated_at: hoursAgo(19),
  } as SampleLead,
  {
    id: 'sample-lead-3',
    business_id: 'sample',
    name: 'Priya Nair',
    email: null,
    phone: '+64 22 555 0173',
    service_needed: 'Switchboard upgrade',
    budget: null,
    urgency: 'normal',
    status: 'converted',
    source: 'sms',
    notes: null,
    preferred_date: null,
    preferred_time: null,
    estimated_value: 480,
    last_contacted_at: hoursAgo(50),
    next_follow_up_at: null,
    ai_score: 95,
    ai_probability: 95,
    converted_at: hoursAgo(48),
    last_message: 'Perfect, see you then. Thanks!',
    created_at: hoursAgo(72),
    updated_at: hoursAgo(48),
  } as SampleLead,
];

export const sampleAppointments: SampleAppointment[] = [
  {
    id: 'sample-appt-1',
    business_id: 'sample',
    lead_id: 'sample-lead-3',
    customer_name: 'Priya Nair',
    customer_email: null,
    customer_phone: '+64 22 555 0173',
    service_type: 'Switchboard upgrade',
    scheduled_date: daysAhead(1),
    scheduled_time: '08:00',
    duration_minutes: 120,
    status: 'scheduled',
    notes: null,
    confirmation_sent: true,
    reminder_sent: false,
    estimated_value: 480,
    created_at: hoursAgo(48),
    updated_at: hoursAgo(48),
  } as SampleAppointment,
];

export interface SampleActivity {
  id: string;
  text: string;
  time: string;
}

export const sampleActivity: SampleActivity[] = [
  { id: 'a1', text: 'Replied to a missed call from +64 21 555 0142', time: '4 minutes ago' },
  { id: 'a2', text: 'Booked a job for tomorrow, 8:00am', time: '12 minutes ago' },
  { id: 'a3', text: 'Sent a follow-up to an unanswered lead', time: '1 hour ago' },
];

/** Sample data is suppressed after this many days regardless of dismissal. */
export const SAMPLE_DATA_MAX_AGE_DAYS = 7;

export function shouldShowSampleData(
  business: { created_at?: string; sample_data_dismissed_at?: string | null } | null,
  hasRealLeads: boolean
): boolean {
  if (!business) return false;
  if (hasRealLeads) return false;
  if (business.sample_data_dismissed_at) return false;

  if (business.created_at) {
    const ageDays = (Date.now() - new Date(business.created_at).getTime()) / 86_400_000;
    if (ageDays > SAMPLE_DATA_MAX_AGE_DAYS) return false;
  }

  return true;
}
