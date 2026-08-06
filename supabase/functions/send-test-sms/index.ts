import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  corsHeaders,
  getAuthenticatedUserId,
  getOwnedBusinessId,
  json,
} from "../_shared/auth.ts";
import { sendSms, smsConfigured, toE164 } from "../_shared/sms.ts";
import { isSuppressed } from "../_shared/suppression.ts";

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

    if (!smsConfigured()) {
      return json({
        success: false,
        error: "SMS is not switched on for your account yet. Contact support and we'll enable it.",
      });
    }

    const e164 = toE164(phone);

    // Honour the opt-out list even on a manual test send — a number that replied
    // STOP must not be messaged from any feature, this one included.
    const supabase = adminClient();
    const businessId = await getOwnedBusinessId(supabase, userId);
    if (businessId && (await isSuppressed(supabase, businessId, e164))) {
      return json({
        success: false,
        error:
          "That number is on your unsubscribe list (they replied STOP), so we didn't send. Remove them in Settings → Unsubscribes to message them again.",
      });
    }

    const message =
      `Hi! This is BusinessPilot${businessName ? ` for ${businessName}` : ""}. ` +
      `This is how fast your customers will hear back from you, day or night. Reply STOP to opt out.`;

    const result = await sendSms(e164, message);

    if (!result.success) {
      // Log the provider failure so a bad test send is traceable from the logs.
      console.error(`[test-sms] send failed (code ${result.code}): ${result.error}`);
      if (result.code === 21211) {
        return json({
          success: false,
          error: "That doesn't look like a valid mobile number. Please check and try again.",
        });
      }

      if (result.code === 21608) {
        return json({
          success: false,
          error: "This number isn't verified yet. Twilio requires verified numbers in trial mode.",
        });
      }

      return json({ success: false, error: "Could not send SMS. Please try again shortly." });
    }

    // Log + return the TNZ MessageID so every test send is traceable straight
    // from the function logs and matchable to the TNZ dashboard delivery report.
    console.log(`[test-sms] sent (sid ${result.sid})`);
    return json({ success: true, sid: result.sid, message: "Test SMS sent! Check your phone." });
  } catch (error) {
    console.error("Error sending test SMS:", error);
    return json({ success: false, error: "Failed to send SMS. Please try again later." });
  }
});
