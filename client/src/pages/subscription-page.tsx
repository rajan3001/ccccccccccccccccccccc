import { useAuth } from "@/hooks/use-auth";
import { useSubscription, useUpgradeSubscription } from "@/hooks/use-subscription";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Check, Crown, Loader2, ShieldCheck, Zap } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Redirect } from "wouter";

export default function SubscriptionPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data: subData, isLoading: isSubLoading } = useSubscription();
  const upgradeMutation = useUpgradeSubscription();

  if (isAuthLoading) return null;
  if (!isAuthenticated) return <Redirect to="/" />;

  const isPro = subData?.isPro;

  const handleUpgrade = () => {
    upgradeMutation.mutate();
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto min-h-0 px-4 py-6 sm:p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-4xl font-display font-bold mb-3 sm:mb-4">Upgrade Your Preparation</h1>
            <p className="text-base sm:text-xl text-muted-foreground">
              Unlock the full potential of Learnpro AI for your exam success.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-start">
            {/* Free Plan */}
            <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-sm opacity-80">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <div className="text-3xl font-display font-bold mb-1">₹0</div>
              <p className="text-sm text-muted-foreground mb-6">Basic access</p>
              
              <ul className="space-y-3 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>2 queries per day</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Basic chat history</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Standard speed</span>
                </li>
              </ul>

              <Button variant="outline" className="w-full" disabled>
                {isPro ? "Free Plan" : "Current Plan"}
              </Button>
            </div>

            {/* Monthly Plan */}
            <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-sm">
              <h3 className="text-xl font-bold mb-2">Monthly</h3>
              <div className="text-3xl font-display font-bold mb-1">₹299<span className="text-sm font-sans font-normal text-muted-foreground">/mo</span></div>
              <p className="text-sm text-muted-foreground mb-6">Pay as you go</p>
              
              <ul className="space-y-3 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-medium">Unlimited queries</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-medium">All features</span>
                </li>
              </ul>

              <Button 
                onClick={handleUpgrade}
                disabled={isPro || upgradeMutation.isPending}
                className="w-full"
              >
                {upgradeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isPro ? "Active" : "Get Monthly"}
              </Button>
            </div>

            {/* 6 Month Plan */}
            <div className="relative p-5 sm:p-6 rounded-2xl border-2 border-primary bg-gradient-to-b from-primary/5 to-background shadow-xl shadow-primary/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                <Crown className="h-3 w-3" /> Best Value
              </div>

              <h3 className="text-xl font-bold mb-2">6 Months</h3>
              <div className="text-3xl font-display font-bold mb-1">₹1,200</div>
              <p className="text-sm text-muted-foreground mb-1">₹200/mo <span className="text-xs line-through text-muted-foreground/60">₹299/mo</span></p>
              <p className="text-xs text-green-600 font-medium mb-5">Save ₹594 (33% off)</p>
              
              <ul className="space-y-3 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-medium">Unlimited queries</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-medium">All features</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Crown className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-medium">Priority support</span>
                </li>
              </ul>

              <Button 
                onClick={handleUpgrade}
                disabled={isPro || upgradeMutation.isPending}
                className="w-full bg-primary shadow-lg shadow-primary/25"
              >
                {upgradeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isPro ? "Active" : "Get 6 Months"}
              </Button>
              {isPro && <p className="text-center text-xs text-green-600 mt-2 font-medium">Your plan is active</p>}
            </div>

            {/* Yearly Plan */}
            <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-sm">
              <h3 className="text-xl font-bold mb-2">1 Year</h3>
              <div className="text-3xl font-display font-bold mb-1">₹2,000</div>
              <p className="text-sm text-muted-foreground mb-1">₹167/mo <span className="text-xs line-through text-muted-foreground/60">₹299/mo</span></p>
              <p className="text-xs text-green-600 font-medium mb-5">Save ₹1,588 (44% off)</p>
              
              <ul className="space-y-3 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-medium">Unlimited queries</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-medium">All features</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Crown className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-medium">Priority support</span>
                </li>
              </ul>

              <Button 
                onClick={handleUpgrade}
                disabled={isPro || upgradeMutation.isPending}
                className="w-full"
              >
                {upgradeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isPro ? "Active" : "Get Yearly"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
