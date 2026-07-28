import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  corsHeaders,
  getAuthenticatedUserId,
  json,
} from "../_shared/auth.ts";
import { anthropic, HAIKU_MODEL } from "../_shared/ai.ts";
import { fetchBusinessSnapshot, snapshotToText, BusinessSnapshot } from "../_shared/businessData.ts";

/**
 * The daily/Monday summary for the dashboard coach card.
 *
 * Cost control: the summary is cached in ai_summaries per (business, date). We
 * only call Haiku when today's summary doesn't exist yet — so opening the
 * dashboard any number of times costs at most one model call per day.
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

    const supabase = adminClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, industry")
      .eq("owner_id", userId)
      .maybeSingle();

    if (!business) return json({ error: "No business found" }, 400);

    const today = new Date().toISOString().split("T")[0];

    // Return the cached summary if we already made one today — no model call.
    const { data: cached } = await supabase
      .from("ai_summaries")
      .select("content")
      .eq("business_id", business.id)
      .eq("summary_date", today)
      .maybeSingle();

    if (cached?.content) {
      return json({ summary: cached.content, cached: true });
    }

    const snapshot = await fetchBusinessSnapshot(
      supabase,
      business.id,
      business.name,
      business.industry
    );

    // If there's genuinely no activity, don't spend a model call or fabricate one.
    if (!hasActivity(snapshot)) {
      return json({ summary: null, cached: false });
    }

    if (!anthropic) return json({ summary: null, cached: false });

    const isMonday = new Date().getDay() === 1;
    const systemPrompt = `You are Pilot, the AI assistant for ${business.name}, a New Zealand ${business.industry} business. Write the owner's ${isMonday ? "Monday" : "daily"} briefing.

Write 2-4 short sentences, plain and warm, like a switched-on ops manager giving the owner the picture at a glance. Then ONE clear, specific recommendation for what to do next, on its own line starting with "→ ".

RULES
- Use only the data below. Never invent numbers.
- Money in NZ dollars (NZ$450).
- Talk about jobs, enquiries and your phone — not "leads" and "conversions".
- Be encouraging but honest. If it's quiet, say so and suggest something useful.
- No greeting like "Good morning" unless it's Monday.

DATA
${snapshotToText(snapshot)}`;

    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 350,
      system: systemPrompt,
      messages: [{ role: "user", content: "Write my briefing." }],
    });

    console.log("daily-summary usage:", {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    });

    const block = response.content.find((b) => b.type === "text");
    const summary = block && block.type === "text" ? block.text.trim() : null;
    if (!summary) return json({ summary: null, cached: false });

    // Cache it for the rest of the day.
    await supabase
      .from("ai_summaries")
      .upsert(
        { business_id: business.id, summary_date: today, content: summary },
        { onConflict: "business_id,summary_date" }
      );

    return json({ summary, cached: false });
  } catch (error) {
    console.error("daily-summary error:", error);
    return json({ summary: null, error: "Could not generate summary." }, 500);
  }
});

function hasActivity(s: BusinessSnapshot): boolean {
  return (
    s.leads.total > 0 ||
    s.upcomingAppointments.length > 0 ||
    s.missedCalls.total > 0
  );
}
