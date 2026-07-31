import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  corsHeaders,
  getAuthenticatedUserId,
  json,
} from "../_shared/auth.ts";
import { getOrCreateDailySummary } from "../_shared/summary.ts";

/**
 * The daily/Monday summary for the dashboard coach card.
 *
 * Generation + caching now live in _shared/summary.ts (getOrCreateDailySummary),
 * shared with the send-daily-summary email job so the model runs at most once
 * per business per day.
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

    const { summary, cached } = await getOrCreateDailySummary(supabase, business);
    return json({ summary, cached });
  } catch (error) {
    console.error("daily-summary error:", error);
    return json({ summary: null, error: "Could not generate summary." }, 500);
  }
});
