const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface IncomingMessageResponse {
  success: boolean;
  lead_id: string;
  message: string;
  error?: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  source: string;
  urgency: string;
  service_needed: string | null;
  last_message: string | null;
  created_at: string;
}

interface LeadsResponse {
  success: boolean;
  leads: Lead[];
  count: number;
  error?: string;
}

interface GenerateResponse {
  success: boolean;
  response: string;
  error?: string;
}

interface MarkBookedResponse {
  success: boolean;
  lead_id: string;
  status: string;
  error?: string;
}

export async function sendIncomingMessage(
  phone: string,
  message: string,
  name?: string,
  businessId?: string,
  source: string = 'sms'
): Promise<IncomingMessageResponse> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/incoming-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone,
      message,
      name,
      business_id: businessId,
      source,
    }),
  });

  const data = await response.json();
  return data as IncomingMessageResponse;
}

export async function fetchLeads(businessId?: string): Promise<LeadsResponse> {
  let url = `${SUPABASE_URL}/functions/v1/leads`;
  if (businessId) {
    url += `?business_id=${businessId}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  return data as LeadsResponse;
}

export async function generateAIResponse(
  message: string,
  businessId?: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<GenerateResponse> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      business_id: businessId,
      conversation_history: conversationHistory,
    }),
  });

  const data = await response.json();
  return data as GenerateResponse;
}

export async function markLeadBooked(leadId: string, status: string): Promise<MarkBookedResponse> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/mark-booked`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lead_id: leadId,
      status,
    }),
  });

  const data = await response.json();
  return data as MarkBookedResponse;
}
