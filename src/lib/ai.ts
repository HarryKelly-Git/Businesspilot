import type { Lead } from '../types';

/**
 * Deterministic booking-probability heuristic used by the Leads list. It maps
 * real per-lead attributes (status, recency of contact, urgency, budget vs
 * value) to a 0–100 score — the same input always yields the same output. A
 * rule-based estimate, not a trained model, and it never invents data.
 *
 * NOTE: this file previously also held generateAIResponse / generateAIReport /
 * generateAIActions / calculateLeadScore. Those were removed in the fabrication
 * audit — they were unused (the live owner assistant runs on the owner-assistant
 * edge function) and filled missing metrics with Math.random() values, which is
 * exactly the kind of fake data this app must never present.
 */
export function calculateBookingProbability(lead: Lead): number {
  let probability = 20;

  // Status boost
  if (lead.status === 'qualified') probability += 30;
  else if (lead.status === 'quoted') probability += 20;
  else if (lead.status === 'negotiating') probability += 40;
  else if (lead.status === 'contacted') probability += 10;

  // Engagement
  if (lead.last_contacted_at) {
    const hoursSinceContact =
      (Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceContact < 24) probability += 15;
    else if (hoursSinceContact < 48) probability += 10;
    else if (hoursSinceContact < 72) probability += 5;
  }

  // Urgency
  if (lead.urgency === 'urgent') probability += 20;
  else if (lead.urgency === 'high') probability += 15;

  // Budget alignment
  if (lead.budget && lead.estimated_value) {
    const budgetNum = parseFloat(lead.budget.replace(/[^0-9.]/g, ''));
    if (budgetNum >= lead.estimated_value * 0.8) probability += 10;
  }

  return Math.min(Math.max(probability, 0), 100);
}
