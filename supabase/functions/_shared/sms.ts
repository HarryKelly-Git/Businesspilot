/**
 * Shared OUTBOUND SMS.
 *
 * Sends via TNZ (smsapi.nz) — a New Zealand CPaaS with no trial/verified-number
 * restriction. This replaces Twilio's REST API for OUTBOUND messages: Twilio's
 * trial account could only text manually-verified numbers (error 21608), so it
 * could never reach real customers or the owner's alert phone in production.
 *
 * Scope note (important): this file is OUTBOUND only. Inbound customer SMS still
 * arrives on the Twilio number via the twilio-webhook, and the customer
 * auto-reply is still returned to Twilio as TwiML from that same webhook — a
 * separate path that does NOT call sendSms. What sendSms powers today: owner
 * emergency-alerts (_shared/emergency.ts) and the dashboard test SMS
 * (send-test-sms). The public surface below (sendSms / toE164 / smsConfigured /
 * isPlatformNumber) is unchanged, so no caller needed to change.
 */

// Outbound provider: TNZ. The AuthToken is generated in the TNZ dashboard.
const TNZ_AUTH_TOKEN = Deno.env.get("TNZ_AUTH_TOKEN");
// Optional sender id / number. TNZ uses the account default sender when unset.
const TNZ_SENDER = Deno.env.get("TNZ_SENDER");
const TNZ_SEND_SMS_URL = "https://api.tnz.co.nz/api/v2.04/send/sms";

// Kept only for the loop guard below — inbound customer SMS is still on this
// Twilio number even though outbound now goes via TNZ.
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

/** True when the credentials needed to send (TNZ) are present. */
export function smsConfigured(): boolean {
  return Boolean(TNZ_AUTH_TOKEN);
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
 * after the +64 country code. (Left tested + unchanged — the previous provider
 * migration did not touch this.)
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
  /** Provider message id on success (TNZ MessageID). */
  sid?: string;
  /** Failure code — the provider HTTP status (e.g. 400 bad request, 401 auth). */
  code?: number;
  /** Raw error message for logging — not necessarily user-facing. */
  error?: string;
}

/**
 * Sends one SMS via TNZ. Caller is responsible for E.164-normalising `to`
 * (use toE164). Never throws — returns a structured result so callers (often in
 * the hot path of a customer reply) can decide what to do without a try/catch.
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!TNZ_AUTH_TOKEN) {
    // No `code` set → callers treat this as "not configured" rather than a
    // provider send failure.
    return { success: false, error: "TNZ is not configured (TNZ_AUTH_TOKEN missing)" };
  }

  const payload = {
    MessageData: {
      Message: body,
      Destinations: [{ Recipient: to }],
      // "Live" actually delivers; "Test" validates without sending. Not listed
      // in the v2.04 field table but harmless if ignored, and it guards against
      // a "Test" default silently swallowing a real send.
      SendMode: "Live",
      // Per the v2.04 docs the sender field is "FromNumber" (was "From", which
      // TNZ would ignore → sends fell back to the account default sender).
      ...(TNZ_SENDER ? { FromNumber: TNZ_SENDER } : {}),
    },
  };

  try {
    // TNZ v2.04 REST: the Authorization header is the dashboard-issued AuthToken
    // (a JWT) prefixed with the "Basic " scheme — their docs show
    // `Authorization: Basic eyJ...`. (An earlier version sent the raw token with
    // no prefix, which 401s.) Accept the secret whether or not it was stored
    // with a scheme already, so a "Basic …"/"Bearer …" value also works.
    const authHeader = /^(Basic|Bearer)\s/i.test(TNZ_AUTH_TOKEN)
      ? TNZ_AUTH_TOKEN
      : `Basic ${TNZ_AUTH_TOKEN}`;

    const response = await fetch(TNZ_SEND_SMS_URL, {
      method: "POST",
      headers: {
        Authorization: authHeader,
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
      // TNZ returned a non-JSON body; `raw` is kept for the error path below.
    }

    if (!response.ok) {
      const em = (data?.ErrorMessage ?? null) as unknown;
      const message = Array.isArray(em)
        ? em.join("; ")
        : typeof em === "string"
          ? em
          : raw || `HTTP ${response.status}`;
      // Log status + body so a wrong auth-header format (401) or bad field name
      // is obvious on the very first real test, not a silent failure.
      console.error(`TNZ send error (HTTP ${response.status}):`, message);
      return { success: false, code: response.status, error: message };
    }

    const messageId = (data?.MessageID ?? data?.Result) as unknown;
    return { success: true, sid: messageId != null ? String(messageId) : undefined };
  } catch (error) {
    console.error("TNZ send threw:", error);
    return { success: false, error: String(error) };
  }
}
