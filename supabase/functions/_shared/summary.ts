import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { anthropic, HAIKU_MODEL } from "./ai.ts";
import { fetchBusinessSnapshot, snapshotToText, BusinessSnapshot } from "./businessData.ts";

export interface SummaryBusiness {
  id: string;
  name: string;
  industry: string | null;
}

/** Don't spend a model call or fabricate a briefing when there's genuinely no activity. */
function hasActivity(s: BusinessSnapshot): boolean {
  return s.leads.total > 0 || s.upcomingAppointments.length > 0 || s.missedCalls.total > 0;
}

/**
 * Today's AI Coach summary for a business, generated with Claude Haiku and cached
 * in ai_summaries per (business, date). Called by BOTH the dashboard
 * (daily-summary) and the email sender (send-daily-summary), so the model runs
 * at most once per business per day. Returns { summary: null } on a quiet day or
 * when the model is unavailable — callers must not fabricate one.
 */
export async function getOrCreateDailySummary(
  admin: SupabaseClient,
  business: SummaryBusiness
): Promise<{ summary: string | null; cached: boolean }> {
  const today = new Date().toISOString().split("T")[0];

  const { data: cached } = await admin
    .from("ai_summaries")
    .select("content")
    .eq("business_id", business.id)
    .eq("summary_date", today)
    .maybeSingle();

  if (cached?.content) {
    return { summary: cached.content as string, cached: true };
  }

  const snapshot = await fetchBusinessSnapshot(admin, business.id, business.name, business.industry);
  if (!hasActivity(snapshot)) return { summary: null, cached: false };
  if (!anthropic) return { summary: null, cached: false };

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

  const block = response.content.find((b) => b.type === "text");
  const summary = block && block.type === "text" ? block.text.trim() : null;
  if (!summary) return { summary: null, cached: false };

  await admin
    .from("ai_summaries")
    .upsert(
      { business_id: business.id, summary_date: today, content: summary },
      { onConflict: "business_id,summary_date" }
    );

  return { summary, cached: false };
}
