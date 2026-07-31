/**
 * Shared outbound SMS via Twilio's REST API. Extracted from send-test-sms so the
 * same sender powers test messages, emergency owner-alerts, and (later) booking
 * confirmations — one place that knows how to talk to Twilio and normalise NZ
 * numbers.
 */

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

/** True when the Twilio credentials needed to send are all present. */
export function smsConfigured(): boolean {
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
}

/**
 * True when `e164` is this platform's own inbound Twilio number. Guards against
 * texting the line customers text in on — that message would loop straight back
 * through twilio-webhook and bill an SMS on every cycle.
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
 * after the +64 country code. The old code did exactly that for "+64 0…" input,
 * producing e.g. +640288517… — an invalid number that Twilio rejected as
 * unverified, which is why owner-alert SMS never arrived.
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
  /** Twilio message SID on success. */
  sid?: string;
  /** Twilio error code (e.g. 21211 invalid number, 21608 unverified in trial). */
  code?: number;
  /** Raw error message for logging — not necessarily user-facing. */
  error?: string;
}

/**
 * Sends one SMS. Caller is responsible for E.164-normalising `to` (use toE164).
 * Never throws — returns a structured result so callers (which are often in the
 * hot path of a customer reply) can decide what to do without a try/catch.
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!smsConfigured()) {
    return { success: false, error: "Twilio is not configured" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const form = new URLSearchParams();
  form.append("To", to);
  form.append("From", TWILIO_PHONE_NUMBER!);
  form.append("Body", body);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio send error:", data);
      return { success: false, code: data.code, error: data.message || "Twilio error" };
    }

    return { success: true, sid: data.sid };
  } catch (error) {
    console.error("Twilio send threw:", error);
    return { success: false, error: String(error) };
  }
}
