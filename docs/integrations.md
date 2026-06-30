# Integration Setup Guide

This guide covers how to integrate the external services required for BusinessPilot AI.

## Table of Contents
1. [Stripe Integration](#stripe-integration)
2. [Twilio Integration](#twilio-integration)
3. [Environment Variables](#environment-variables)

---

## Stripe Integration

### 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Navigate to Developers > API Keys
3. Copy your **Secret Key** (starts with `sk_test_` for test mode)

### 2. Create Products and Prices

In Stripe Dashboard:
1. Go to Products > Add Product
2. Create three products: Starter, Professional, Business
3. For each, create a monthly recurring price
4. Copy the Price IDs (start with `price_`)

### 3. Create Webhook Endpoint

1. Go to Developers > Webhooks > Add endpoint
2. Enter your production URL: `https://your-domain.com/api/webhooks/stripe`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Signing Secret** (starts with `whsec_`)

### 4. Set Environment Variables

Add to your `.env` and Supabase Edge Functions secrets:

```
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_STARTER_PRICE_ID=price_xxxxx
STRIPE_PROFESSIONAL_PRICE_ID=price_xxxxx
STRIPE_BUSINESS_PRICE_ID=price_xxxxx
```

### 5. Set Supabase Secrets

Run these commands to set secrets for edge functions:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set STRIPE_STARTER_PRICE_ID=price_xxxxx
supabase secrets set STRIPE_PROFESSIONAL_PRICE_ID=price_xxxxx
supabase secrets set STRIPE_BUSINESS_PRICE_ID=price_xxxxx
```

---

## Twilio Integration

### 1. Create Twilio Account

1. Go to [twilio.com](https://twilio.com) and create an account
2. Purchase a phone number with SMS capabilities
3. Navigate to Console Dashboard
4. Copy your **Account SID** and **Auth Token**

### 2. Configure Phone Number

For your Twilio phone number:
1. Go to Phone Numbers > Manage > Active numbers
2. Click on your number
3. Under "Messaging", set the webhook URL for incoming messages:
   - `https://your-project.supabase.co/functions/v1/twilio-webhook`
4. Set HTTP method to POST

### 3. Set Environment Variables

Add to your `.env` and Supabase Edge Functions secrets:

```
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### 4. Set Supabase Secrets

```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxxxx
supabase secrets set TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

---

## Environment Variables

### Required for Production

| Variable | Source | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Supabase Dashboard | Frontend API URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard | Frontend anon key |
| `SUPABASE_URL` | Supabase Dashboard | Edge functions URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard | Edge functions admin key |
| `STRIPE_SECRET_KEY` | Stripe Dashboard | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard | Webhook verification |
| `TWILIO_ACCOUNT_SID` | Twilio Console | SMS messaging |
| `TWILIO_AUTH_TOKEN` | Twilio Console | SMS authentication |
| `TWILIO_PHONE_NUMBER` | Twilio Console | Sender phone number |

### Optional

| Variable | Source | Purpose |
|----------|--------|---------|
| `OPENAI_API_KEY` | OpenAI Platform | Enhanced AI responses |

---

## Database Schema Updates

After setting up Stripe, update your subscriptions table with real Stripe IDs:

```sql
-- Example: Link a subscription to Stripe
UPDATE subscriptions
SET
  stripe_customer_id = 'cus_xxxxx',
  stripe_subscription_id = 'sub_xxxxx',
  stripe_price_id = 'price_xxxxx'
WHERE business_id = 'your-business-uuid';
```

---

## Testing

### Stripe Testing
Use Stripe test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`

Any future expiry date and any 3-digit CVC works.

### Twilio Testing
1. Use the Twilio Console "Try it out" feature
2. Send a test SMS to your Twilio number
3. Verify the webhook receives the message
