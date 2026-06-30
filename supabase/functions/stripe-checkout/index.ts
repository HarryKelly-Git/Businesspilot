import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_STARTER_PRICE_ID = Deno.env.get("STRIPE_STARTER_PRICE_ID")!;
const STRIPE_GROWTH_PRICE_ID = Deno.env.get("STRIPE_GROWTH_PRICE_ID") || Deno.env.get("STRIPE_PROFESSIONAL_PRICE_ID")!;
const STRIPE_PRO_PRICE_ID = Deno.env.get("STRIPE_PRO_PRICE_ID") || Deno.env.get("STRIPE_BUSINESS_PRICE_ID")!;

// Support both naming conventions for backwards compatibility
const PRICE_IDS: Record<string, string> = {
  starter: STRIPE_STARTER_PRICE_ID,
  growth: STRIPE_GROWTH_PRICE_ID,
  pro: STRIPE_PRO_PRICE_ID,
  professional: STRIPE_GROWTH_PRICE_ID, // legacy alias
  business: STRIPE_PRO_PRICE_ID, // legacy alias
};

async function supabaseFetch(table: string, query: Record<string, string>, options: { method?: string; body?: unknown } = {}) {
  const params = new URLSearchParams(query);
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;

  const headers: Record<string, string> = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return response.json();
}

async function createStripeCustomer(email: string, name: string): Promise<string> {
  const response = await fetch("https://api.stripe.com/v1/customers", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      email,
      name,
    }),
  });

  const customer = await response.json();
  return customer.id;
}

async function createStripeCheckoutSession(
  customerId: string,
  priceId: string,
  businessId: string,
  planName: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      customer: customerId,
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: successUrl,
      cancel_url: cancelUrl,
      "metadata[business_id]": businessId,
      "metadata[plan_name]": planName,
    }),
  });

  const session = await response.json();
  return session.url;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { business_id, plan_name, success_url, cancel_url } = body as {
      business_id: string;
      plan_name: string;
      success_url?: string;
      cancel_url?: string;
    };

    if (!business_id || !plan_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceId = PRICE_IDS[plan_name.toLowerCase()];
    if (!priceId) {
      return new Response(JSON.stringify({ error: "Invalid plan name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get business details
    const businesses = await supabaseFetch(
      "businesses",
      { id: `eq.${business_id}`, select: "id,name,owner_id" },
      { method: "GET" }
    );

    if (!businesses || businesses.length === 0) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const business = businesses[0];

    // Get owner profile for email
    const profiles = await supabaseFetch(
      "profiles",
      { id: `eq.${business.owner_id}`, select: "id,email,full_name" },
      { method: "GET" }
    );

    const profile = profiles?.[0];
    const email = profile?.email;
    const name = profile?.full_name || business.name;

    if (!email) {
      return new Response(JSON.stringify({ error: "No email found for business owner" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing subscription
    const existingSubs = await supabaseFetch(
      "subscriptions",
      { business_id: `eq.${business_id}`, status: `eq.active`, select: "id,stripe_customer_id" },
      { method: "GET" }
    );

    let customerId: string;

    if (existingSubs && existingSubs.length > 0 && existingSubs[0].stripe_customer_id) {
      customerId = existingSubs[0].stripe_customer_id;
    } else {
      // Create new Stripe customer
      customerId = await createStripeCustomer(email, name);
    }

    // Create checkout session
    const baseUrl = success_url?.split("/subscription")[0] || "https://app.businesspilot.ai";
    const finalSuccessUrl = success_url || `${baseUrl}/dashboard?subscription=success`;
    const finalCancelUrl = cancel_url || `${baseUrl}/subscription?canceled=true`;

    const checkoutUrl = await createStripeCheckoutSession(
      customerId,
      priceId,
      business_id,
      plan_name,
      finalSuccessUrl,
      finalCancelUrl
    );

    return new Response(JSON.stringify({ url: checkoutUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(JSON.stringify({ error: "Failed to create checkout session" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
