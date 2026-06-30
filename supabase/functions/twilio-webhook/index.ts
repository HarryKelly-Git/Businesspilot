import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

async function supabaseFetch(table: string, query: Record<string, string>, options: { method?: string; body?: unknown } = {}) {
  const params = new URLSearchParams(query);
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;

  const headers: Record<string, string> = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return response.json();
}

async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("Twilio credentials not configured");
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append("To", to);
    formData.append("From", TWILIO_PHONE_NUMBER);
    formData.append("Body", body);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}

async function generateAIResponse(
  customerMessage: string,
  businessName: string | null,
  businessSettings: Record<string, unknown> | null,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  const tone = (businessSettings?.responseTone as string) || "friendly";
  const businessDescription = businessSettings?.businessDescription as string | undefined;
  const customInstructions = businessSettings?.customInstructions as string | undefined;

  // If Anthropic API key is configured, use Claude for intelligent responses
  if (ANTHROPIC_API_KEY) {
    try {
      const systemPrompt = `You are a helpful AI assistant for ${businessName || "a service business"}.${businessDescription ? ` The business: ${businessDescription}` : ""}

Your job is to:
1. Respond to customer inquiries professionally and helpfully
2. Gather necessary information (service needed, location, preferred time)
3. Help schedule appointments and answer questions
4. Be concise and friendly - responses should be under 160 characters for SMS when possible

Tone: ${tone}
${customInstructions ? `Additional instructions: ${customInstructions}` : ""}

Always:
- Be helpful and responsive
- Ask clarifying questions when needed
- Try to move the conversation toward booking a service or getting a quote
- Keep responses short for SMS`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 300,
          system: systemPrompt,
          messages: [
            ...conversationHistory.slice(-6).map(m => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
            { role: "user", content: customerMessage },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text;
        if (text) {
          return text.trim();
        }
      }
    } catch (error) {
      console.error("Anthropic API error:", error);
    }
  }

  // Fallback to rules-based responses
  const lowerMessage = customerMessage.toLowerCase();

  if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("quote") || lowerMessage.includes("how much")) {
    return `Thanks for reaching out! I'd be happy to give you a quote. Could you let me know:
1. What service do you need?
2. Your location?
3. Preferred date/time?

I'll get you a price right away.`;
  }

  if (lowerMessage.includes("emergency") || lowerMessage.includes("urgent") || lowerMessage.includes("asap") || lowerMessage.includes("now")) {
    return `I understand this is urgent! Please reply with:
1. Your phone number
2. Brief description
3. Your address

We'll respond ASAP.`;
  }

  if (lowerMessage.includes("book") || lowerMessage.includes("appointment") || lowerMessage.includes("schedule") || lowerMessage.includes("available")) {
    return `Great, let's get you scheduled! Please share:
1. What service you need
2. Your preferred day
3. Morning or afternoon?

I'll confirm your appointment.`;
  }

  if (lowerMessage.includes("hi") || lowerMessage.includes("hello") || lowerMessage.includes("hey")) {
    return `Hello! Thanks for contacting ${businessName || "us"}! How can I help you today?`;
  }

  if (lowerMessage.includes("yes") || lowerMessage.includes("confirm")) {
    return `Perfect! Your request has been received. We'll be in touch shortly to confirm the details.`;
  }

  if (lowerMessage.includes("no") || lowerMessage.includes("cancel")) {
    return `No problem. Let me know if there's anything else I can help you with.`;
  }

  return `Thanks for your message! To help you best, could you share:
- What service you need
- Your location
- When you'd like it done

I'll get back to you shortly.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await req.formData();
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;

    if (!from || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`SMS received from ${from}: ${body}`);

    // Find business by phone number
    const businesses = await supabaseFetch(
      "businesses",
      { phone: `eq.${to}`, select: "id,name,settings" },
      { method: "GET" }
    );

    if (!businesses || businesses.length === 0) {
      console.log(`No business found for phone number: ${to}`);
      return new Response(
        `<Response><Sms>No business found for this number.</Sms></Response>`,
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        }
      );
    }

    const business = businesses[0];
    const businessId = business.id;

    // Find or create lead
    let leads = await supabaseFetch(
      "leads",
      { business_id: `eq.${businessId}`, phone: `eq.${from}`, select: "id,name,status" },
      { method: "GET" }
    );

    let lead: { id: string; name: string; status: string };

    if (!leads || leads.length === 0) {
      const newLeads = await supabaseFetch(
        "leads",
        { select: "*" },
        {
          method: "POST",
          body: {
            business_id: businessId,
            name: from,
            phone: from,
            source: "sms",
            status: "new",
            last_message: body,
          },
        }
      );
      lead = newLeads[0];
    } else {
      lead = leads[0];
      await supabaseFetch(
        "leads",
        { id: `eq.${lead.id}` },
        {
          method: "PATCH",
          body: {
            last_message: body,
            status: lead.status === "new" ? "contacted" : lead.status,
            updated_at: new Date().toISOString(),
          },
        }
      );
    }

    // Store incoming message
    await supabaseFetch(
      "incoming_messages",
      { select: "id" },
      {
        method: "POST",
        body: {
          business_id: businessId,
          lead_id: lead.id,
          phone: from,
          message: body,
          source: "sms",
          processed: true,
        },
      }
    );

    // Get or create conversation
    const conversations = await supabaseFetch(
      "ai_conversations",
      { lead_id: `eq.${lead.id}`, select: "id,messages" },
      { method: "GET" }
    );

    const newMessage = {
      role: "user",
      content: body,
      timestamp: new Date().toISOString(),
    };

    let conversationHistory: Array<{ role: string; content: string }> = [];

    if (conversations && conversations.length > 0) {
      const existingConv = conversations[0];
      conversationHistory = (existingConv.messages || []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      }));
      await supabaseFetch(
        "ai_conversations",
        { id: `eq.${existingConv.id}` },
        {
          method: "PATCH",
          body: {
            messages: [...conversationHistory, newMessage],
          },
        }
      );
    } else {
      await supabaseFetch(
        "ai_conversations",
        { select: "id" },
        {
          method: "POST",
          body: {
            business_id: businessId,
            lead_id: lead.id,
            channel: "sms",
            messages: [newMessage],
          },
        }
      );
    }

    // Generate AI response
    const businessSettings = business.settings as Record<string, unknown> | null;
    const aiResponse = await generateAIResponse(body, business.name, businessSettings, conversationHistory);

    // Store AI response
    const updatedConversations = await supabaseFetch(
      "ai_conversations",
      { lead_id: `eq.${lead.id}`, select: "id,messages" },
      { method: "GET" }
    );

    if (updatedConversations && updatedConversations.length > 0) {
      const conv = updatedConversations[0];
      const messages = conv.messages || [];
      await supabaseFetch(
        "ai_conversations",
        { id: `eq.${conv.id}` },
        {
          method: "PATCH",
          body: {
            messages: [
              ...messages,
              {
                role: "assistant",
                content: aiResponse,
                timestamp: new Date().toISOString(),
              },
            ],
          },
        }
      );
    }

    // Update incoming message
    await supabaseFetch(
      "incoming_messages",
      { lead_id: `eq.${lead.id}`, processed: `eq.true` },
      {
        method: "PATCH",
        body: {
          ai_response: aiResponse,
        },
      }
    );

    // Send SMS response
    await sendSMS(from, aiResponse);

    return new Response(
      `<Response><Sms>${aiResponse}</Sms></Response>`,
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      }
    );
  } catch (error) {
    console.error("Error processing Twilio webhook:", error);
    return new Response(
      `<Response><Sms>Sorry, there was an error. Please try again.</Sms></Response>`,
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      }
    );
  }
});
