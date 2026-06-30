export const STRIPE_PRODUCTS = {
  starter: {
    id: 'prod_UlqIesjbAwvPTO',
    priceId: 'price_1TmIcDEFe1FsjxgbUXD3StKg',
    name: 'Starter',
    description: 'Perfect for solo operators.',
    features: [
      '100 conversations/month',
      'Lead capture & dashboard',
      'Basic automation',
      'Email support',
    ],
    price: 29.00,
    currency: 'NZD',
    currencySymbol: 'NZ$',
    mode: 'subscription' as const,
  },
  growth: {
    id: 'prod_UlqKUF8tXk2TpK',
    priceId: 'price_1TmIdaEFe1FsjxgbnszjhxXe',
    name: 'Growth',
    description: 'For growing businesses.',
    features: [
      '1,000 conversations/month',
      'Smart lead qualification',
      'Calendar booking',
      'SMS follow-up automation',
      'Priority support',
    ],
    price: 99.00,
    currency: 'NZD',
    currencySymbol: 'NZ$',
    mode: 'subscription' as const,
    popular: true,
  },
  pro: {
    id: 'prod_UlqMApdeRZYwXc',
    priceId: 'price_1TmIfWEFe1FsjxgbpTNaX6LS',
    name: 'Pro',
    description: 'Maximum coverage.',
    features: [
      'Unlimited conversations',
      'Team accounts',
      'Advanced automations',
      'Multiple business numbers',
      'Advanced reporting',
    ],
    price: 299.00,
    currency: 'NZD',
    currencySymbol: 'NZ$',
    mode: 'subscription' as const,
  },
} as const;

export type ProductKey = keyof typeof STRIPE_PRODUCTS;
export type StripeProduct = typeof STRIPE_PRODUCTS[ProductKey];