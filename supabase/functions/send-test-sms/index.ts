import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, getAuthenticatedUserId, json } from "../_shared/auth.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

/**
 * Normalises to E.164, defaulting to New Zealand.
 * "021 123 4567" -> "+64211234567", "+61..." is left alone.
 */
function toE164(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    return "+" + trimmed.slice(1).replace(/\D/g, "");
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("64")) return "+" + digits;
  if (digits.startsWith("0")) return "+64" + digits.slice(1);
  return "+64" + digits;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // This endpoint spends money on the operator's Twilio account. Unauthenticated,
    // it was an open SMS relay to any number in the world.
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { phone, businessName } = await req.json();

    if (!phone) {
      return json({ error: "Phone number is required" }, 400);
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return json({
        success: false,
        error: "SMS is not switched on for your account yet. Contact support and we'll enable it.",
      });
    }

    const formattedPhone = toE164(phone);

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const message =
      `Hi! This is BusinessPilot${businessName ? ` for ${businessName}` : ""}. ` +
      `This is how fast your customers will hear back from you, day or night. Reply STOP to opt out.`;

    const formData = new URLSearchParams();
    formData.append("To", formattedPhone);
    formData.append("From", TWILIO_PHONE_NUMBER);
    formData.append("Body", message);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio error:", data);

      if (data.code === 21211) {
        return json({
          success: false,
          error: "That doesn't look like a valid mobile number. Please check and try again.",
        });
      }

      if (data.code === 21608) {
        return json({
          success: false,
          error: "This number isn't verified yet. Twilio requires verified numbers in trial mode.",
        });
      }

      return json({ success: false, error: "Could not send SMS. Please try again shortly." });
    }

    return json({ success: true, message: "Test SMS sent! Check your phone." });
  } catch (error) {
    console.error("Error sending test SMS:", error);
    return json({ success: false, error: "Failed to send SMS. Please try again later." });
  }
});
