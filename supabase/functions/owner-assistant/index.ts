import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  corsHeaders,
  getAuthenticatedUserId,
  json,
} from "../_shared/auth.ts";
import { anthropic, HAIKU_MODEL } from "../_shared/ai.ts";
import { fetchBusinessSnapshot, snapshotToText } from "../_shared/businessData.ts";

/**
 * "Pilot" — the business owner's own AI assistant. Answers questions about their
 * business and drafts messages, grounded in a compact live snapshot of their
 * data. Owner-facing (auth-gated), on Haiku for cost.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    if (!anthropic) {
      return json({ error: "The assistant isn't available right now." }, 503);
    }

    const { message, history } = (await req.json()) as {
      message?: string;
      history?: Array<{ role: string; content: string }>;
    };
    if (!message || typeof message !== "string") {
      return json({ error: "Message is required" }, 400);
    }

    const supabase = adminClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, industry")
      .eq("owner_id", userId)
      .maybeSingle();

    if (!business) {
      return json({ error: "Finish setting up your business first." }, 400);
    }

    const snapshot = await fetchBusinessSnapshot(
      supabase,
      business.id,
      business.name,
      business.industry
    );

    const systemPrompt = `You are Pilot, the AI assistant for ${business.name}, a ${business.industry} business in New Zealand. You work for the business OWNER (not their customers) — you are their operations right hand.

Answer questions about their business, surface what needs attention, and draft messages when asked. Be direct and practical, like a sharp assistant who has already looked at everything.

RULES
- Use the live business data below. Never invent numbers — if the data doesn't show something, say so plainly.
- Money is always in NZ dollars, written like NZ$450.
- Keep answers short and skimmable. Lead with the answer, then any detail. Use short bullet points for lists.
- When asked to draft a message to a customer, write it ready to send — warm, in New Zealand English, no placeholders left blank.
- If asked to do something you can't actually do (send a text, change a booking), say what you'd draft/prepare and that they can action it — don't claim you did it.

LIVE BUSINESS DATA (as of now)
${snapshotToText(snapshot)}`;

    const priorTurns = Array.isArray(history) ? history.slice(-6) : [];

    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 500, // owner answers are short; keeps output cost down
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [
        ...priorTurns.map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: String(m.content).slice(0, 2000),
        })),
        { role: "user" as const, content: message.slice(0, 2000) },
      ],
    });

    console.log("owner-assistant usage:", {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cache_read: response.usage.cache_read_input_tokens ?? 0,
    });

    const block = response.content.find((b) => b.type === "text");
    const text = block && block.type === "text" ? block.text.trim() : null;
    if (!text) return json({ error: "No response generated." }, 502);

    return json({ response: text });
  } catch (error) {
    console.error("owner-assistant error:", error);
    return json({ error: "The assistant hit a problem. Please try again." }, 500);
  }
});
