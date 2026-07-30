import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Service-role client. Bypasses RLS — only use after the caller has been authorised. */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Verifies the caller's JWT from the Authorization header.
 * Returns the user id, or null when the token is missing/invalid/expired.
 */
export async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  // The anon key alone can't mint a session; getUser() validates the token signature
  // and expiry against the project's JWT secret.
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Resolves the business owned by this user. The caller never gets to choose which
 * business it operates on — that is derived from the verified token, not from input.
 */
export async function getOwnedBusinessId(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.id as string;
}

/** True when `businessId` is owned by `userId`. */
export async function ownsBusiness(
  admin: SupabaseClient,
  userId: string,
  businessId: string
): Promise<boolean> {
  const { data, error } = await admin
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", userId)
    .maybeSingle();

  return !error && !!data;
}

/**
 * Resolves the phone number to send owner alerts (e.g. emergency notifications)
 * to. Prefers an explicit `settings.alertPhone` override, then falls back to the
 * owner's profile phone. Returns the raw string (caller normalises to E.164), or
 * null when neither is set.
 */
export async function getOwnerAlertPhone(
  admin: SupabaseClient,
  businessId: string,
  settings: Record<string, unknown> | null
): Promise<string | null> {
  const override = settings?.alertPhone;
  if (typeof override === "string" && override.trim()) return override.trim();

  const { data: biz } = await admin
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (!biz?.owner_id) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("phone")
    .eq("id", biz.owner_id)
    .maybeSingle();

  const phone = profile?.phone;
  return typeof phone === "string" && phone.trim() ? phone.trim() : null;
}

/** True when `leadId` belongs to a business owned by `userId`. */
export async function ownsLead(
  admin: SupabaseClient,
  userId: string,
  leadId: string
): Promise<boolean> {
  const { data, error } = await admin
    .from("leads")
    .select("business_id, businesses!inner(owner_id)")
    .eq("id", leadId)
    .eq("businesses.owner_id", userId)
    .maybeSingle();

  return !error && !!data;
}
