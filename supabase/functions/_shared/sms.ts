/**
 * Shared OUTBOUND SMS.
 *
 * Sends via Telnyx (v2/messages). Replaces the earlier TNZ integration, which a
 * trial account silently blocked at the carrier ("SPAM-Sender ID Blocked").
 *
 * Provider note: the sending number is a US Telnyx number, so messages to NZ
 * mobiles are INTERNATIONAL. Telnyx support flagged that the sender ID "may be
 * modified by local NZ carriers" — i.e. the recipient may see an altered or
 * generic sender rather than our real number. That is a carrier behaviour, not
 * something the request can control, and it is exactly why a 200/"queued"
 * response must NEVER be treated as proof of delivery — confirm the real status
 * via GET https://api.telnyx.com/v2/messages/{id} or the message.finalized
 * webhook (recipient status must read "delivered", not "queued"/"sent").
 *
 * Scope note: this file is OUTBOUND only. Inbound customer SMS still arrives on
 * the Twilio number via the twilio-webhook (the auto-reply is TwiML from that
 * webhook and does NOT call sendSms). What sendSms powers: owner emergency
 * alerts (_shared/emergency.ts) and the dashboard test SMS (send-test-sms). The
 * public surface (sendSms / toE164 / smsConfigured / isPlatformNumber) is
 * unchanged, so no caller needed to change.
 */

// Outbound provider: Telnyx. Secrets live at the platform level (single-tenant).
const TELNYX_API_KEY = Deno.env.get("TELNYX_API_KEY");
// The sending number (E.164), e.g. the US Telnyx number.
const TELNYX_NUMBER = Deno.env.get("TELNYX_NUMBER");
// Optional: send from a messaging profile's number pool instead of / as well as
// a fixed `from`. One of TELNYX_NUMBER or this must be set.
const TELNYX_MESSAGING_PROFILE_ID = Deno.env.get("TELNYX_MESSAGING_PROFILE_ID");
const TELNYX_SEND_URL = "https://api.telnyx.com/v2/messages";

// Kept only for the loop guard below — inbound customer SMS is still on this
// Twilio number even though outbound now goes via Telnyx.
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

/** True when the credentials needed to send (Telnyx) are present. */
export function smsConfigured(): boolean {
  return Boolean(TELNYX_API_KEY && (TELNYX_NUMBER || TELNYX_MESSAGING_PROFILE_ID));
}

/**
 * True when `e164` is our own inbound Twilio line. Guards against sending an
 * alert to the number customers text in on: Twilio would post it to
 * twilio-webhook, which would detect "emergency" in the alert body and loop,
 * billing a message every cycle. (Inbound is still Twilio; only outbound moved.)
 */
export function isPlatformNumber(e164: string): boolean {
  return TWILIO_PHONE_NUMBER ? toE164(TWILIO_PHONE_NUMBER) === e164 : false;
}

/**
 * Normalises a phone number to E.164, defaulting to New Zealand.
 *
 * Handles the ways Kiwis actually write a mobile — all of these normalise to the
 * same E.164:
 *   "021 123 4567"        -> "+64211234567"
 *   "+64 21 123 4567"     -> "+64211234567"
 *   "+64 021 123 4567"    -> "+64211234567"   (trunk 0 after +64 stripped)
 *   "64 21 123 4567"      -> "+64211234567"
 *   "0064 21 123 4567"    -> "+64211234567"
 * A non-NZ "+cc…" number keeps its own country code (e.g. "+61…").
 *
 * The rule that matters: an NZ national trunk "0" must NEVER be left sitting
 * after the +64 country code. (Left tested + unchanged across provider swaps.)
 */
export function toE164(raw: string): string {
  const trimmed = (raw || "").trim();
  const hadPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");

  // "00" is the international access prefix — treat it like a leading "+".
  let international = hadPlus;
  if (digits.startsWith("00")) {
    international = true;
    digits = digits.slice(2);
  }

  // A country-coded NZ number, however it arrived: strip any trunk 0 left after
  // the "64" so we never emit +640…
  if (digits.startsWith("64")) {
    return "+64" + digits.slice(2).replace(/^0+/, "");
  }

  // An explicit "+cc" that isn't NZ keeps its own country code untouched.
  if (international) {
    return "+" + digits;
  }

  // Bare national NZ number: drop the trunk 0(s) and prepend the country code.
  return "+64" + digits.replace(/^0+/, "");
}

export interface SmsResult {
  success: boolean;
  /**
   * Provider message id on ACCEPTANCE (Telnyx message UUID). NOTE: acceptance is
   * not delivery — use this id with GET /v2/messages/{id} (or the
   * message.finalized webhook) to confirm the recipient status is "delivered".
   */
  sid?: string;
  /** Failure code — the provider HTTP status (e.g. 400 bad request, 401 auth). */
  code?: number;
  /** Raw error message for logging — not necessarily user-facing. */
  error?: string;
}

/**
 * Sends one SMS via Telnyx. Caller is responsible for E.164-normalising `to`
 * (use toE164). Never throws — returns a structured result so callers (often in
 * the hot path of a customer reply) can decide what to do without a try/catch.
 *
 * IMPORTANT: a successful result means Telnyx ACCEPTED the message (status
 * "queued"), NOT that it was delivered. Delivery to NZ from a US number is not
 * guaranteed and the sender may be altered by NZ carriers — always confirm the
 * real delivery status out of band.
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!smsConfigured()) {
    // No `code` set → callers treat this as "not configured" rather than a
    // provider send failure.
    return {
      success: false,
      error: "Telnyx is not configured (TELNYX_API_KEY and TELNYX_NUMBER/TELNYX_MESSAGING_PROFILE_ID required)",
    };
  }

  const payload: Record<string, unknown> = {
    to, // E.164
    text: body,
    ...(TELNYX_NUMBER ? { from: TELNYX_NUMBER } : {}),
    ...(TELNYX_MESSAGING_PROFILE_ID ? { messaging_profile_id: TELNYX_MESSAGING_PROFILE_ID } : {}),
  };

  try {
    const response = await fetch(TELNYX_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TELNYX_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    let data: Record<string, unknown> | null = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // Non-JSON body; `raw` is kept for the error path below.
    }

    if (!response.ok) {
      // Telnyx errors come back as { errors: [{ code, title, detail }] }.
      const errs = (data?.errors ?? null) as Array<Record<string, unknown>> | null;
      const message = Array.isArray(errs) && errs.length
        ? errs.map((e) => e.detail ?? e.title ?? JSON.stringify(e)).join("; ")
        : raw || `HTTP ${response.status}`;
      console.error(`[telnyx] send error (HTTP ${response.status}):`, message);
      return { success: false, code: response.status, error: message };
    }

    const msg = (data?.data ?? {}) as Record<string, unknown>;
    const id = msg.id != null ? String(msg.id) : undefined;
    const recipients = (msg.to ?? []) as Array<Record<string, unknown>>;
    const acceptedStatus = Array.isArray(recipients) && recipients.length
      ? String(recipients[0].status ?? "queued")
      : "queued";
    // Log the id + the ACCEPTANCE status, and make the acceptance≠delivery
    // distinction explicit so a "queued"/"sent" is never mistaken for delivered.
    console.log(
      `[telnyx] accepted (id ${id}, status ${acceptedStatus}) — this is acceptance, NOT delivery; ` +
      `confirm via GET /v2/messages/${id} (status must read "delivered")`,
    );
    return { success: true, sid: id };
  } catch (error) {
    console.error("[telnyx] send threw:", error);
    return { success: false, error: String(error) };
  }
}
