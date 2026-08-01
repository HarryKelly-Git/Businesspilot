import { supabase } from './supabase';
import type { Business, Appointment } from '../types';

/**
 * Reputation Loop shared logic. The row this schedules is the "prepared" review
 * request; the actual SMS send stays disabled until TNZ is live (same pattern as
 * the Ghost Lead Resurrector).
 */

export interface ReviewRequest {
  id: string;
  business_id: string;
  appointment_id: string;
  lead_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  service_type: string | null;
  ask_message: string | null;
  scheduled_for: string;
  status: 'scheduled' | 'prepared' | 'sent' | 'replied' | 'skipped';
  sent_at: string | null;
  reply_text: string | null;
  replied_at: string | null;
  sentiment: 'positive' | 'negative' | 'mixed' | null;
  followup_message: string | null;
  review_link_sent: boolean;
  owner_alert_prepared: boolean;
  owner_alert_message: string | null;
  created_at: string;
  updated_at: string;
}

/** The loop only runs once the owner turns it ON *and* saves a review link. */
export function reviewsEnabled(settings: Record<string, unknown> | null | undefined): boolean {
  const s = settings ?? {};
  return (
    s.autoRequestReviews === true &&
    typeof s.googleReviewLink === 'string' &&
    (s.googleReviewLink as string).trim().length > 0
  );
}

/** Configured hours to wait after completion before asking. Defaults to 2. */
export function reviewDelayHours(settings: Record<string, unknown> | null | undefined): number {
  const raw = Number((settings ?? {}).reviewRequestDelayHours);
  return Number.isFinite(raw) && raw >= 0 ? raw : 2;
}

/** The "how did the job go?" ask. Templated (no AI) and compliance-safe. */
export function buildReviewAskMessage(
  businessName: string,
  customerName: string | null,
  service: string | null
): string {
  const first = (customerName || '').trim().split(/\s+/)[0] || 'there';
  const job = service ? ` with your ${service}` : '';
  return `Hi ${first}, thanks for choosing ${businessName}! How did everything go${job}? We'd love a quick bit of feedback. Reply STOP to opt out.`;
}

/**
 * Called when an appointment flips to 'completed'. If the Reputation Loop is on
 * and a review link is saved, schedule a request for `now + delay hours`.
 *
 * Idempotent per appointment (UNIQUE appointment_id + ignoreDuplicates), so
 * re-completing an appointment never duplicates or clobbers an existing request.
 * NEVER throws — a failure here must not break the status change the user made.
 */
export async function scheduleReviewRequestOnCompletion(
  business: Pick<Business, 'id' | 'name' | 'settings'>,
  appointment: Pick<
    Appointment,
    'id' | 'lead_id' | 'customer_name' | 'customer_phone' | 'service_type'
  >
): Promise<void> {
  try {
    if (!reviewsEnabled(business.settings)) return;
    // We need a number to (eventually) send to. No phone => nothing to schedule.
    if (!appointment.customer_phone) return;

    const scheduledFor = new Date(
      Date.now() + reviewDelayHours(business.settings) * 3_600_000
    ).toISOString();

    await supabase.from('review_requests').upsert(
      {
        business_id: business.id,
        appointment_id: appointment.id,
        lead_id: appointment.lead_id ?? null,
        customer_name: appointment.customer_name ?? null,
        customer_phone: appointment.customer_phone ?? null,
        service_type: appointment.service_type ?? null,
        ask_message: buildReviewAskMessage(
          business.name,
          appointment.customer_name,
          appointment.service_type
        ),
        scheduled_for: scheduledFor,
        status: 'scheduled',
      },
      { onConflict: 'appointment_id', ignoreDuplicates: true }
    );
  } catch (err) {
    console.error('scheduleReviewRequestOnCompletion failed:', err);
  }
}
