import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

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

async function verifyStripeSignature(payload: string, signature: string): Promise<unknown> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const parts = signature.split(",");
  let timestamp = "";
  let v1Signature = "";

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signature = value;
  }

  if (!timestamp || !v1Signature) {
    throw new Error("Invalid signature format");
  }

  const signedPayload = `${timestamp}.${payload}`;
  const signatureBuffer = Uint8Array.from(
    v1Signature.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBuffer,
    encoder.encode(signedPayload)
  );

  if (!isValid) {
    throw new Error("Invalid signature");
  }

  return JSON.parse(payload);
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
    const signature = req.headers.get("Stripe-Signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing Stripe signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    let event: unknown;

    try {
      event = await verifyStripeSignature(body, signature);
    } catch (err) {
      console.error("Signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventType = (event as Record<string, unknown>).type as string;
    const data = (event as Record<string, unknown>).data as Record<string, unknown>;
    const object = data.object as Record<string, unknown>;

    console.log(`Stripe webhook received: ${eventType}`);

    switch (eventType) {
      case "checkout.session.completed": {
        const sessionId = object.id as string;
        const customerId = object.customer as string;
        const subscriptionId = object.subscription as string;
        const metadata = object.metadata as Record<string, string> | undefined;
        const businessId = metadata?.business_id;

        if (businessId && subscriptionId) {
          // Create or update subscription record
          await supabaseFetch(
            "subscriptions",
            { select: "id" },
            {
              method: "POST",
              body: {
                business_id: businessId,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                stripe_price_id: object.display_items?.[0]?.price?.id || null,
                plan_name: metadata?.plan_name || "Professional",
                status: "active",
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              },
            }
          );
          console.log(`Subscription created for business ${businessId}`);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = object;
        const subscriptionId = subscription.id as string;
        const customerId = subscription.customer as string;
        const status = subscription.status as string;

        // Find existing subscription by stripe_subscription_id
        const existing = await supabaseFetch(
          "subscriptions",
          { stripe_subscription_id: `eq.${subscriptionId}`, select: "id,business_id" },
          { method: "GET" }
        );

        if (existing && existing.length > 0) {
          await supabaseFetch(
            "subscriptions",
            { id: `eq.${existing[0].id}` },
            {
              method: "PATCH",
              body: {
                status,
                current_period_start: subscription.current_period_start
                  ? new Date(subscription.current_period_start * 1000).toISOString()
                  : null,
                current_period_end: subscription.current_period_end
                  ? new Date(subscription.current_period_end * 1000).toISOString()
                  : null,
                cancel_at_period_end: subscription.cancel_at_period_end || false,
                updated_at: new Date().toISOString(),
              },
            }
          );
          console.log(`Subscription ${subscriptionId} updated to ${status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscriptionId = object.id as string;

        const existing = await supabaseFetch(
          "subscriptions",
            { stripe_subscription_id: `eq.${subscriptionId}`, select: "id" },
          { method: "GET" }
        );

        if (existing && existing.length > 0) {
          await supabaseFetch(
            "subscriptions",
            { id: `eq.${existing[0].id}` },
            {
              method: "PATCH",
              body: {
                status: "canceled",
                updated_at: new Date().toISOString(),
              },
            }
          );
          console.log(`Subscription ${subscriptionId} canceled`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const subscriptionId = object.subscription as string;
        if (subscriptionId) {
          const existing = await supabaseFetch(
            "subscriptions",
            { stripe_subscription_id: `eq.${subscriptionId}`, select: "id" },
            { method: "GET" }
          );

          if (existing && existing.length > 0) {
            await supabaseFetch(
              "subscriptions",
              { id: `eq.${existing[0].id}` },
              {
                method: "PATCH",
                body: {
                  status: "active",
                  updated_at: new Date().toISOString(),
                },
              }
            );
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const subscriptionId = object.subscription as string;
        if (subscriptionId) {
          const existing = await supabaseFetch(
            "subscriptions",
            { stripe_subscription_id: `eq.${subscriptionId}`, select: "id" },
            { method: "GET" }
          );

          if (existing && existing.length > 0) {
            await supabaseFetch(
              "subscriptions",
              { id: `eq.${existing[0].id}` },
              {
                method: "PATCH",
                body: {
                  status: "past_due",
                  updated_at: new Date().toISOString(),
                },
              }
            );
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing Stripe webhook:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
