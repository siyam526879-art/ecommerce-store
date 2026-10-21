"use client";

import { useState } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) return null;
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

interface StripeCheckoutFormProps {
  clientSecret: string;
  orderNumber: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function StripeCheckoutForm({
  clientSecret,
  orderNumber,
  onSuccess,
  onError,
}: StripeCheckoutFormProps) {
  const stripe = getStripe();

  if (!stripe) {
    return (
      <div className="rounded-lg border bg-destructive/10 p-4 text-sm text-destructive">
        Payment system is not configured. Please contact support.
      </div>
    );
  }

  return (
    <Elements stripe={stripe} options={{ clientSecret }}>
      <CheckoutFormInner orderNumber={orderNumber} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}

function CheckoutFormInner({
  orderNumber,
  onSuccess,
  onError,
}: {
  orderNumber: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?order=${orderNumber}`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message ?? "Payment failed");
        onError(error.message ?? "Payment failed");
      } else {
        toast.success("Payment successful!");
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Payment failed");
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Lock className="h-3 w-3" />
        Your payment info is encrypted and processed securely by Stripe. We never see your card details.
      </div>
      <div className="rounded-lg border bg-background p-4">
        <PaymentElement />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
          </>
        ) : (
          "Pay now"
        )}
      </Button>
    </form>
  );
}