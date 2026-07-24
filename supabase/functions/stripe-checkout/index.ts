import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  corsHeaders,
  getAuthenticatedUserId,
  json,
} from "../_shared/auth.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://thebusinesspilot.com";

/**
 * Price IDs live in edge function secrets, never in frontend code — the client
 * sends a plan key and the server decides what that costs. Otherwise anyone
 * could post an arbitrary price_id and check out at a price of their choosing.
 */
const PRICE_IDS: Record<string, string | undefined> = {
  starter: Deno.env.get("STRIPE_STARTER_PRICE_ID"),
  growth: Deno.env.get("STRIPE_GROWTH_PRICE_ID") ?? Deno.env.get("STRIPE_PROFESSIONAL_PRICE_ID"),
  pro: Deno.env.get("STRIPE_PRO_PRICE_ID") ?? Deno.env.get("STRIPE_BUSINESS_PRICE_ID"),
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

async function stripeRequest(path: string, form: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  const data = await response.json();
  if (!response.ok) {
    console.error(`Stripe ${path} failed:`, data);
    throw new Error(data?.error?.message ?? "Stripe request failed");
  }
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      return json({ error: "Payments are not configured yet. Please contact support." }, 503);
    }

    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return json({ error: "You must be signed in to subscribe." }, 401);
    }

    const { plan_key } = (await req.json()) as { plan_key?: string };
    const planKey = (plan_key ?? "").toLowerCase();

    if (!PLAN_LABELS[planKey]) {
      return json({ error: "Unknown plan." }, 400);
    }

    const priceId = PRICE_IDS[planKey];
    if (!priceId) {
      // Surfaced verbatim to the user, so it says what's actually wrong.
      return json(
        { error: `The ${PLAN_LABELS[planKey]} plan isn't set up for payments yet. Please contact support.` },
        503
      );
    }

    const supabase = adminClient();

    // The business is derived from the token — the caller can't check out on
    // behalf of an account they don't own.
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, owner_id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (!business) {
      return json({ error: "Finish setting up your business before subscribing." }, 400);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    const email = profile?.email;
    if (!email) {
      return json({ error: "No email found on your account." }, 400);
    }

    // Reuse the Stripe customer if this business has subscribed before
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("business_id", business.id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripeRequest(
        "customers",
        new URLSearchParams({
          email,
          name: profile?.full_name || business.name,
          "metadata[business_id]": business.id,
        })
      );
      customerId = customer.id;
    }

    const session = await stripeRequest(
      "checkout/sessions",
      new URLSearchParams({
        customer: customerId!,
        mode: "subscription",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        success_url: `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/pricing`,
        "subscription_data[metadata][business_id]": business.id,
        "subscription_data[metadata][plan_name]": PLAN_LABELS[planKey],
        "metadata[business_id]": business.id,
        "metadata[plan_name]": PLAN_LABELS[planKey],
      })
    );

    return json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return json({ error: "Could not start checkout. Please try again." }, 500);
  }
});
