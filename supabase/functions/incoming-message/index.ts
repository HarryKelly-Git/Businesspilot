import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  corsHeaders,
  getAuthenticatedUserId,
  getOwnedBusinessId,
  json,
} from "../_shared/auth.ts";
import { generateReply } from "../_shared/ai.ts";
import { alertOwnerOfEmergency, detectEmergency, raiseUrgency } from "../_shared/emergency.ts";

interface IncomingMessage {
  phone: string;
  message: string;
  name?: string;
  source?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // This simulates an inbound enquiry from inside the dashboard, so the caller
    // must be signed in. It previously accepted anonymous calls and, with no
    // business_id, attached the lead to whichever business came back first.
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = adminClient();

    const businessId = await getOwnedBusinessId(supabase, userId);
    if (!businessId) {
      return json({ error: "Finish setting up your business first" }, 400);
    }

    const body: IncomingMessage = await req.json();
    const { phone, message, name, source = "sms" } = body;

    if (!phone || !message) {
      return json({ error: "Phone and message are required" }, 400);
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("name, industry, settings")
      .eq("id", businessId)
      .single();

    // Classify urgency from the raw message (instant, no AI call). Drives the
    // stored lead.urgency and whether we page the owner.
    const emergency = detectEmergency(message, business?.industry ?? null);

    // Find or create the lead
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, name, urgency")
      .eq("phone", phone)
      .eq("business_id", businessId)
      .maybeSingle();

    const priorUrgency = existingLead?.urgency ?? "normal";
    // Raise to the detected level, never downgrade — includes normal→high.
    const nextUrgency = raiseUrgency(priorUrgency, emergency.urgency);

    let leadId: string;
    let leadName = name || phone;

    if (existingLead) {
      leadId = existingLead.id;
      leadName = (existingLead.name as string) || name || phone;
      await supabase
        .from("leads")
        .update({
          last_message: message,
          urgency: nextUrgency,
          last_contacted_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    } else {
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          business_id: businessId,
          name: name || phone,
          phone,
          last_message: message,
          source,
          status: "new",
          urgency: emergency.urgency,
        })
        .select()
        .single();

      if (leadError) {
        console.error("Error creating lead:", leadError);
        return json({ error: "Failed to create lead" }, 500);
      }

      leadId = newLead.id;
    }

    // Page the owner only on the transition into an emergency.
    const shouldAlertOwner = emergency.isEmergency && priorUrgency !== "urgent";

    await supabase.from("incoming_messages").insert({
      business_id: businessId,
      lead_id: leadId,
      phone,
      name: name || null,
      message,
      source,
    });

    // Append the customer message to the running conversation
    const { data: existingConversation } = await supabase
      .from("ai_conversations")
      .select("id, messages")
      .eq("lead_id", leadId)
      .is("ended_at", null)
      .maybeSingle();

    const userMessage = { role: "user", content: message, timestamp: new Date().toISOString() };
    const history: Array<{ role: string; content: string }> = existingConversation
      ? (existingConversation.messages || [])
      : [];

    if (existingConversation) {
      await supabase
        .from("ai_conversations")
        .update({ messages: [...history, userMessage] })
        .eq("id", existingConversation.id);
    } else {
      await supabase.from("ai_conversations").insert({
        business_id: businessId,
        lead_id: leadId,
        messages: [userMessage],
        channel: source,
      });
    }

    // Generate the reply and page the owner concurrently — independent work.
    const [aiResponse, alertResult] = await Promise.all([
      generateReply(
        {
          name: business?.name ?? null,
          industry: business?.industry ?? null,
          settings: (business?.settings as Record<string, unknown>) ?? null,
        },
        message,
        history
      ),
      shouldAlertOwner
        ? alertOwnerOfEmergency(supabase, {
            businessId,
            settings: (business?.settings as Record<string, unknown>) ?? null,
            leadName,
            leadPhone: phone,
            message,
            reason: emergency.reason,
          })
        : Promise.resolve(null),
    ]);

    if (!aiResponse) {
      // The lead is captured either way — that's the part that protects revenue.
      // Be honest that the reply didn't generate rather than faking one.
      return json(
        {
          success: false,
          lead_id: leadId,
          error: "Lead captured, but the AI reply could not be generated. Check the Anthropic API key.",
        },
        502
      );
    }

    await supabase.from("incoming_messages").insert({
      business_id: businessId,
      lead_id: leadId,
      phone,
      message: aiResponse,
      source: "ai",
      processed: true,
    });

    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("id, messages")
      .eq("lead_id", leadId)
      .is("ended_at", null)
      .maybeSingle();

    if (conv) {
      await supabase
        .from("ai_conversations")
        .update({
          messages: [
            ...(conv.messages || []),
            { role: "assistant", content: aiResponse, timestamp: new Date().toISOString() },
          ],
        })
        .eq("id", conv.id);
    }

    await supabase.from("leads").update({ status: "contacted" }).eq("id", leadId);

    // Distinguish "deduped — owner already alerted for this lead" from "attempted
    // but failed / not configured", so the test modal never tells a correctly set-up
    // owner they're misconfigured just because they re-tested the same number.
    const ownerAlertStatus = !emergency.isEmergency
      ? "not_emergency"
      : !shouldAlertOwner
        ? "already_alerted"
        : alertResult?.alerted
          ? "sent"
          : alertResult?.skipped ?? "send-failed";

    return json({
      success: true,
      lead_id: leadId,
      message: aiResponse,
      urgency: emergency.urgency,
      emergency: emergency.isEmergency,
      emergency_reason: emergency.reason,
      owner_alerted: alertResult?.alerted ?? false,
      owner_alert_status: ownerAlertStatus,
    });
  } catch (error) {
    console.error("Error processing incoming message:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
