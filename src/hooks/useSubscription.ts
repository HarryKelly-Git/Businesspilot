import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { STRIPE_PRODUCTS } from '../stripe-config';

export interface Subscription {
  id: string;
  status: string;
  planName: string;
  priceId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export function useSubscription(businessId: string | null) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('business_id', businessId)
          .eq('status', 'active')
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setSubscription({
            id: data.id,
            status: data.status,
            planName: data.plan_name,
            priceId: data.stripe_price_id ?? null,
            currentPeriodEnd: data.current_period_end ?? null,
            cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
          });
        } else {
          setSubscription(null);
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [businessId]);

  const getProductForSubscription = () => {
    if (!subscription) return null;
    return (
      Object.values(STRIPE_PRODUCTS).find(
        (p) =>
          p.priceId === subscription.priceId ||
          p.name.toLowerCase() === subscription.planName?.toLowerCase()
      ) ?? null
    );
  };

  return { subscription, loading, product: getProductForSubscription() };
}