import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  corsHeaders,
  getAuthenticatedUserId,
  getOwnedBusinessId,
  json,
} from "../_shared/auth.ts";
import { anthropic, HAIKU_MODEL, NZ_CONTEXT } from "../_shared/ai.ts";

interface GenerateBody {
  campaign_id?: string;
  /** Limit how many recipients to generate for (preview uses 3). */
  limit?: number;
}

const ANGLE_BRIEF: Record<string, string> = {
  checking_in: "Warmly check back in on the quote you gave them and ask if they're still thinking about it.",
  availability: "Let them know you've had a cancellation / have availability coming up and could fit their job in.",
  seasonal: "Give a natural seasonal nudge relevant to their job (e.g. before winter / summer / the holidays).",
  custom: "Follow the owner's custom instruction below for the angle.",
};

/** Human phrase for how long ago the quote was, or null if unknown. */
function elapsedPhrase(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const then = Date.parse(dateStr);
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days < 0) return null;
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.max(2, Math.round(days / 7))} weeks`;
  const months = Math.round(days / 30);
  if (months < 18) return `about ${months} months`;
  return `about ${Math.round(months / 12)} years`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const supabase = adminClient();
    const businessId = await getOwnedBusinessId(supabase, userId);
    if (!businessId) return json({ error: "Finish setting up your business first" }, 400);

    const { campaign_id, limit }: GenerateBody = await req.json();
    if (!campaign_id) return json({ error: "campaign_id is required" }, 400);

    const { data: business } = await supabase
      .from("businesses")
      .select("name, industry")
      .eq("id", businessId)
      .single();

    // Ownership enforced via business_id — a caller can't generate for someone else's campaign.
    const { data: campaign } = await supabase
      .from("resurrection_campaigns")
      .select("id, angle, custom_message")
      .eq("id", campaign_id)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!campaign) return json({ error: "Campaign not found" }, 404);

    const cap = Math.min(Math.max(1, limit ?? 3), 500);
    const { data: recipients } = await supabase
      .from("resurrection_recipients")
      .select("id, name, phone, job_description, quote_amount, quote_date")
      .eq("campaign_id", campaign_id)
      .eq("included", true)
      .neq("status", "suppressed")
      .order("created_at", { ascending: true })
      .limit(cap);

    if (!recipients || recipients.length === 0) {
      return json({ messages: [] });
    }

    if (!anthropic) {
      return json({ error: "AI is not configured. Check the Anthropic API key." }, 502);
    }

    const businessName = business?.name ?? "our team";
    const industry = business?.industry ?? "service";
    const angle = campaign.angle as string;

    const systemPrompt = `You write short, natural SMS reactivation texts for ${businessName}, a New Zealand ${industry} business, to people who previously got a quote or enquired and never booked.

ANGLE: ${ANGLE_BRIEF[angle] ?? ANGLE_BRIEF.checking_in}
${angle === "custom" && campaign.custom_message ? `OWNER'S CUSTOM INSTRUCTION: ${campaign.custom_message}` : ""}

RULES
- Write ONE text, under 130 characters, sounding like a real person from the business texting — not marketing spam.
- Use the customer's first name and refer specifically to their job and quote amount when given.
- If given how long ago the quote was, mention it naturally.
- Do NOT add the business name or any opt-out line — those are appended automatically. Do NOT wrap the message in quotes.
- Never invent prices, dates or availability beyond what's provided.

${NZ_CONTEXT}`;

    // One Haiku call per recipient, run concurrently (preview is only a few).
    const results = await Promise.all(
      recipients.map(async (r) => {
        const first = ((r.name as string) || "").trim().split(/\s+/)[0] || "there";
        const elapsed = elapsedPhrase(r.quote_date as string | null);
        const details = [
          `Customer first name: ${first}`,
          r.job_description ? `Job: ${r.job_description}` : "Job: (not specified)",
          r.quote_amount != null ? `Quote amount: NZ$${r.quote_amount}` : "Quote amount: (not specified)",
          elapsed ? `Time since quote: ${elapsed}` : "Time since quote: (unknown)",
        ].join("\n");

        let bodyText = "";
        try {
          const resp = await anthropic.messages.create({
            model: HAIKU_MODEL,
            max_tokens: 120,
            system: systemPrompt,
            messages: [{ role: "user", content: `Write the reactivation text for:\n${details}` }],
          });
          const block = resp.content.find((b) => b.type === "text");
          bodyText = block && block.type === "text" ? block.text.trim().replace(/^["']|["']$/g, "") : "";
        } catch (err) {
          console.error("resurrection-generate AI error:", err);
        }

        if (!bodyText) return { id: r.id, name: r.name, phone: r.phone, message: null };

        // Compliance: guarantee business identification + opt-out on every message
        // (NZ Unsolicited Electronic Messages Act 2007), regardless of AI output.
        const message = `${bodyText} — ${businessName}. Reply STOP to opt out.`;

        await supabase
          .from("resurrection_recipients")
          .update({ generated_message: message })
          .eq("id", r.id);

        return { id: r.id, name: r.name, phone: r.phone, message };
      })
    );

    return json({ messages: results });
  } catch (error) {
    console.error("resurrection-generate error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
