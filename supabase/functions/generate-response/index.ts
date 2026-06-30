import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateRequest {
  message: string;
  business_id?: string;
  conversation_history?: Array<{ role: string; content: string }>;
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

    const body: GenerateRequest = await req.json();
    const { message, business_id, conversation_history = [] } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get business context
    let businessName = "our company";
    let industry = "service";
    let services: string[] = [];

    if (business_id) {
      const { data: business } = await supabase
        .from("businesses")
        .select("name, industry")
        .eq("id", business_id)
        .single();

      if (business) {
        businessName = business.name;
        const { data: template } = await supabase
          .from("industry_templates")
          .select("name, services")
          .eq("industry", business.industry || "other")
          .single();

        if (template) {
          industry = template.name;
          services = template.services || [];
        }
      }
    }

    // Generate context-aware response
    const response = generateContextualResponse(message, businessName, industry, services, conversation_history);

    return new Response(
      JSON.stringify({
        success: true,
        response: response,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating response:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateContextualResponse(
  message: string,
  businessName: string,
  industry: string,
  services: string[],
  history: Array<{ role: string; content: string }>
): string {
  const lowerMessage = message.toLowerCase();

  // Count how many exchanges we've had
  const exchangeCount = history.filter(h => h.role === "user").length;

  // First message - greeting and initial inquiry
  if (exchangeCount === 0) {
    if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("quote")) {
      return `Hi! Thanks for reaching out to ${businessName}. To give you an accurate quote, could you tell me what kind of ${industry.toLowerCase()} work you need done?`;
    }
    if (lowerMessage.includes("emergency") || lowerMessage.includes("urgent")) {
      return `This sounds urgent! I'm checking our availability right now. Can you give me your address and a brief description of the issue?`;
    }
    return `Hi! Thanks for contacting ${businessName}. What kind of ${industry.toLowerCase()} work can we help you with today?`;
  }

  // Second exchange - gather more details
  if (exchangeCount === 1) {
    if (lowerMessage.includes("address") || lowerMessage.includes("location")) {
      return `Thanks! And what's the best phone number to reach you at?`;
    }
    return `Got it. And what's your address so we can plan the visit?`;
  }

  // Third exchange - confirm details and try to book
  if (exchangeCount === 2) {
    return `Perfect! What day and time works best for you? We typically have availability weekdays between 8am-6pm.`;
  }

  // Fourth exchange - finalize
  if (exchangeCount === 3) {
    return `Great, let me confirm that time works for our team. You'll receive a confirmation text shortly. Is there anything else you'd like us to know before we arrive?`;
  }

  // Later exchanges - wrap up
  return `Thanks for all the details! We'll have someone reach out to confirm shortly. Is there anything else you need?`;
}
