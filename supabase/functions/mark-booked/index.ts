import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  corsHeaders,
  getAuthenticatedUserId,
  json,
  ownsLead,
} from "../_shared/auth.ts";

const VALID_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "quoted",
  "negotiating",
  "converted",
  "lost",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { lead_id, status } = await req.json();

    if (!lead_id || !status) {
      return json({ error: "lead_id and status are required" }, 400);
    }

    if (!VALID_STATUSES.includes(status)) {
      return json(
        { error: "Invalid status. Must be one of: " + VALID_STATUSES.join(", ") },
        400
      );
    }

    const supabase = adminClient();

    // Without this check any caller could mutate any lead in any account by id.
    if (!(await ownsLead(supabase, userId, lead_id))) {
      return json({ error: "Lead not found" }, 404);
    }

    const updateData: Record<string, unknown> = {
      status,
      last_contacted_at: new Date().toISOString(),
    };

    if (status === "converted") {
      updateData.converted_at = new Date().toISOString();
    }

    const { error } = await supabase.from("leads").update(updateData).eq("id", lead_id);

    if (error) {
      console.error("Error updating lead:", error);
      return json({ error: "Failed to update lead status" }, 500);
    }

    // End any active conversations
    await supabase
      .from("ai_conversations")
      .update({ ended_at: new Date().toISOString() })
      .eq("lead_id", lead_id)
      .is("ended_at", null);

    return json({ success: true, lead_id, status });
  } catch (error) {
    console.error("Error marking lead:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
