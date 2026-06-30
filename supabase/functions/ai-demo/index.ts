import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

// System prompt that will be cached - generic for demo purposes
const SYSTEM_PROMPT = `You are a helpful AI assistant for a trade/service business. Your job is to respond to customer enquiries professionally and helpfully.

Your goals:
1. Acknowledge the customer's enquiry
2. Gather necessary information (service needed, location, preferred time)
3. Offer to help schedule or provide a quote
4. Be concise - responses should be under 200 characters for SMS when possible

Always be:
- Friendly and professional
- Helpful and responsive
- Focused on getting the customer scheduled or their question answered

Respond as if you're the business responding to a potential customer.`;

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
    const { message } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If Anthropic API key is configured, use Claude 3 Haiku (fast and cheap)
    if (ANTHROPIC_API_KEY) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 200,
            system: [
              {
                type: "text",
                text: SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" }
              }
            ],
            messages: [
              { role: "user", content: message }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.content?.[0]?.text;
          if (text) {
            // Log usage for monitoring (including cache hits)
            console.log("AI API usage:", {
              model: "claude-3-haiku",
              input_tokens: data.usage?.input_tokens,
              output_tokens: data.usage?.output_tokens,
              cache_read_tokens: data.usage?.cache_read_input_tokens || 0,
              cache_creation_tokens: data.usage?.cache_creation_input_tokens || 0,
            });

            return new Response(JSON.stringify({ response: text.trim() }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (error) {
        console.error("Anthropic API error:", error);
      }
    }

    // Fallback: rule-based responses
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("emergency") || lowerMessage.includes("urgent") || lowerMessage.includes("burst") || lowerMessage.includes("flooding")) {
      const response = "I understand this is urgent! I'm dispatching someone right away. Please call us directly for immediate assistance. If safe, try shutting off the main water supply.";
      return new Response(JSON.stringify({ response }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lowerMessage.includes("quote") || lowerMessage.includes("price") || lowerMessage.includes("cost")) {
      const response = "I'd be happy to get you a quote! Could you share what you need? For example, scope of work and location? I'll have a detailed estimate within the hour.";
      return new Response(JSON.stringify({ response }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lowerMessage.includes("schedule") || lowerMessage.includes("appointment") || lowerMessage.includes("availability")) {
      const response = "I'd love to get you scheduled! What day works best? I have openings this week. Morning or afternoon preference?";
      return new Response(JSON.stringify({ response }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lowerMessage.includes("ac") || lowerMessage.includes("air conditioning") || lowerMessage.includes("hvac") || lowerMessage.includes("heating") || lowerMessage.includes("furnace")) {
      const response = "I can help! Let me ask: is the unit making any noise? When did it stop? I'll have a technician out today if needed.";
      return new Response(JSON.stringify({ response }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lowerMessage.includes("electric") || lowerMessage.includes("outlet") || lowerMessage.includes("wiring")) {
      const response = "Electrical work needs a pro. Can you tell me more? For outlets, I'll need to know the room and existing wiring. Free estimates!";
      return new Response(JSON.stringify({ response }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default response
    const response = "Thanks for reaching out! Could you tell me what service you need and when would work best? I'm here to help!";
    return new Response(JSON.stringify({ response }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: "Failed to process message" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
