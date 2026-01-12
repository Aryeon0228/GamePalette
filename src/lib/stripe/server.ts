import Stripe from 'stripe';

let stripe: Stripe | null = null;

export const getStripeServer = (): Stripe | null => {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn('Stripe secret key not configured');
      return null;
    }
    stripe = new Stripe(key, {
      // @ts-expect-error - Use latest API version
      apiVersion: '2024-12-18.acacia',
    });
  }
  return stripe;
};

export const isStripeServerConfigured = () => {
  return !!process.env.STRIPE_SECRET_KEY;
};
