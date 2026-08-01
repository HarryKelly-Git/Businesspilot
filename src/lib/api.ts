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
  /** True when the message showed clear frustration / churn risk. */
  frustrated?: boolean;
  /** Short label for why it was flagged, e.g. "Explicit dissatisfaction". */
  frustration_reason?: string | null;
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

// ---- Ghost Lead Resurrector ------------------------------------------------

export interface RawResurrectionRow {
  name?: string;
  phone?: string;
  job_description?: string;
  quote_amount?: string;
  quote_date?: string;
}

export interface ResurrectionImportResult {
  success?: boolean;
  campaign_id?: string;
  imported?: number;
  suppressed?: number;
  skipped?: Array<{ name: string; phone: string; reason: string }>;
  error?: string;
}

export async function importResurrectionLeads(payload: {
  name: string;
  angle: string;
  custom_message?: string;
  recipients: RawResurrectionRow[];
  confirmed: boolean;
}): Promise<ResurrectionImportResult> {
  return (await authorizedFetch('resurrection-import', payload)) as ResurrectionImportResult;
}

export interface ResurrectionPreviewMessage {
  id: string;
  name: string | null;
  phone: string;
  message: string | null;
}

export async function generateResurrectionMessages(
  campaignId: string,
  limit?: number
): Promise<{ messages?: ResurrectionPreviewMessage[]; error?: string }> {
  return (await authorizedFetch('resurrection-generate', {
    campaign_id: campaignId,
    limit,
  })) as { messages?: ResurrectionPreviewMessage[]; error?: string };
}

// ---- Reputation Loop (review requests) -------------------------------------

export interface ReviewClassifyResult {
  sentiment?: 'positive' | 'negative' | 'mixed';
  followup_message?: string;
  review_link_prepared?: boolean;
  owner_alert_prepared?: boolean;
  owner_alert_message?: string | null;
  error?: string;
}

/**
 * Classify a customer's reply to a review request with Claude Haiku and prepare
 * the branched follow-up. Nothing is sent — sending stays disabled pending TNZ.
 */
export async function classifyReviewReply(
  reviewRequestId: string,
  replyText: string
): Promise<ReviewClassifyResult> {
  return (await authorizedFetch('review-classify', {
    review_request_id: reviewRequestId,
    reply_text: replyText,
  })) as ReviewClassifyResult;
}
