import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, corsHeaders, json } from "../_shared/auth.ts";
import { getOrCreateDailySummary } from "../_shared/summary.ts";
import { sendEmail, emailConfigured } from "../_shared/email.ts";

/**
 * Batch job: emails each business owner their daily AI Coach summary. Intended to
 * be called once each morning by a scheduled cron.
 *
 * Auth: keeps the default gateway JWT check (the cron passes the anon key), and
 * additionally requires a shared X-Cron-Secret so a random caller with just the
 * public anon key can't trigger a mass send. Optional body { business_id }
 * restricts to one business (used for testing).
 */
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const APP_URL = Deno.env.get("APP_URL") || "https://thebusinesspilot.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(businessName: string, summary: string, appUrl: string): string {
  const paragraphs = summary
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p style="margin:0 0 12px;line-height:1.5;">${escapeHtml(l)}</p>`)
    .join("");

  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
  <p style="font-size:13px;color:#6366f1;font-weight:600;margin:0 0 4px;">BusinessPilot · ${escapeHtml(businessName)}</p>
  <h1 style="font-size:18px;margin:0 0 16px;">Your daily summary</h1>
  ${paragraphs}
  <p style="margin:24px 0 0;">
    <a href="${appUrl}/dashboard" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;">Open dashboard</a>
  </p>
  <p style="font-size:12px;color:#94a3b8;margin:24px 0 0;">You're getting this because "Email me my daily summary" is on in your BusinessPilot settings.</p>
</div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Real authorization: a shared secret only the cron (and us, for testing) knows.
  if (!CRON_SECRET || req.headers.get("X-Cron-Secret") !== CRON_SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!emailConfigured()) return json({ error: "Email is not configured (RESEND_API_KEY missing)" }, 400);

  try {
    const body = await req.json().catch(() => ({}));
    const onlyBusinessId: string | undefined = body?.business_id;

    const admin = adminClient();
    let query = admin.from("businesses").select("id, name, industry, owner_id, settings");
    if (onlyBusinessId) query = query.eq("id", onlyBusinessId);
    const { data: businesses } = await query;

    const today = new Date().toISOString().split("T")[0];
    let sent = 0;
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const b of businesses ?? []) {
      const settings = (b.settings ?? {}) as Record<string, unknown>;
      // Default ON — only skip when explicitly turned off.
      if (settings.emailDailySummary === false) { skipped.push(`${b.id}: opted out`); continue; }

      const { data: profile } = await admin
        .from("profiles").select("email").eq("id", b.owner_id).maybeSingle();
      const to = profile?.email as string | undefined;
      if (!to) { skipped.push(`${b.id}: no owner email`); continue; }

      // Don't email the same summary twice in one day.
      const { data: existing } = await admin
        .from("ai_summaries").select("email_sent_at")
        .eq("business_id", b.id).eq("summary_date", today).maybeSingle();
      if (existing?.email_sent_at) { skipped.push(`${b.id}: already sent today`); continue; }

      const { summary } = await getOrCreateDailySummary(admin, {
        id: b.id, name: b.name as string, industry: b.industry as string | null,
      });
      if (!summary) { skipped.push(`${b.id}: no summary (quiet day)`); continue; }

      const subject = `Your daily summary — ${b.name}`;
      const res = await sendEmail({ to, subject, html: buildHtml(b.name as string, summary, APP_URL), text: summary });

      if (res.success) {
        sent++;
        await admin
          .from("ai_summaries")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("business_id", b.id).eq("summary_date", today);
      } else {
        errors.push(`${b.id}: ${res.error}`);
      }
    }

    return json({ sent, skipped, errors });
  } catch (error) {
    console.error("send-daily-summary error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
