import React from 'react';
import { Check, Zap, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { useCheckout } from '../hooks/useCheckout';
import { useSubscription } from '../hooks/useSubscription';

interface PricingPageProps {
  businessId?: string | null;
}

export default function PricingPage({ businessId = null }: PricingPageProps) {
  const navigate = useNavigate();
  const { subscription } = useSubscription(businessId);
  const { startCheckout, loading, error } = useCheckout();

  const products = Object.values(STRIPE_PRODUCTS);

  return (
    <div className="min-h-screen bg-gray-950 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm mb-10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-indigo-400 text-sm font-medium">Simple, transparent pricing</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Choose your plan</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Start free, scale as you grow. All plans billed monthly in NZD.
          </p>
        </div>

        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {products.map((product) => {
            const isCurrentPlan =
              subscription?.priceId === product.priceId ||
              subscription?.planName?.toLowerCase() === product.name.toLowerCase();
            const isPopular = 'popular' in product && product.popular;

            return (
              <div
                key={product.id}
                className={`relative rounded-2xl p-7 flex flex-col transition-all duration-200 ${
                  isPopular
                    ? 'bg-indigo-600 border border-indigo-500 shadow-2xl shadow-indigo-500/25 md:-mt-4 md:mb-4'
                    : 'bg-gray-900 border border-gray-800 hover:border-gray-700'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3.5 right-5 whitespace-nowrap">
                    <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      CURRENT PLAN
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 ${
                      isPopular ? 'bg-white/20' : 'bg-indigo-500/10'
                    }`}
                  >
                    <Zap className={`w-5 h-5 ${isPopular ? 'text-white' : 'text-indigo-400'}`} />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">{product.name}</h2>
                  <p className={`text-sm ${isPopular ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {product.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-7">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-sm font-medium ${isPopular ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {product.currencySymbol}
                    </span>
                    <span className="text-4xl font-bold text-white">{product.price.toFixed(0)}</span>
                    <span className={`text-sm ${isPopular ? 'text-indigo-200' : 'text-gray-500'}`}>/month</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <div
                        className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${
                          isPopular ? 'bg-white/20' : 'bg-indigo-500/20'
                        }`}
                      >
                        <Check className={`w-2.5 h-2.5 ${isPopular ? 'text-white' : 'text-indigo-400'}`} />
                      </div>
                      <span className={`text-sm ${isPopular ? 'text-indigo-100' : 'text-gray-300'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => !isCurrentPlan && !loading && startCheckout(product)}
                  disabled={loading || isCurrentPlan}
                  className={`w-full py-3 px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                    isCurrentPlan
                      ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                      : isPopular
                      ? 'bg-white text-indigo-700 hover:bg-indigo-50 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Redirecting...
                    </>
                  ) : isCurrentPlan ? (
                    'Active Plan'
                  ) : (
                    <>
                      Get started <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-gray-600 text-sm mt-10">
          All prices in New Zealand Dollars (NZD) · Billed monthly · Cancel anytime
        </p>
      </div>
    </div>
  );
}