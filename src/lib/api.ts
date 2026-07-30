import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface IncomingMessageResponse {
  success: boolean;
  lead_id: string;
  message: string;
  error?: string;
  /** Urgency the message was classified as (emergency detection). */
  urgency?: 'low' | 'normal' | 'high' | 'urgent';
  /** True when the message was classified as a genuine emergency. */
  emergency?: boolean;
  /** Short label for why it was flagged, e.g. "Possible gas leak". */
  emergency_reason?: string | null;
  /** True when an owner-alert SMS was sent for this message. */
  owner_alerted?: boolean;
  /**
   * Finer-grained alert outcome, so the UI can tell "already alerted for this
   * lead" apart from a real misconfiguration.
   */
  owner_alert_status?:
    | 'sent'
    | 'already_alerted'
    | 'no-phone'
    | 'not-configured'
    | 'send-failed'
    | 'loops-to-self'
    | 'not_emergency';
}

interface MarkBookedResponse {
  success: boolean;
  lead_id: string;
  status: string;
  error?: string;
}

/**
 * Edge functions that touch business data verify the caller's JWT, so every
 * request needs the current access token.
 */
async function authorizedFetch(path: string, body: unknown) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You need to be signed in to do that.');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  return response.json();
}

export async function sendIncomingMessage(
  phone: string,
  message: string,
  name?: string,
  source: string = 'sms'
): Promise<IncomingMessageResponse> {
  // business_id is no longer sent — the function derives it from the caller's
  // token so a lead can never be written into someone else's account.
  return (await authorizedFetch('incoming-message', {
    phone,
    message,
    name,
    source,
  })) as IncomingMessageResponse;
}

export async function markLeadBooked(
  leadId: string,
  status: string
): Promise<MarkBookedResponse> {
  return (await authorizedFetch('mark-booked', {
    lead_id: leadId,
    status,
  })) as MarkBookedResponse;
}

export async function askAssistant(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<{ response?: string; error?: string }> {
  return (await authorizedFetch('owner-assistant', { message, history })) as {
    response?: string;
    error?: string;
  };
}

export async function getDailySummary(): Promise<{ summary: string | null; error?: string }> {
  return (await authorizedFetch('daily-summary', {})) as {
    summary: string | null;
    error?: string;
  };
}
