import { useAuth } from "@/hooks/use-auth";
import { useSubscription, useRazorpayCheckout } from "@/hooks/use-subscription";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2, ShieldCheck, Zap, Calendar } from "lucide-react";
import { Redirect } from "wouter";
import { PLAN_CATALOG } from "@shared/schema";

export default function SubscriptionPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data: subData, isLoading: isSubLoading } = useSubscription();
  const { initiateCheckout, isProcessing } = useRazorpayCheckout();

  if (isAuthLoading) return null;
  if (!isAuthenticated) return <Redirect to="/" />;

  const isPro = subData?.isPro;
  const activeSub = subData?.subscription;
  const periodEnd = activeSub?.currentPeriodEnd ? new Date(activeSub.currentPeriodEnd) : null;

  const plans = [
    {
      code: "free" as const,
      label: "Free",
      price: "0",
      priceLabel: "",
      subtitle: "Basic access",
      features: [
        { label: "2 queries per day", icon: Zap },
        { label: "Basic chat history", icon: Check },
        { label: "Standard speed", icon: Check },
      ],
      highlight: false,
    },
    {
      code: "monthly" as const,
      label: PLAN_CATALOG.monthly.label,
      price: `${PLAN_CATALOG.monthly.amount}`,
      priceLabel: "/mo",
      subtitle: "Pay as you go",
      features: [
        { label: "Unlimited queries", icon: Zap },
        { label: "All features", icon: ShieldCheck },
      ],
      highlight: false,
    },
    {
      code: "6months" as const,
      label: PLAN_CATALOG["6months"].label,
      price: `${PLAN_CATALOG["6months"].amount}`,
      priceLabel: "",
      subtitle: "200/mo",
      subtitleStrike: "299/mo",
      savings: "Save 594 (33% off)",
      features: [
        { label: "Unlimited queries", icon: Zap },
        { label: "All features", icon: ShieldCheck },
        { label: "Priority support", icon: Crown },
      ],
      highlight: true,
    },
    {
      code: "yearly" as const,
      label: PLAN_CATALOG.yearly.label,
      price: `${PLAN_CATALOG.yearly.amount}`,
      priceLabel: "",
      subtitle: "167/mo",
      subtitleStrike: "299/mo",
      savings: "Save 1,588 (44% off)",
      features: [
        { label: "Unlimited queries", icon: Zap },
        { label: "All features", icon: ShieldCheck },
        { label: "Priority support", icon: Crown },
      ],
      highlight: false,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto min-h-0 px-4 py-6 sm:p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-4xl font-display font-bold mb-3 sm:mb-4" data-testid="text-subscription-heading">
              Upgrade Your Preparation
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground" data-testid="text-subscription-subheading">
              Unlock the full potential of Learnpro AI for your exam success.
            </p>
            {isPro && periodEnd && (
              <Badge variant="outline" className="mt-4 text-green-600 dark:text-green-400 border-green-300 dark:border-green-600">
                <Calendar className="h-3 w-3 mr-1" />
                Active until {periodEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-start">
            {plans.map((plan) => {
              const isFree = plan.code === "free";
              const isCurrentPlan = isPro && activeSub?.plan === plan.code;

              return (
                <div
                  key={plan.code}
                  className={`p-5 sm:p-6 rounded-2xl shadow-sm ${
                    plan.highlight
                      ? "relative border-2 border-primary bg-gradient-to-b from-primary/5 to-background shadow-xl shadow-primary/10"
                      : "border border-border bg-card"
                  } ${isFree ? "opacity-80" : ""}`}
                  data-testid={`card-plan-${plan.code}`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <Crown className="h-3 w-3" /> Best Value
                    </div>
                  )}

                  <h3 className="text-xl font-bold mb-2">{plan.label}</h3>
                  <div className="text-3xl font-display font-bold mb-1">
                    {"\u20B9"}{plan.price}
                    {plan.priceLabel && (
                      <span className="text-sm font-sans font-normal text-muted-foreground">{plan.priceLabel}</span>
                    )}
                  </div>
                  {(plan as any).savings ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-1">
                        {"\u20B9"}{plan.subtitle}{" "}
                        <span className="text-xs line-through text-muted-foreground/60">
                          {"\u20B9"}{(plan as any).subtitleStrike}
                        </span>
                      </p>
                      <p className="text-xs text-green-600 font-medium mb-5">
                        {"\u20B9"}{(plan as any).savings}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-6">{plan.subtitle}</p>
                  )}

                  <ul className="space-y-3 mb-6 text-sm">
                    {plan.features.map((feat) => (
                      <li key={feat.label} className="flex items-center gap-2">
                        {isFree ? (
                          <feat.icon className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <feat.icon className="h-3 w-3 text-primary" />
                          </div>
                        )}
                        <span className={isFree ? "" : "font-medium"}>{feat.label}</span>
                      </li>
                    ))}
                  </ul>

                  {isFree ? (
                    <Button variant="outline" className="w-full" disabled data-testid="button-plan-free">
                      {isPro ? "Free Plan" : "Current Plan"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => initiateCheckout(plan.code)}
                      disabled={isProcessing || isCurrentPlan}
                      className={`w-full ${plan.highlight ? "bg-primary shadow-lg shadow-primary/25" : ""}`}
                      data-testid={`button-plan-${plan.code}`}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCurrentPlan ? (
                        "Active"
                      ) : (
                        `Get ${plan.label}`
                      )}
                    </Button>
                  )}
                  {isCurrentPlan && (
                    <p className="text-center text-xs text-green-600 mt-2 font-medium">Your plan is active</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
