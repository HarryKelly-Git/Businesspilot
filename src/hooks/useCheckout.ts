import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ProductKey } from '../stripe-config';

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sends only the plan key. The edge function resolves that to a Stripe Price
   * ID from its own secrets, so the price can't be chosen by the client.
   */
  const startCheckout = async (planKey: ProductKey) => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error('You must be logged in to subscribe.');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ plan_key: planKey }),
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? 'Could not start checkout.');
      }

      if (payload.url) {
        window.location.href = payload.url;
      } else {
        throw new Error('Could not start checkout.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  };

  return { startCheckout, loading, error };
}
