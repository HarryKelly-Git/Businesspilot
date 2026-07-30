/**
 * Emergency detection for inbound customer messages.
 *
 * Deliberately keyword/regex based, NOT an AI call. Emergencies are precisely
 * when you cannot depend on the Anthropic API being up or fast — a burst pipe at
 * 2am must still page the owner if the model is down. This runs in microseconds,
 * costs nothing, and is the reliable floor. (An AI signal can be layered on later
 * for nuance, but must never be the only line of defence.)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOwnerAlertPhone } from "./auth.ts";
import { isPlatformNumber, sendSms, toE164 } from "./sms.ts";

export type Urgency = "low" | "normal" | "high" | "urgent";

export interface EmergencyResult {
  /** True only for genuine "call them now" situations (urgency === "urgent"). */
  isEmergency: boolean;
  urgency: Urgency;
  /** Short human label for the matched category, e.g. "Possible gas leak". Null when normal. */
  reason: string | null;
}

interface Rule {
  label: string;
  /** Word-boundary-aware pattern. Authoured lowercase; message is lowercased before test. */
  pattern: RegExp;
  /** When set, the rule only applies to these industries. Omit for all-trade rules. */
  industries?: string[];
}

// Rules that signal a genuine emergency across (most) trades. Ordered by
// specificity — the first match wins for the `reason` label.
const URGENT_RULES: Rule[] = [
  // Life-safety / property — apply to everyone.
  { label: "Possible gas leak", pattern: /\bgas\b.{0,15}\b(leak|leaking|smell|smells|smelling)\b|\bsmell\b.{0,15}\bgas\b/ },
  // Require an emergency context, not a bare token: "gas fire" (NZ = gas
  // fireplace) and "smoke alarm" are routine install/maintenance enquiries.
  { label: "Fire / smoke", pattern: /\bon fire\b|\bhouse (?:is )?(?:on )?fire\b|\bcatch(?:ing|es)? fire\b|smoke (?:coming|pouring|filling|billowing|everywhere)|\bsmell(?:s|ing)? (?:of )?(?:smoke|burning)\b|\bburning smell\b|\bflames\b/ },
  { label: "Electrical hazard", pattern: /\b(spark|sparks|sparking|exposed wire|exposed wires|live wire|electric shock|got a shock|shocked me)\b/ },
  { label: "Flooding / burst pipe", pattern: /\b(flood|flooded|flooding|burst pipe|pipe burst|pipe has burst|water (?:everywhere|gushing|pouring)|gushing water)\b/ },
  { label: "No power", pattern: /\b(no power|power(?:'s| is| has gone| gone)? out|lost power|power cut|no electricity|whole house.{0,10}(?:dark|no power))\b/ },
  { label: "Break-in / not secure", pattern: /\b(break[- ]?in|broken into|been robbed|door (?:won'?t|wont) lock|can'?t lock|house.{0,10}not secure)\b/ },
  { label: "Locked out", pattern: /\block(?:ed)? out\b/, industries: ["locksmith", "other"] },

  // Explicit emergency phrasing only. Soft words ("urgent"/"asap") are NOT here
  // — customers say them for routine quote requests too, so they'd spuriously
  // page the owner; they live in HIGH_RULES instead (sort up, no alert).
  { label: "Customer says emergency", pattern: /\b(emergency|right now|straight away|immediately|need someone now|come (?:out )?now)\b/ },

  // Trade-specific.
  { label: "No hot water", pattern: /\b(no hot water|hot water(?:'s| is)? (?:gone|out|not working)|cylinder(?:'s| has)? burst)\b/, industries: ["plumber", "hvac"] },
  { label: "No heating", pattern: /\b(no heat(?:ing)?|heating(?:'s| is)? (?:out|dead|not working)|freezing.{0,10}(?:no heat|heater))\b/, industries: ["hvac"] },
  { label: "Vehicle broken down / stranded", pattern: /\b(broken down|broke down|won'?t start|stranded|stuck on (?:the )?(?:side of the )?(?:road|motorway|highway))\b/, industries: ["mechanic"] },
  { label: "Animal in distress", pattern: /\b(bleeding|collapsed|not breathing|can'?t breathe|hit by (?:a )?car|seizure|fitting|unconscious|poisoned|ate something)\b/, industries: ["veterinary"] },
  { label: "Blocked / overflowing drain", pattern: /\b(sewage|raw sewage|overflow(?:ing)?|drain.{0,10}(?:overflow|block(?:ed|age)?)|toilet.{0,10}(?:overflow|block(?:ed|age)?)|block(?:ed|age)?.{0,10}(?:drain|toilet)|blocked (?:drain|toilet|pipe|loo)|toilet (?:won'?t|wont) flush)\b/, industries: ["plumber"] },
];

// Softer signals — worth flagging as "high" so they sort up, but not a page-the-owner emergency.
const HIGH_RULES: Rule[] = [
  { label: "Says it's urgent", pattern: /\b(urgent(?:ly)?|asap)\b/ },
  { label: "Today / same-day request", pattern: /\b(today|tonight|this (?:morning|afternoon|evening)|before (?:\d|noon|tonight))\b/ },
  { label: "Leak reported", pattern: /\b(leak|leaking|dripping)\b/, industries: ["plumber", "hvac", "builder"] },
];

function firstMatch(rules: Rule[], text: string, industry: string): string | null {
  for (const rule of rules) {
    if (rule.industries && !rule.industries.includes(industry)) continue;
    if (rule.pattern.test(text)) return rule.label;
  }
  return null;
}

/**
 * Classifies an inbound message. `industry` gates the trade-specific rules;
 * pass the business's industry id (e.g. "plumber") or null.
 */
export function detectEmergency(message: string, industry: string | null): EmergencyResult {
  const text = (message || "").toLowerCase();
  const ind = industry || "other";

  const urgentLabel = firstMatch(URGENT_RULES, text, ind);
  if (urgentLabel) {
    return { isEmergency: true, urgency: "urgent", reason: urgentLabel };
  }

  const highLabel = firstMatch(HIGH_RULES, text, ind);
  if (highLabel) {
    return { isEmergency: false, urgency: "high", reason: highLabel };
  }

  return { isEmergency: false, urgency: "normal", reason: null };
}

const URGENCY_RANK: Record<Urgency, number> = { low: 0, normal: 1, high: 2, urgent: 3 };

/**
 * Returns whichever urgency is more severe, so a lead's urgency is only ever
 * raised, never downgraded — across ALL levels (a normal→high bump is honoured,
 * not just normal→urgent). An unrecognised prior value is treated as "normal".
 */
export function raiseUrgency(prior: string | null | undefined, next: Urgency): Urgency {
  const p: Urgency = (["low", "normal", "high", "urgent"] as const).includes(prior as Urgency)
    ? (prior as Urgency)
    : "normal";
  return URGENCY_RANK[next] > URGENCY_RANK[p] ? next : p;
}

/** One-line excerpt of the customer's message for the alert SMS. */
function excerpt(message: string, max = 100): string {
  const clean = (message || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + "…" : clean;
}

/** Builds the owner-facing alert body. Kept short — ~2 SMS segments at most. */
export function buildOwnerAlert(
  leadName: string,
  leadPhone: string,
  message: string,
  reason: string | null
): string {
  const who = leadName && leadName !== leadPhone ? `${leadName} (${leadPhone})` : leadPhone;
  const why = reason ? ` [${reason}]` : "";
  return `🚨 EMERGENCY LEAD${why} — ${who}: "${excerpt(message)}". Call or text them now. — BusinessPilot`;
}

export interface AlertResult {
  alerted: boolean;
  /** When not alerted, why: "no-phone" | "send-failed" | "not-configured" | "loops-to-self". */
  skipped?: string;
}

/**
 * Texts the business owner about an emergency lead. Resolves the alert number
 * (settings.alertPhone override, else the owner's profile phone), sends, and
 * logs. NEVER throws — it runs alongside the customer reply and must not be able
 * to break it.
 */
export async function alertOwnerOfEmergency(
  admin: SupabaseClient,
  args: {
    businessId: string;
    settings: Record<string, unknown> | null;
    leadName: string;
    leadPhone: string;
    message: string;
    reason: string | null;
  }
): Promise<AlertResult> {
  try {
    const rawPhone = await getOwnerAlertPhone(admin, args.businessId, args.settings);
    if (!rawPhone) {
      console.warn(`[emergency] no alert phone for business ${args.businessId}; skipping owner SMS`);
      return { alerted: false, skipped: "no-phone" };
    }

    const to = toE164(rawPhone);
    // Never text our own inbound line — the alert body contains "EMERGENCY", so it
    // would re-enter twilio-webhook and loop, billing an SMS every cycle.
    if (isPlatformNumber(to)) {
      console.warn(
        `[emergency] alert phone for business ${args.businessId} is the platform SMS line; skipping to avoid a loop`
      );
      return { alerted: false, skipped: "loops-to-self" };
    }

    const body = buildOwnerAlert(args.leadName, args.leadPhone, args.message, args.reason);
    const res = await sendSms(to, body);

    if (!res.success) {
      console.error(`[emergency] owner alert send failed (code ${res.code}): ${res.error}`);
      return { alerted: false, skipped: res.code === undefined ? "not-configured" : "send-failed" };
    }

    console.log(`[emergency] owner alerted for business ${args.businessId} (sid ${res.sid})`);
    return { alerted: true };
  } catch (error) {
    console.error("[emergency] alertOwnerOfEmergency threw:", error);
    return { alerted: false, skipped: "send-failed" };
  }
}
