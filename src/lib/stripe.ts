import Stripe from "stripe";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: "2026-09-30.endive",
    typescript: true,
  });
}

export const stripe = getStripe();

export function isStripeConfigured(): boolean {
  return stripe !== null && !!process.env.STRIPE_PUBLISHABLE_KEY;
}

export function getPublishableKey(): string | null {
  return process.env.STRIPE_PUBLISHABLE_KEY ?? null;
}