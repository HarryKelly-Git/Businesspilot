import React from 'react';
import { Zap } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

interface SubscriptionBadgeProps {
  businessId: string | null;
}

export default function SubscriptionBadge({ businessId }: SubscriptionBadgeProps) {
  const { subscription, loading } = useSubscription(businessId);

  if (loading || !subscription) return null;

  return (
    <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2.5 py-1">
      <Zap className="w-3 h-3 text-indigo-400" />
      <span className="text-indigo-400 text-xs font-semibold">{subscription.planName}</span>
    </div>
  );
}