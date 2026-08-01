import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  corsHeaders,
  getAuthenticatedUserId,
  getOwnedBusinessId,
  json,
} from "../_shared/auth.ts";
import { anthropic, HAIKU_MODEL } from "../_shared/ai.ts";

/**
 * Reputation Loop — classify a customer's reply to a "how did the job go?" ask,
 * then prepare the branched follow-up:
 *   positive         -> thank-you + Google review link
 *   negative | mixed -> apologetic reply (NO link) + a prepared owner alert
 *
 * Classification uses Claude Haiku. Preparation only writes to review_requests —
 * nothing is sent. The actual SMS send stays disabled until TNZ is live, exactly
 * like the Ghost Lead Resurrector. When the model is unavailable or its answer is
 * unclear we fail safe to "mixed", so an unhappy customer never gets a review
 * link by mistake.
 */

interface Body {
  review_request_id?: string;
  reply_text?: string;
}

type Sentiment = "positive" | "negative" | "mixed";

function firstName(name: string | null): string {
  const f = ((name as string) || "").trim().split(/\s+/)[0];
  return f || "there";
}

function excerpt(text: string, max = 120): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + "…" : clean;
}

/** Maps the model's free text to one of three labels; unknown -> mixed (fail safe). */
function parseSentiment(raw: string | null): Sentiment {
  const t = (raw || "").toLowerCase();
  if (/\bpositive\b/.test(t)) return "positive";
  if (/\bnegative\b/.test(t)) return "negative";
  return "mixed";
}

async function classify(reply: string): Promise<Sentiment> {
  if (!anthropic) return "mixed"; // fail safe — never link an unclassified reply
  try {
    const resp = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 8,
      system:
        "You classify a customer's SMS reply about a job that was just completed. " +
        "Reply with EXACTLY one word — positive, negative, or mixed. " +
        "positive = happy/satisfied. negative = unhappy/complaint. " +
        "mixed = both good and bad, lukewarm, or unclear.",
      messages: [{ role: "user", content: `Customer reply: "${reply}"\n\nOne word:` }],
    });
    const block = resp.content.find((b) => b.type === "text");
    return parseSentiment(block && block.type === "text" ? block.text : null);
  } catch (err) {
    console.error("review-classify AI error:", err);
    return "mixed";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const admin = adminClient();
    const businessId = await getOwnedBusinessId(admin, userId);
    if (!businessId) return json({ error: "Finish setting up your business first" }, 400);

    const { review_request_id, reply_text }: Body = await req.json();
    if (!review_request_id) return json({ error: "review_request_id is required" }, 400);
    if (!reply_text || !reply_text.trim()) return json({ error: "reply_text is required" }, 400);

    // Ownership: the request must belong to the caller's business.
    const { data: rr } = await admin
      .from("review_requests")
      .select("id, business_id, customer_name, customer_phone, service_type")
      .eq("id", review_request_id)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!rr) return json({ error: "Review request not found" }, 404);

    const { data: business } = await admin
      .from("businesses")
      .select("name, settings")
      .eq("id", businessId)
      .single();

    const businessName = (business?.name as string) || "our team";
    const settings = (business?.settings ?? {}) as Record<string, unknown>;
    const reviewLink = (settings.googleReviewLink as string) || "";

    const sentiment = await classify(reply_text);
    const first = firstName(rr.customer_name as string | null);

    let followup_message: string;
    let review_link_prepared = false;
    let owner_alert_prepared = false;
    let owner_alert_message: string | null = null;

    if (sentiment === "positive") {
      // Thank-you + review link. If no link is saved we still thank them, but
      // there is nothing to send them to — be honest, don't invent a URL.
      review_link_prepared = !!reviewLink;
      followup_message = reviewLink
        ? `Thanks so much, ${first} — really glad you were happy! If you have 30 seconds, a quick Google review would mean a lot: ${reviewLink} — ${businessName}`
        : `Thanks so much, ${first} — really glad you were happy! — ${businessName}`;
    } else {
      // Negative or mixed: apologise, NO review link, and prepare an owner alert.
      followup_message =
        `Thanks for the honest feedback, ${first}. Sorry it wasn't 100% — I'd like to put it right. ` +
        `Someone from ${businessName} will call you shortly. — ${businessName}`;
      owner_alert_prepared = true;
      owner_alert_message =
        `⚠️ Reputation check — ${rr.customer_name || rr.customer_phone || "a customer"} ` +
        `wasn't fully happy after their ${rr.service_type || "recent"} job. ` +
        `They said: "${excerpt(reply_text)}". Worth a call before they post publicly. — BusinessPilot`;
    }

    const { error: updateError } = await admin
      .from("review_requests")
      .update({
        status: "replied",
        reply_text,
        replied_at: new Date().toISOString(),
        sentiment,
        followup_message,
        // review_link_sent stays FALSE — sending is disabled pending TNZ. This
        // flag records only that a link *would* be included for a positive reply.
        review_link_sent: false,
        owner_alert_prepared,
        owner_alert_message,
      })
      .eq("id", review_request_id)
      .eq("business_id", businessId);

    if (updateError) {
      console.error("review-classify update error:", updateError);
      return json({ error: "Failed to save classification" }, 500);
    }

    return json({
      sentiment,
      followup_message,
      review_link_prepared,
      owner_alert_prepared,
      owner_alert_message,
    });
  } catch (error) {
    console.error("review-classify error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
