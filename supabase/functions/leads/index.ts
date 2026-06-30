import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const businessId = url.searchParams.get("business_id");

    // Get leads with last message and conversation info
    let query = supabase
      .from("leads")
      .select(`
        id,
        name,
        phone,
        email,
        status,
        source,
        urgency,
        service_needed,
        last_message,
        created_at,
        ai_conversations (
          id,
          messages,
          started_at
        )
      `)
      .order("created_at", { ascending: false });

    if (businessId) {
      query = query.eq("business_id", businessId);
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error("Error fetching leads:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch leads" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process leads to get last message from conversation if not in last_message field
    const processedLeads = (leads || []).map((lead) => {
      let lastMsg = lead.last_message;
      if (!lastMsg && lead.ai_conversations && lead.ai_conversations.length > 0) {
        const messages = lead.ai_conversations[0].messages || [];
        if (messages.length > 0) {
          const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
          if (lastUserMsg) {
            lastMsg = lastUserMsg.content;
          }
        }
      }

      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        source: lead.source,
        urgency: lead.urgency,
        service_needed: lead.service_needed,
        last_message: lastMsg,
        created_at: lead.created_at,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        leads: processedLeads,
        count: processedLeads.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching leads:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
