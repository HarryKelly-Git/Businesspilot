/**
 * SMS opt-out / suppression — NZ Unsolicited Electronic Messages Act 2007.
 *
 * Every outbound message advertises "Reply STOP to opt out". This module is the
 * other half of that promise: it detects an inbound opt-out, records it, and is
 * consulted before customer-facing sends so an opted-out number is never texted
 * again.
 *
 * The suppression list itself is the `sms_suppressions` table (migration 007):
 *   (business_id, phone[E.164], reason, created_at) with UNIQUE(business_id, phone).
 * Suppression is per-business, matching how the Ghost Lead import already reads
 * it. All helpers normalise the number to E.164 (via toE164) so a match never
 * hinges on formatting.
 *
 * Enforcement is per call-site by design — there is no single outbound chokepoint
 * in the system (the main customer reply goes out as TwiML from twilio-webhook,
 * NOT via sendSms), so each real send path checks isSuppressed itself. Owner
 * emergency alerts are deliberately EXEMPT: they go to the business owner's own
 * phone (a transactional safety message they configured), not to a customer.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { toE164 } from "./sms.ts";

export type OptOutIntent = "stop" | "start" | null;

/**
 * Reduce a message to a bare command for exact-match keyword testing:
 * lowercased, punctuation/emoji/digits dropped, inner whitespace collapsed.
 *
 * Exact match (whole message equals a keyword) is deliberate and load-bearing:
 * a substring test would misread "please stop the leak" as an opt-out and
 * "cancel my appointment" as an unsubscribe. Only a message that IS the command
 * counts — which is exactly how customers (and carriers) send STOP.
 */
function normalizeCommand(body: string): string {
  return (body || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Standard carrier opt-out keywords plus the polite variants people actually
// send. Matched only as a WHOLE normalised message (see normalizeCommand).
const STOP_COMMANDS = new Set<string>([
  "stop", "stopall", "stop all",
  "unsubscribe", "unsub", "unsubscribe me", "please unsubscribe",
  "cancel", "end", "quit",
  "optout", "opt out", "opt me out",
  "remove", "remove me",
  "stop please", "please stop",
  "no more messages", "no more texts",
]);

const START_COMMANDS = new Set<string>([
  "start", "unstop", "resubscribe", "subscribe", "start please",
]);

/**
 * Classifies a raw inbound message as an opt-out ("stop"), opt-back-in
 * ("start"), or neither (null). Conservative on purpose — see normalizeCommand.
 */
export function detectOptOutIntent(body: string): OptOutIntent {
  const cmd = normalizeCommand(body);
  if (!cmd) return null;
  if (STOP_COMMANDS.has(cmd)) return "stop";
  if (START_COMMANDS.has(cmd)) return "start";
  return null;
}

/**
 * True when `phone` has opted out for this business.
 *
 * Fail-open on a DB error (returns false + logs loudly): a transient read
 * failure must not silently mute a SOLICITED reply to a customer who just texted
 * in. Bulk marketing sends (e.g. a future Ghost Lead send step) should treat
 * uncertainty as "skip" at their own call site, where silence is the safe default.
 */
export async function isSuppressed(
  admin: SupabaseClient,
  businessId: string,
  phone: string,
): Promise<boolean> {
  const e164 = toE164(phone);
  const { data, error } = await admin
    .from("sms_suppressions")
    .select("id")
    .eq("business_id", businessId)
    .eq("phone", e164)
    .maybeSingle();

  if (error) {
    console.error(`[suppression] lookup failed for ${businessId}/${e164}: ${error.message}`);
    return false;
  }
  return Boolean(data);
}

/**
 * Adds `phone` to the business's suppression list. Idempotent — a repeated STOP
 * keeps the original opt-out date rather than resetting it. Returns success.
 */
export async function addSuppression(
  admin: SupabaseClient,
  businessId: string,
  phone: string,
  reason = "stop_reply",
): Promise<boolean> {
  const e164 = toE164(phone);
  const { error } = await admin
    .from("sms_suppressions")
    .upsert(
      { business_id: businessId, phone: e164, reason },
      { onConflict: "business_id,phone", ignoreDuplicates: true },
    );

  if (error) {
    console.error(`[suppression] add failed for ${businessId}/${e164}: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Removes `phone` from the business's suppression list (a START / resubscribe).
 * A no-op delete (number wasn't suppressed) is treated as success.
 */
export async function removeSuppression(
  admin: SupabaseClient,
  businessId: string,
  phone: string,
): Promise<boolean> {
  const e164 = toE164(phone);
  const { error } = await admin
    .from("sms_suppressions")
    .delete()
    .eq("business_id", businessId)
    .eq("phone", e164);

  if (error) {
    console.error(`[suppression] remove failed for ${businessId}/${e164}: ${error.message}`);
    return false;
  }
  return true;
}
