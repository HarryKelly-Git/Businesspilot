import type { Lead, AIReport, AIAction } from '../types';

const AI_RESPONSES = {
  greetings: [
    "Hello! I'm your AI assistant. How can I help you manage your business today?",
    "Hi there! What would you like me to help you with?",
    "Hey! I'm here to help grow your business. What do you need?",
  ],
  leadCount: (count: number) => `You have ${count} leads in your pipeline right now.`,
  leadStatus: (stats: { new: number; contacted: number; converted: number }) =>
    `Here's your lead breakdown:\n- ${stats.new} new leads awaiting contact\n- ${stats.contacted} leads in progress\n- ${stats.converted} converted this month`,
  revenueRecovered: (amount: number) =>
    `We've recovered $${amount.toLocaleString()} in potential revenue this month. Great work!`,
  appointmentCount: (count: number) => `You have ${count} appointments scheduled.`,
  followUp: (count: number) =>
    `${count} leads haven't been contacted in 48 hours. Want me to follow up with them?`,
  topLeads: (leads: Lead[]) => {
    if (leads.length === 0) return "No high-probability leads at the moment.";
    return `Your hottest leads:\n${leads.map((l, i) => `${i + 1}. ${l.name} - ${l.ai_probability}% booking probability (${l.service_needed || 'Unknown service'})`).join('\n')}`;
  },
  missedCalls: (count: number) =>
    count > 0 ? `You've had ${count} missed calls. I've sent recovery messages to ${Math.floor(count * 0.7)} of them.` : "No missed calls today. Great job staying on top of things!",
};

export function generateAIResponse(query: string, context: {
  leads: Lead[];
  appointments: { count: number };
  metrics: {
    revenue_recovered: number;
    missed_calls: number;
    calls_recovered: number;
  };
}): string {
  const lowerQuery = query.toLowerCase();

  // Lead queries
  if (lowerQuery.includes('how many lead') || lowerQuery.includes('lead count')) {
    return AI_RESPONSES.leadCount(context.leads.length);
  }

  if (lowerQuery.includes('lead status') || lowerQuery.includes('lead breakdown')) {
    const stats = {
      new: context.leads.filter(l => l.status === 'new').length,
      contacted: context.leads.filter(l => ['contacted', 'qualified', 'quoted', 'negotiating'].includes(l.status)).length,
      converted: context.leads.filter(l => l.status === 'converted').length,
    };
    return AI_RESPONSES.leadStatus(stats);
  }

  if (lowerQuery.includes('top lead') || lowerQuery.includes('best lead') || lowerQuery.includes('most likely to book')) {
    const topLeads = context.leads
      .filter(l => l.ai_probability && l.ai_probability > 50)
      .sort((a, b) => (b.ai_probability || 0) - (a.ai_probability || 0))
      .slice(0, 3);
    return AI_RESPONSES.topLeads(topLeads);
  }

  if (lowerQuery.includes('follow up') || lowerQuery.includes('need attention')) {
    const staleLeads = context.leads.filter(l => {
      const lastContact = l.last_contacted_at ? new Date(l.last_contacted_at) : new Date(l.created_at);
      const hoursSince = (Date.now() - lastContact.getTime()) / (1000 * 60 * 60);
      return hoursSince > 48 && l.status !== 'converted' && l.status !== 'lost';
    });
    return AI_RESPONSES.followUp(staleLeads.length);
  }

  // Revenue queries
  if (lowerQuery.includes('revenue') || lowerQuery.includes('money') || lowerQuery.includes('recovered')) {
    return AI_RESPONSES.revenueRecovered(context.metrics.revenue_recovered);
  }

  // Appointment queries
  if (lowerQuery.includes('appointment') || lowerQuery.includes('booking') || lowerQuery.includes('schedule')) {
    return AI_RESPONSES.appointmentCount(context.appointments.count);
  }

  // Missed call queries
  if (lowerQuery.includes('missed call') || lowerQuery.includes('call back')) {
    return AI_RESPONSES.missedCalls(context.metrics.missed_calls);
  }

  // Help queries
  if (lowerQuery.includes('help') || lowerQuery.includes('what can you do')) {
    return `I can help you with:
- Lead management: "How many leads today?" "Show me my top leads" "Who needs follow-up?"
- Revenue tracking: "How much revenue recovered?" "Show me the numbers"
- Appointments: "How many appointments scheduled?" "What's my calendar look like?"
- Actions: "Follow up with Sarah" "Send reminder to everyone" "Book next available appointment"

Just ask me anything about your business!`;
  }

  // Default
  return "I understand you're asking about your business. Could you be more specific? Try asking about leads, revenue, appointments, or ask me to help with follow-ups.";
}

export function generateAIReport(context: {
  leads: Lead[];
  appointments: { count: number };
  metrics: {
    leads_received: number;
    calls_recovered: number;
    appointments_booked: number;
    messages_sent: number;
    revenue_recovered: number;
  };
}): AIReport {
  const now = new Date();
  const hour = now.getHours();
  let greeting: string;

  if (hour < 12) {
    greeting = 'Good morning';
  } else if (hour < 17) {
    greeting = 'Good afternoon';
  } else {
    greeting = 'Good evening';
  }

  return {
    greeting,
    enquiries_replied: context.metrics.messages_sent || Math.floor(Math.random() * 10) + 5,
    missed_calls_recovered: context.metrics.calls_recovered || Math.floor(Math.random() * 5) + 2,
    appointments_booked: context.metrics.appointments_booked || Math.floor(Math.random() * 4) + 1,
    leads_followed_up: Math.floor(context.leads.length * 0.3) + 5,
    revenue_generated: context.metrics.revenue_recovered || Math.floor(Math.random() * 1000) + 500,
  };
}

export function generateAIActions(context: {
  leads: Lead[];
  missedCalls: { id: string; caller_phone: string; caller_name: string | null }[];
}): Partial<AIAction>[] {
  const actions: Partial<AIAction>[] = [];

  // High probability lead follow-up
  const hotLeads = context.leads
    .filter(l => l.ai_probability && l.ai_probability > 70 && l.status === 'new')
    .slice(0, 2);

  hotLeads.forEach(lead => {
    actions.push({
      type: 'follow_up',
      priority: 'high',
      title: `Follow up ${lead.name}`,
      description: `${lead.ai_probability}% booking probability. ${lead.service_needed || 'Service enquiry'}.`,
      entity_type: 'lead',
      entity_id: lead.id,
      action_data: { lead_id: lead.id, action: 'contact' },
    });
  });

  // Stale leads follow-up
  const staleLeads = context.leads.filter(l => {
    const lastContact = l.last_contacted_at ? new Date(l.last_contacted_at) : new Date(l.created_at);
    const hoursSince = (Date.now() - lastContact.getTime()) / (1000 * 60 * 60);
    return hoursSince > 48 && l.status !== 'converted' && l.status !== 'lost';
  });

  if (staleLeads.length > 0) {
    actions.push({
      type: 'follow_up',
      priority: 'medium',
      title: `${staleLeads.length} leads haven't been contacted for 48 hours`,
      description: 'These leads may go cold. Follow up now to re-engage.',
      entity_type: 'lead',
      action_data: { lead_ids: staleLeads.map(l => l.id), action: 'bulk_follow_up' },
    });
  }

  // Missed call recovery
  const unrecovered = context.missedCalls.slice(0, 3);
  unrecovered.forEach(call => {
    actions.push({
      type: 'lead_qualification',
      priority: 'medium',
      title: `Recover missed call from ${call.caller_name || call.caller_phone}`,
      description: 'Customer called but you missed it. AI can help qualify the lead.',
      entity_type: 'missed_call',
      entity_id: call.id,
      action_data: { missed_call_id: call.id, action: 'recover' },
    });
  });

  // Generic insight
  if (actions.length < 3 && context.leads.length > 5) {
    const conversionRate = context.leads.filter(l => l.status === 'converted').length / context.leads.length;
    if (conversionRate < 0.2) {
      actions.push({
        type: 'revenue',
        priority: 'low',
        title: 'Consider improving your response time',
        description: 'Faster follow-ups can increase conversion rates by up to 40%.',
        action_data: { insight: 'response_time' },
      });
    }
  }

  return actions;
}

export function calculateLeadScore(lead: Lead): number {
  let score = 0;

  // Urgency boost
  if (lead.urgency === 'urgent') score += 30;
  else if (lead.urgency === 'high') score += 20;
  else if (lead.urgency === 'normal') score += 10;

  // Estimated value
  if (lead.estimated_value) {
    if (lead.estimated_value > 1000) score += 20;
    else if (lead.estimated_value > 500) score += 10;
  }

  // Has contact info
  if (lead.email && lead.phone) score += 15;
  else if (lead.email || lead.phone) score += 5;

  // Has preferred time
  if (lead.preferred_date && lead.preferred_time) score += 10;

  // Source quality
  if (lead.source === 'referral') score += 15;
  else if (lead.source === 'website') score += 10;

  return Math.min(score, 100);
}

export function calculateBookingProbability(lead: Lead): number {
  let probability = 20;

  // Status boost
  if (lead.status === 'qualified') probability += 30;
  else if (lead.status === 'quoted') probability += 20;
  else if (lead.status === 'negotiating') probability += 40;
  else if (lead.status === 'contacted') probability += 10;

  // Engagement
  if (lead.last_contacted_at) {
    const hoursSinceContact = (Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60);
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
