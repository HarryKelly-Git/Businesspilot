import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Building2, Crown, ArrowRight, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { PRICING_PLANS } from '../types';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function SubscriptionPage() {
  const { business, subscription } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planName: string) => {
    setLoading(true);
    setSelectedPlan(planName);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business?.id,
          plan_name: planName.toLowerCase(),
          success_url: `${window.location.origin}/dashboard?subscription=success`,
          cancel_url: `${window.location.origin}/subscription?canceled=true`,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === 'Stripe not configured') {
        toast.error('Payment processing not configured. Please contact support.');
        window.location.href = '/contact';
      } else {
        toast.error(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      toast.error('Failed to connect to payment service');
      window.location.href = '/contact';
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const currentPlan = subscription?.plan_name || null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground">
            Start your 14-day free trial. No credit card required.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={`text-sm ${billingPeriod === 'monthly' ? 'font-medium' : 'text-muted-foreground'}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              billingPeriod === 'annual' ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${billingPeriod === 'annual' ? 'font-medium' : 'text-muted-foreground'}`}>
            Annual
            <Badge variant="success" className="ml-2">Save 20%</Badge>
          </span>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {PRICING_PLANS.map((plan) => {
            const price = billingPeriod === 'monthly' ? plan.price : plan.annualPrice;
            const isSelected = selectedPlan === plan.name;
            const isCurrentPlan = currentPlan === plan.name;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <Card
                  className={`p-6 h-full flex flex-col ${
                    plan.highlighted
                      ? 'border-primary shadow-lg'
                      : ''
                  } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                >
                  {/* Plan Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      {plan.name === 'Starter' && <Sparkles className="w-5 h-5 text-blue-500" />}
                      {plan.name === 'Professional' && <Crown className="w-5 h-5 text-primary" />}
                      {plan.name === 'Business' && <Building2 className="w-5 h-5 text-purple-500" />}
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {plan.name === 'Starter' && 'Perfect for getting started'}
                      {plan.name === 'Professional' && 'Best for growing businesses'}
                      {plan.name === 'Business' && 'For established businesses'}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Billed annually (${price * 12}/year)
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      variant={plan.highlighted ? 'primary' : 'outline'}
                      className="w-full"
                      onClick={() => handleSelectPlan(plan.name)}
                      loading={loading && isSelected}
                    >
                      {loading && isSelected ? (
                        'Processing...'
                      ) : (
                        <>
                          Start Free Trial
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Trust */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              Cancel anytime
            </div>
          </div>
        </div>

        {/* Payment Notice */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/50">
          <div className="flex gap-3">
            <Zap className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Production-Ready Payment Integration
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Stripe integration is configured. Click a plan to start the checkout process.
                If payment processing returns an error, please contact support.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to Home
          </Link>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and you'll be charged the prorated difference.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What happens after my trial?</h3>
              <p className="text-sm text-muted-foreground">
                After 14 days, you'll be asked to enter payment details to continue. If you don't, your account will be paused until you subscribe.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact support for a full refund.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards (Visa, Mastercard, American Express) through our secure Stripe integration.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
