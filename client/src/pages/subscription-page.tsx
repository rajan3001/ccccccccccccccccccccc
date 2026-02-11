import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription, useRazorpayCheckout } from "@/hooks/use-subscription";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Check,
  Crown,
  Loader2,
  Zap,
  Calendar,
  MessageSquare,
  Newspaper,
  Brain,
  FileCheck,
  StickyNote,
  CalendarCheck,
  BarChart3,
  X,
  Sparkles,
} from "lucide-react";
import { Redirect } from "wouter";
import { PLAN_CATALOG, TIER_INFO, type PlanTier, type PlanDuration } from "@shared/schema";
import { cn } from "@/lib/utils";

type DurationOption = {
  key: PlanDuration;
  label: string;
  shortLabel: string;
};

const DURATIONS: DurationOption[] = [
  { key: "monthly", label: "Monthly", shortLabel: "Mo" },
  { key: "6months", label: "6 Months", shortLabel: "6M" },
  { key: "yearly", label: "1 Year", shortLabel: "1Y" },
];

type FeatureItem = {
  label: string;
  icon: any;
  starter: string | boolean;
  pro: string | boolean;
  ultimate: string | boolean;
};

const FEATURES: FeatureItem[] = [
  { label: "AI Chat", icon: MessageSquare, starter: "Limited", pro: "Extended", ultimate: true },
  { label: "Current Affairs", icon: Newspaper, starter: true, pro: true, ultimate: true },
  { label: "Practice Quiz", icon: Brain, starter: "Limited", pro: "Extended", ultimate: true },
  { label: "Paper Evaluation", icon: FileCheck, starter: "2/month", pro: "10/month", ultimate: true },
  { label: "My Notes", icon: StickyNote, starter: false, pro: true, ultimate: true },
  { label: "Study Planner", icon: CalendarCheck, starter: false, pro: true, ultimate: true },
  { label: "Study Progress", icon: BarChart3, starter: false, pro: true, ultimate: true },
  { label: "Priority Support", icon: Sparkles, starter: false, pro: false, ultimate: true },
];

function getPlanCode(tier: PlanTier, duration: PlanDuration): string {
  return `${tier}_${duration}`;
}

function getPlan(tier: PlanTier, duration: PlanDuration) {
  const code = getPlanCode(tier, duration) as keyof typeof PLAN_CATALOG;
  return PLAN_CATALOG[code];
}

function getMonthlyRate(tier: PlanTier, duration: PlanDuration): number {
  const plan = getPlan(tier, duration);
  if (duration === "monthly") return plan.amount;
  if (duration === "6months") return Math.round(plan.amount / 6);
  return Math.round(plan.amount / 12);
}

function getSavings(tier: PlanTier, duration: PlanDuration): number {
  if (duration === "monthly") return 0;
  const monthlyPlan = getPlan(tier, "monthly");
  const plan = getPlan(tier, duration);
  const months = duration === "6months" ? 6 : 12;
  return (monthlyPlan.amount * months) - plan.amount;
}

function getSavingsPercent(tier: PlanTier, duration: PlanDuration): number {
  if (duration === "monthly") return 0;
  const monthlyPlan = getPlan(tier, "monthly");
  const plan = getPlan(tier, duration);
  const months = duration === "6months" ? 6 : 12;
  const fullPrice = monthlyPlan.amount * months;
  return Math.round(((fullPrice - plan.amount) / fullPrice) * 100);
}

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
        <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
        <X className="h-3 w-3 text-muted-foreground/50" />
      </div>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] font-medium">
      {value}
    </Badge>
  );
}

export default function SubscriptionPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data: subData, isLoading: isSubLoading } = useSubscription();
  const { initiateCheckout, isProcessing } = useRazorpayCheckout();
  const [selectedDuration, setSelectedDuration] = useState<PlanDuration>("monthly");

  if (isAuthLoading) return null;
  if (!isAuthenticated) return <Redirect to="/" />;

  const currentTier = subData?.tier || null;
  const activeSub = subData?.subscription;
  const periodEnd = activeSub?.currentPeriodEnd ? new Date(activeSub.currentPeriodEnd) : null;

  const tiers: PlanTier[] = ["starter", "pro", "ultimate"];

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto min-h-0 px-4 py-6 sm:p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-display font-bold mb-2" data-testid="text-subscription-heading">
              Choose Your Study Plan
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto" data-testid="text-subscription-subheading">
              Pick the plan that matches your preparation needs. Upgrade anytime.
            </p>
            {currentTier && periodEnd && (
              <Badge variant="outline" className="mt-3 text-green-600 dark:text-green-400 border-green-300 dark:border-green-600">
                <Calendar className="h-3 w-3 mr-1" />
                {TIER_INFO[currentTier].label} active until {periodEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex items-center rounded-xl border bg-muted/50 p-1 gap-1" data-testid="duration-toggle">
              {DURATIONS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setSelectedDuration(d.key)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative",
                    selectedDuration === d.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover-elevate"
                  )}
                  data-testid={`button-duration-${d.key}`}
                >
                  <span className="hidden sm:inline">{d.label}</span>
                  <span className="sm:hidden">{d.shortLabel}</span>
                  {d.key !== "monthly" && selectedDuration === d.key && (
                    <span className="absolute -top-2 -right-1 text-[9px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/60 px-1.5 rounded-full">
                      Save
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-10">
            {tiers.map((tier) => {
              const plan = getPlan(tier, selectedDuration);
              const monthlyRate = getMonthlyRate(tier, selectedDuration);
              const savings = getSavings(tier, selectedDuration);
              const savingsPercent = getSavingsPercent(tier, selectedDuration);
              const isHighlighted = tier === "ultimate";
              const isCurrentTier = currentTier === tier;
              const tierLabel = tier === "starter" ? "Starter" : tier === "pro" ? "Pro" : "Ultimate";
              const tierSubtitle = tier === "starter"
                ? "Begin your journey"
                : tier === "pro"
                ? "Serious preparation"
                : "All-in for success";

              return (
                <Card
                  key={tier}
                  className={cn(
                    "relative p-5 sm:p-6 flex flex-col",
                    isHighlighted && "border-2 border-primary shadow-lg shadow-primary/10 bg-gradient-to-b from-primary/5 to-background"
                  )}
                  data-testid={`card-plan-${tier}`}
                >
                  {isHighlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <Crown className="h-3 w-3" /> Most Popular
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2" data-testid={`text-tier-${tier}`}>
                      {tier === "ultimate" && <Zap className="h-4 w-4 text-primary" />}
                      {tierLabel}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{tierSubtitle}</p>
                  </div>

                  <div className="mb-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-display font-bold">
                        {"\u20B9"}{selectedDuration === "monthly" ? plan.amount : monthlyRate}
                      </span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                    {selectedDuration !== "monthly" && (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs text-muted-foreground">
                          {"\u20B9"}{plan.amount} total
                          <span className="ml-1.5 line-through text-muted-foreground/50">
                            {"\u20B9"}{getPlan(tier, "monthly").amount * (selectedDuration === "6months" ? 6 : 12)}
                          </span>
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                          Save {"\u20B9"}{savings} ({savingsPercent}% off)
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="my-4 border-t" />

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {FEATURES.map((feat) => {
                      const val = feat[tier];
                      if (val === false) return null;
                      return (
                        <li key={feat.label} className="flex items-center gap-2.5 text-sm">
                          <div className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0",
                            val === true ? "bg-green-100 dark:bg-green-900/40" : "bg-primary/10"
                          )}>
                            {val === true ? (
                              <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                            ) : (
                              <feat.icon className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <span className="font-medium">{feat.label}</span>
                          {typeof val === "string" && (
                            <Badge variant="outline" className="ml-auto text-[10px]">{val}</Badge>
                          )}
                        </li>
                      );
                    })}
                    {tier !== "starter" && (
                      <li className="text-[11px] text-muted-foreground pt-1">
                        + Everything in {tier === "pro" ? "Starter" : "Pro"}
                      </li>
                    )}
                  </ul>

                  <Button
                    onClick={() => initiateCheckout(getPlanCode(tier, selectedDuration))}
                    disabled={isProcessing || isCurrentTier}
                    variant={isHighlighted ? "default" : "outline"}
                    className={cn("w-full", isHighlighted && "shadow-lg shadow-primary/20")}
                    data-testid={`button-plan-${tier}`}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrentTier ? (
                      "Current Plan"
                    ) : currentTier && TIER_INFO[currentTier]?.order > TIER_INFO[tier]?.order ? (
                      tierLabel
                    ) : (
                      `Get ${tierLabel}`
                    )}
                  </Button>
                  {isCurrentTier && (
                    <p className="text-center text-xs text-green-600 dark:text-green-400 mt-2 font-medium" data-testid="text-current-plan">
                      Your plan is active
                    </p>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="mb-10">
            <h2 className="text-lg font-bold text-center mb-6" data-testid="text-comparison-heading">Compare All Plans</h2>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-[40%]">Feature</th>
                      <th className="text-center px-3 py-3 font-semibold">Starter</th>
                      <th className="text-center px-3 py-3 font-semibold text-primary">Pro</th>
                      <th className="text-center px-3 py-3 font-semibold">Ultimate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FEATURES.map((feat, i) => (
                      <tr key={feat.label} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                        <td className="px-4 py-3 flex items-center gap-2">
                          <feat.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          {feat.label}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex justify-center"><FeatureValue value={feat.starter} /></div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex justify-center"><FeatureValue value={feat.pro} /></div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex justify-center"><FeatureValue value={feat.ultimate} /></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
