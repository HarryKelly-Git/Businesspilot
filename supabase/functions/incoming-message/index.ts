import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface IncomingMessage {
  phone: string;
  message: string;
  name?: string;
  business_id?: string;
  source?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: IncomingMessage = await req.json();
    const { phone, message, name, business_id, source = "sms" } = body;

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "Phone and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find or create lead
    let leadId: string;
    let targetBusinessId = business_id;

    // If no business_id provided, try to find one or use a default
    if (!targetBusinessId) {
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id")
        .limit(1);

      if (businesses && businesses.length > 0) {
        targetBusinessId = businesses[0].id;
      } else {
        return new Response(
          JSON.stringify({ error: "No business found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if lead with this phone exists
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, name")
      .eq("phone", phone)
      .eq("business_id", targetBusinessId)
      .single();

    if (existingLead) {
      leadId = existingLead.id;
      // Update last_message
      await supabase
        .from("leads")
        .update({
          last_message: message,
          last_contacted_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    } else {
      // Create new lead
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          business_id: targetBusinessId,
          name: name || "Unknown",
          phone: phone,
          last_message: message,
          source: source,
          status: "new",
          urgency: "normal",
        })
        .select()
        .single();

      if (leadError) {
        console.error("Error creating lead:", leadError);
        return new Response(
          JSON.stringify({ error: "Failed to create lead" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      leadId = newLead.id;
    }

    // Store the incoming message
    await supabase
      .from("incoming_messages")
      .insert({
        business_id: targetBusinessId,
        lead_id: leadId,
        phone: phone,
        name: name || null,
        message: message,
        source: source,
      });

    // Add user message to conversation
    const { data: existingConversation } = await supabase
      .from("ai_conversations")
      .select("id, messages")
      .eq("lead_id", leadId)
      .is("ended_at", null)
      .single();

    const userMessage = {
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    if (existingConversation) {
      const messages = existingConversation.messages || [];
      messages.push(userMessage);
      await supabase
        .from("ai_conversations")
        .update({ messages })
        .eq("id", existingConversation.id);
    } else {
      await supabase
        .from("ai_conversations")
        .insert({
          business_id: targetBusinessId,
          lead_id: leadId,
          messages: [userMessage],
          channel: source,
        });
    }

    // Generate AI response
    const aiResponse = await generateAIResponse(supabase, message, targetBusinessId, name || "there");

    // Store AI response
    await supabase
      .from("incoming_messages")
      .insert({
        business_id: targetBusinessId,
        lead_id: leadId,
        phone: phone,
        message: aiResponse,
        source: "ai",
        processed: true,
      });

    // Add AI response to conversation
    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("id, messages")
      .eq("lead_id", leadId)
      .is("ended_at", null)
      .single();

    if (conv) {
      const messages = conv.messages || [];
      messages.push({
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString(),
      });
      await supabase
        .from("ai_conversations")
        .update({ messages })
        .eq("id", conv.id);
    }

    // Update lead status to replied
    await supabase
      .from("leads")
      .update({ status: "contacted" })
      .eq("id", leadId);

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: leadId,
        message: aiResponse,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing incoming message:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateAIResponse(
  supabase: any,
  userMessage: string,
  businessId: string,
  customerName: string
): Promise<string> {
  // Get business info for context
  const { data: business } = await supabase
    .from("businesses")
    .select("name, industry")
    .eq("id", businessId)
    .single();

  const { data: template } = await supabase
    .from("industry_templates")
    .select("name, services")
    .eq("industry", business?.industry || "other")
    .single();

  const businessName = business?.name || "our company";
  const industry = template?.name || "service";

  // Simple AI response logic (uses rules-based responses)
  // In production, this would call OpenAI API
  const lowerMessage = userMessage.toLowerCase();

  // Detect intent and respond appropriately
  if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("quote") || lowerMessage.includes("how much")) {
    return `Hi! Thanks for reaching out to ${businessName}. To give you an accurate quote, could you tell me a bit more about what you need help with?`;
  }

  if (lowerMessage.includes("available") || lowerMessage.includes("book") || lowerMessage.includes("appointment") || lowerMessage.includes("when")) {
    return `Hi! Thanks for contacting ${businessName}. We have some availability this week. What day works best for you, and what kind of ${industry.toLowerCase()} work do you need?`;
  }

  if (lowerMessage.includes("emergency") || lowerMessage.includes("urgent") || lowerMessage.includes("asap") || lowerMessage.includes("now")) {
    return `Hi! This sounds urgent. I'm checking our schedule right now - can you give me your address and phone number so we can get someone out to you quickly?`;
  }

  if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
    return `Hi there! Thanks for messaging ${businessName}. How can I help you today?`;
  }

  // Default response that gathers more info
  return `Thanks for reaching out! I see you're interested in our ${industry.toLowerCase()} services. Could you tell me a bit more about what you need help with?`;
}
