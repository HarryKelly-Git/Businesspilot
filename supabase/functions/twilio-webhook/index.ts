import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, corsHeaders } from "../_shared/auth.ts";
import { generateReply } from "../_shared/ai.ts";
import { alertOwnerOfEmergency, detectEmergency, raiseUrgency } from "../_shared/emergency.ts";
import {
  addSuppression,
  detectOptOutIntent,
  isSuppressed,
  removeSuppression,
} from "../_shared/suppression.ts";

const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
// Set this when the public URL Twilio posts to differs from what the edge
// runtime sees (custom domain, proxy). Falls back to the request URL.
const TWILIO_WEBHOOK_URL = Deno.env.get("TWILIO_WEBHOOK_URL");

/**
 * Validates X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + sortedParams)).
 * Without this the endpoint is an open relay — anyone can POST a fake inbound
 * SMS and make the owner's Twilio account text an arbitrary number.
 */
async function isValidTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): Promise<boolean> {
  if (!TWILIO_AUTH_TOKEN) return false;

  const data =
    url +
    Object.keys(params)
      .sort()
      .map((key) => key + params[key])
      .join("");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(TWILIO_AUTH_TOKEN),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // Constant-time compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

/** TwiML is XML — an unescaped & or < in the reply breaks the response. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twiml(body: string | null): Response {
  const xml = body
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(body)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  return new Response(xml, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/xml" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") params[key] = value;
    }

    const signature = req.headers.get("X-Twilio-Signature");
    const url = TWILIO_WEBHOOK_URL || req.url;

    if (!signature || !(await isValidTwilioSignature(url, params, signature))) {
      console.error("Rejected webhook: invalid or missing Twilio signature");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const from = params.From;
    const to = params.To;
    const body = params.Body;

    if (!from || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = adminClient();

    // Route to the business that owns the number this text came in on.
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, industry, settings")
      .eq("phone", to)
      .maybeSingle();

    if (!business) {
      console.error(`No business registered for number ${to}`);
      return twiml(null);
    }

    const businessId = business.id;

    // --- NZ UEM Act 2007: opt-out / opt-in ---------------------------------
    // Honour STOP/START before any other processing, so an opt-out is never run
    // through the AI or used to page the owner, and gets exactly ONE reply — via
    // TwiML, the single-reply channel, so a confirmation can't double-send.
    const optOut = detectOptOutIntent(body);
    if (optOut === "stop") {
      await addSuppression(supabase, businessId, from, "stop_reply");
      await supabase.from("incoming_messages").insert({
        business_id: businessId,
        phone: from,
        message: body,
        source: "sms",
        processed: true,
      });
      console.log(`[optout] ${from} opted out of business ${businessId}`);
      return twiml(
        `You've been unsubscribed and won't receive any more messages from ${business.name}. Reply START to resubscribe.`
      );
    }
    if (optOut === "start") {
      await removeSuppression(supabase, businessId, from);
      await supabase.from("incoming_messages").insert({
        business_id: businessId,
        phone: from,
        message: body,
        source: "sms",
        processed: true,
      });
      console.log(`[optout] ${from} resubscribed to business ${businessId}`);
      return twiml(
        `You're resubscribed to ${business.name}. Reply STOP at any time to opt out.`
      );
    }

    // Is this number on the suppression list? If so we'll still capture the lead
    // and (for a genuine emergency) page the owner below — the opt-out only stops
    // us MESSAGING the customer, never the owner's safety alert — but we send the
    // customer no reply. Resolved once here; enforced at the reply step.
    const customerSuppressed = await isSuppressed(supabase, businessId, from);

    // Classify urgency from the raw message (instant, no AI call). Drives the
    // stored lead.urgency and whether we page the owner.
    const emergency = detectEmergency(body, business.industry);

    // Find or create the lead
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, status, urgency, name")
      .eq("business_id", businessId)
      .eq("phone", from)
      .maybeSingle();

    const priorUrgency = existingLead?.urgency ?? "normal";
    // Raise to the detected level, never downgrade — this correctly applies a
    // normal→high bump too, not only normal→urgent.
    const nextUrgency = raiseUrgency(priorUrgency, emergency.urgency);

    let leadId: string;
    let leadName = from;

    if (existingLead) {
      leadId = existingLead.id;
      leadName = (existingLead.name as string) || from;
      await supabase
        .from("leads")
        .update({
          last_message: body,
          status: existingLead.status === "new" ? "contacted" : existingLead.status,
          urgency: nextUrgency,
          last_contacted_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    } else {
      const { data: newLead, error } = await supabase
        .from("leads")
        .insert({
          business_id: businessId,
          name: from,
          phone: from,
          source: "sms",
          status: "new",
          urgency: emergency.urgency,
          last_message: body,
        })
        .select("id")
        .single();

      if (error || !newLead) {
        console.error("Failed to create lead:", error);
        return twiml(null);
      }
      leadId = newLead.id;
    }

    // Page the owner only on the transition into an emergency, so a customer
    // firing off several panicked texts doesn't spam the owner's phone.
    const shouldAlertOwner = emergency.isEmergency && priorUrgency !== "urgent";

    await supabase.from("incoming_messages").insert({
      business_id: businessId,
      lead_id: leadId,
      phone: from,
      message: body,
      source: "sms",
      processed: true,
    });

    // Load conversation history before appending, so the model sees prior turns
    const { data: conversation } = await supabase
      .from("ai_conversations")
      .select("id, messages")
      .eq("lead_id", leadId)
      .is("ended_at", null)
      .maybeSingle();

    const history: Array<{ role: string; content: string }> = conversation?.messages || [];
    const userMessage = { role: "user", content: body, timestamp: new Date().toISOString() };

    // Generate the customer reply and page the owner concurrently — the alert is
    // independent of the reply, so it must not add latency to the customer's text.
    const [aiResponse] = await Promise.all([
      // Don't spend an AI call generating a reply we won't send to an opted-out
      // customer — but the owner alert alongside still runs unconditionally.
      customerSuppressed
        ? Promise.resolve(null)
        : generateReply(
            {
              name: business.name,
              industry: business.industry,
              settings: business.settings as Record<string, unknown> | null,
            },
            body,
            history
          ),
      shouldAlertOwner
        ? alertOwnerOfEmergency(supabase, {
            businessId,
            settings: business.settings as Record<string, unknown> | null,
            leadName,
            leadPhone: from,
            message: body,
            reason: emergency.reason,
          })
        : Promise.resolve(null),
    ]);

    // Opted-out customer: the owner alert above already fired if warranted (it
    // goes to the owner, never suppressed), but we send the customer nothing.
    // Store just their inbound turn and return an empty TwiML response.
    if (customerSuppressed) {
      if (conversation) {
        await supabase
          .from("ai_conversations")
          .update({ messages: [...history, userMessage] })
          .eq("id", conversation.id);
      } else {
        await supabase.from("ai_conversations").insert({
          business_id: businessId,
          lead_id: leadId,
          channel: "sms",
          messages: [userMessage],
        });
      }
      console.log(`[optout] suppressed ${from} texted in; owner alert honoured, customer not replied to`);
      return twiml(null);
    }

    // If the model is unavailable, still acknowledge so the customer isn't left
    // hanging — but don't fake a qualifying conversation.
    const reply =
      aiResponse ??
      `Thanks for getting in touch with ${business.name}. We've got your message and will come back to you shortly.`;

    if (!aiResponse) {
      console.error(`AI reply failed for business ${businessId}; sent acknowledgement instead`);
    }

    const assistantMessage = {
      role: "assistant",
      content: reply,
      timestamp: new Date().toISOString(),
    };

    if (conversation) {
      await supabase
        .from("ai_conversations")
        .update({ messages: [...history, userMessage, assistantMessage] })
        .eq("id", conversation.id);
    } else {
      await supabase.from("ai_conversations").insert({
        business_id: businessId,
        lead_id: leadId,
        channel: "sms",
        messages: [userMessage, assistantMessage],
      });
    }

    // Reply via TwiML only. The previous version returned TwiML *and* called the
    // REST API, so every customer got the same text twice and the account was
    // billed twice.
    return twiml(reply);
  } catch (error) {
    console.error("Error processing Twilio webhook:", error);
    return twiml(null);
  }
});
