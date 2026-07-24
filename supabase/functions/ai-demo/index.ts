import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/auth.ts";
import { anthropic, HAIKU_MODEL } from "../_shared/ai.ts";

/**
 * Public demo widget on the marketing site. Intentionally unauthenticated —
 * it runs before signup — so it needs its own abuse controls.
 */
const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 8;

// Per-instance sliding window. Edge instances are ephemeral so this is a speed
// bump, not a guarantee — it stops casual abuse of the Anthropic bill.
const requestLog = new Map<string, number[]>();

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(clientId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(clientId, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(clientId, recent);

  // Keep the map from growing without bound
  if (requestLog.size > 5000) {
    for (const [key, times] of requestLog) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) requestLog.delete(key);
    }
  }

  return false;
}

const SYSTEM_PROMPT = `You are the AI receptionist for a local trade or service business, replying to a customer enquiry by SMS. This is a live demo on the BusinessPilot website, so the person messaging you is a business owner trying you out.

YOUR JOB
Show them what their customers would experience. Reply instantly, sound like a real person from the business, and work towards booking the job.

RULES
- Keep replies under 160 characters where you can. This is SMS.
- Ask ONE qualifying question per message — never a numbered list.
- Qualify on: how urgent it is, what exactly is needed, and where they are.
- Never invent specific prices, times, or availability. Say the owner will confirm.
- Once you have enough detail, propose booking a time.
- Sound warm and competent. Not corporate, not robotic.
- Never say you are an AI unless asked directly.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const clientId =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

    if (isRateLimited(clientId)) {
      return json({ error: "You're going a bit fast — give it a moment and try again." }, 429);
    }

    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return json({ error: "Message is required" }, 400);
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return json({ error: "That message is too long for a demo." }, 400);
    }

    if (!anthropic) {
      // Don't dress a hardcoded string up as an AI reply.
      return json({ error: "The demo is temporarily unavailable." }, 503);
    }

    const priorTurns: Array<{ role: string; content: string }> = Array.isArray(history)
      ? history.slice(-6)
      : [];

    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 200,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        ...priorTurns.map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: String(m.content).slice(0, MAX_MESSAGE_LENGTH),
        })),
        { role: "user" as const, content: message },
      ],
    });

    console.log("Demo usage:", {
      model: HAIKU_MODEL,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
    });

    const block = response.content.find((b) => b.type === "text");
    const text = block && block.type === "text" ? block.text.trim() : null;

    if (!text) {
      return json({ error: "The demo is temporarily unavailable." }, 503);
    }

    return json({ response: text });
  } catch (error) {
    console.error("Error processing demo message:", error);
    return json({ error: "The demo is temporarily unavailable." }, 503);
  }
});
