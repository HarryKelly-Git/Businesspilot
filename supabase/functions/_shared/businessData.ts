import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * A COMPACT snapshot of a business, built for feeding to the AI cheaply.
 * We deliberately send aggregates and short lists — never whole tables — so the
 * input token count (and therefore the cost) stays small on every call.
 */
export interface BusinessSnapshot {
  name: string;
  industry: string;
  leads: {
    total: number;
    new: number;
    inProgress: number;
    converted: number;
    lost: number;
    thisWeek: number;
  };
  revenueRecoveredThisMonthNZD: number;
  pipelineValueNZD: number;
  recentLeads: Array<{
    name: string;
    status: string;
    service: string | null;
    valueNZD: number | null;
    ageHours: number;
  }>;
  upcomingAppointments: Array<{
    customer: string;
    service: string | null;
    date: string;
    time: string;
  }>;
  missedCalls: { total: number; recovered: number };
  /** Leads with no contact in 7+ days that aren't converted/lost. */
  needsFollowUp: number;
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

export async function fetchBusinessSnapshot(
  admin: SupabaseClient,
  businessId: string,
  businessName: string,
  industry: string | null
): Promise<BusinessSnapshot> {
  const now = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const today = new Date().toISOString().split("T")[0];

  const [{ data: leads }, { data: appts }, { data: calls }] = await Promise.all([
    admin
      .from("leads")
      .select("name, status, service_needed, estimated_value, created_at, last_contacted_at, converted_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("appointments")
      .select("customer_name, service_type, scheduled_date, scheduled_time, status")
      .eq("business_id", businessId)
      .gte("scheduled_date", today)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: true })
      .limit(5),
    admin
      .from("missed_calls")
      .select("recovered")
      .eq("business_id", businessId)
      .limit(1000),
  ]);

  const allLeads = leads || [];
  const counts = { total: allLeads.length, new: 0, inProgress: 0, converted: 0, lost: 0, thisWeek: 0 };
  let revenueThisMonth = 0;
  let pipeline = 0;
  let needsFollowUp = 0;

  for (const l of allLeads) {
    const status = l.status as string;
    if (status === "new") counts.new++;
    else if (status === "converted") counts.converted++;
    else if (status === "lost") counts.lost++;
    else counts.inProgress++;

    if (l.created_at && now - new Date(l.created_at).getTime() < WEEK_MS) counts.thisWeek++;

    const value = Number(l.estimated_value) || 0;
    if (status === "converted") {
      if (l.converted_at && new Date(l.converted_at) >= monthStart) revenueThisMonth += value;
    } else if (status !== "lost") {
      pipeline += value;
      const lastContact = l.last_contacted_at ? new Date(l.last_contacted_at).getTime() : new Date(l.created_at).getTime();
      if (now - lastContact > WEEK_MS) needsFollowUp++;
    }
  }

  const recentLeads = allLeads.slice(0, 8).map((l) => ({
    name: l.name as string,
    status: l.status as string,
    service: (l.service_needed as string) || null,
    valueNZD: l.estimated_value ? Number(l.estimated_value) : null,
    ageHours: Math.round((now - new Date(l.created_at as string).getTime()) / 3600000),
  }));

  const upcomingAppointments = (appts || []).map((a) => ({
    customer: a.customer_name as string,
    service: (a.service_type as string) || null,
    date: a.scheduled_date as string,
    time: a.scheduled_time as string,
  }));

  const missedCalls = {
    total: (calls || []).length,
    recovered: (calls || []).filter((c) => c.recovered).length,
  };

  return {
    name: businessName,
    industry: industry || "service business",
    leads: counts,
    revenueRecoveredThisMonthNZD: Math.round(revenueThisMonth),
    pipelineValueNZD: Math.round(pipeline),
    recentLeads,
    upcomingAppointments,
    missedCalls,
    needsFollowUp,
  };
}

/** Renders the snapshot as compact text for the model prompt. */
export function snapshotToText(s: BusinessSnapshot): string {
  const lines: string[] = [
    `Business: ${s.name} (${s.industry})`,
    `Leads — total ${s.leads.total}, new ${s.leads.new}, in progress ${s.leads.inProgress}, converted ${s.leads.converted}, lost ${s.leads.lost}, added this week ${s.leads.thisWeek}.`,
    `Revenue recovered this month: NZ$${s.revenueRecoveredThisMonthNZD}. Open pipeline value: NZ$${s.pipelineValueNZD}.`,
    `Missed calls: ${s.missedCalls.total} total, ${s.missedCalls.recovered} recovered.`,
    `Leads needing follow-up (no contact 7+ days): ${s.needsFollowUp}.`,
  ];

  if (s.recentLeads.length) {
    lines.push("Recent leads:");
    for (const l of s.recentLeads) {
      const v = l.valueNZD ? ` NZ$${l.valueNZD}` : "";
      const svc = l.service ? ` — ${l.service}` : "";
      lines.push(`- ${l.name} [${l.status}]${svc}${v} (${l.ageHours}h ago)`);
    }
  }

  if (s.upcomingAppointments.length) {
    lines.push("Upcoming jobs:");
    for (const a of s.upcomingAppointments) {
      lines.push(`- ${a.customer}${a.service ? " — " + a.service : ""} on ${a.date} at ${a.time}`);
    }
  }

  return lines.join("\n");
}
