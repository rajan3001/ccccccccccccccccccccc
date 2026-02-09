import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type SubscriptionResponse = {
  isPro: boolean;
  isAdmin?: boolean;
  subscription: {
    id: number;
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
    amount: number | null;
  } | null;
};

type RazorpayOrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  planLabel: string;
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
      if (res.status === 401) return { isPro: false, subscription: null };
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

  const createOrderMutation = useMutation({
    mutationFn: async (planCode: string): Promise<RazorpayOrderResponse> => {
      const res = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to create order" }));
        throw new Error(err.message);
      }
      return res.json();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (paymentData: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
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
        description: "Your subscription is now active. Enjoy all premium features!",
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

      const orderData = await createOrderMutation.mutateAsync(planCode);

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Learnpro AI",
        description: `${orderData.planLabel} Plan`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          await verifyMutation.mutateAsync({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        prefill: {},
        theme: {
          color: "#C47F17",
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

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (response: any) => {
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      });
      razorpay.open();
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
    isCreatingOrder: createOrderMutation.isPending,
    isVerifying: verifyMutation.isPending,
    isProcessing: createOrderMutation.isPending || verifyMutation.isPending,
  };
}
