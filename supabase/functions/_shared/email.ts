/**
 * Shared transactional email via Resend. Powers the daily-summary email and any
 * future owner emails — one place that knows how to talk to Resend.
 *
 * SENDING DOMAIN — future step: we currently send from Resend's shared
 * `onboarding@resend.dev`, which is fine for testing on your own account but is
 * NOT suitable for real customers (deliverability + it isn't your brand). Before
 * customers rely on this, verify thebusinesspilot.com as a sending domain in
 * Resend and set RESEND_FROM to e.g. "BusinessPilot <hello@thebusinesspilot.com>".
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "BusinessPilot <onboarding@resend.dev>";

/** True when the Resend credentials needed to send are present. */
export function emailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/** Sends one email via Resend. Never throws — returns a structured result. */
export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    return { success: false, error: "Resend is not configured (RESEND_API_KEY missing)" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("Resend send error:", data);
      return { success: false, error: (data && (data.message || data.name)) || `HTTP ${res.status}` };
    }
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Resend send threw:", error);
    return { success: false, error: String(error) };
  }
}
