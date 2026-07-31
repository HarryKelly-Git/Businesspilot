import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  corsHeaders,
  getAuthenticatedUserId,
  getOwnedBusinessId,
  json,
} from "../_shared/auth.ts";
// Reuse the existing, tested normaliser. We only IMPORT it — sms.ts (the parked
// SMS-sending path) is not modified.
import { toE164 } from "../_shared/sms.ts";

interface RawRecipient {
  name?: string;
  phone?: string;
  job_description?: string;
  quote_amount?: string | number;
  quote_date?: string;
}

interface ImportBody {
  name?: string;
  angle?: string;
  custom_message?: string;
  recipients?: RawRecipient[];
  confirmed?: boolean;
}

const ANGLES = ["checking_in", "availability", "seasonal", "custom"];

/** A plausible E.164 number: "+" then 8–15 digits. Rejects toE164's "+64" (empty national). */
function isPlausibleE164(e164: string): boolean {
  return /^\+\d{8,15}$/.test(e164);
}

/** Parse "$4,200" / "4200" / 4200 -> 4200, or null. */
function parseAmount(v: string | number | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Lenient date parse. Tries NZ day/month first, then ISO/native. Returns YYYY-MM-DD or null. */
function parseDate(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = "20" + y;
    const dd = d.padStart(2, "0");
    const mm = m.padStart(2, "0");
    if (+mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31) return `${y}-${mm}-${dd}`;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString().split("T")[0];
  return null;
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

    const body: ImportBody = await req.json();

    // Compliance gate: the owner must confirm these are prior contacts. Enforced
    // server-side so it can't be bypassed by calling the API directly.
    if (body.confirmed !== true) {
      return json({ error: "You must confirm these are people who previously contacted your business." }, 400);
    }

    const recipients = Array.isArray(body.recipients) ? body.recipients : [];
    if (recipients.length === 0) return json({ error: "No recipients to import" }, 400);
    if (recipients.length > 5000) return json({ error: "Import is limited to 5000 rows at a time" }, 400);

    const angle = ANGLES.includes(body.angle ?? "") ? body.angle! : "checking_in";
    const name = (body.name ?? "").trim() || `Campaign ${new Date().toISOString().split("T")[0]}`;

    // Suppression list for this business — never import an opted-out number as sendable.
    const { data: supRows } = await supabase
      .from("sms_suppressions")
      .select("phone")
      .eq("business_id", businessId);
    const suppressed = new Set((supRows ?? []).map((r) => r.phone as string));

    // Create the draft campaign first so recipients can reference it.
    const { data: campaign, error: campErr } = await supabase
      .from("resurrection_campaigns")
      .insert({
        business_id: businessId,
        name,
        angle,
        custom_message: body.custom_message ?? null,
        status: "draft",
      })
      .select("id")
      .single();

    if (campErr || !campaign) {
      console.error("Failed to create campaign:", campErr);
      return json({ error: "Could not create campaign" }, 500);
    }

    const rows: Record<string, unknown>[] = [];
    const skipped: Array<{ name: string; phone: string; reason: string }> = [];
    const seen = new Set<string>();
    let suppressedCount = 0;

    for (const r of recipients) {
      const rawPhone = (r.phone ?? "").toString().trim();
      const label = (r.name ?? "").toString().trim();
      if (!rawPhone) {
        skipped.push({ name: label, phone: "", reason: "no phone number" });
        continue;
      }
      const e164 = toE164(rawPhone);
      if (!isPlausibleE164(e164)) {
        skipped.push({ name: label, phone: rawPhone, reason: "not a valid phone number" });
        continue;
      }
      if (seen.has(e164)) {
        skipped.push({ name: label, phone: e164, reason: "duplicate in this import" });
        continue;
      }
      seen.add(e164);

      const isSuppressed = suppressed.has(e164);
      if (isSuppressed) suppressedCount++;

      rows.push({
        campaign_id: campaign.id,
        business_id: businessId,
        name: label || null,
        phone: e164,
        job_description: (r.job_description ?? "").toString().trim() || null,
        quote_amount: parseAmount(r.quote_amount),
        quote_date: parseDate(r.quote_date),
        // Opted-out numbers are imported for the record but never sendable.
        included: !isSuppressed,
        status: isSuppressed ? "suppressed" : "pending",
      });
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("resurrection_recipients").insert(rows);
      if (insErr) {
        console.error("Failed to insert recipients:", insErr);
        return json({ error: "Could not save imported leads" }, 500);
      }
    }

    return json({
      success: true,
      campaign_id: campaign.id,
      imported: rows.length,
      suppressed: suppressedCount,
      skipped,
    });
  } catch (error) {
    console.error("resurrection-import error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
