import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import type { PlanTier } from "@shared/schema";

type SubscriptionResponse = {
  isPro: boolean;
  isAdmin?: boolean;
  tier: PlanTier | null;
  subscription: {
    id: number;
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
    amount: number | null;
  } | null;
};

type RazorpaySubscribeResponse = {
  subscriptionId: string;
  keyId: string;
  planLabel: string;
  amount: number;
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function useSubscription() {
  return useQuery<SubscriptionResponse>({
    queryKey: ["/api/subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscription");
      if (res.status === 401) return { isPro: false, tier: null, subscription: null };
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    retry: false,
  });
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useRazorpayCheckout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const subscribeMutation = useMutation({
    mutationFn: async (planCode: string): Promise<RazorpaySubscribeResponse> => {
      const res = await fetch("/api/payments/razorpay/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to create subscription" }));
        throw new Error(err.message);
      }
      return res.json();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (paymentData: {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
    }) => {
      const res = await fetch("/api/payments/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Verification failed" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: "Payment Successful",
        description: "Your subscription is now active with auto-renewal. Enjoy all premium features!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const initiateCheckout = async (planCode: string) => {
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast({
          title: "Error",
          description: "Failed to load payment gateway. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const subData = await subscribeMutation.mutateAsync(planCode);

      const options = {
        key: subData.keyId,
        subscription_id: subData.subscriptionId,
        name: "Learnpro AI",
        description: `${subData.planLabel} Plan - Auto Renewal`,
        callback_url: `https://learnproai.in/subscription`,
        handler: async (response: any) => {
          await verifyMutation.mutateAsync({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        prefill: {},
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "Payment Cancelled",
              description: "You can upgrade anytime from the subscription page.",
            });
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on("payment.failed", (response: any) => {
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      });
      razorpayInstance.open();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not initiate payment",
        variant: "destructive",
      });
    }
  };

  return {
    initiateCheckout,
    isCreatingOrder: subscribeMutation.isPending,
    isVerifying: verifyMutation.isPending,
    isProcessing: subscribeMutation.isPending || verifyMutation.isPending,
  };
}
