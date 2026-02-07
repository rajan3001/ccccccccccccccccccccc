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
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-display font-bold mb-4">Upgrade Your Preparation</h1>
            <p className="text-xl text-muted-foreground">
              Unlock the full potential of Learnpro AI for your exam success.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Free Plan */}
            <div className="p-8 rounded-3xl border border-border bg-card shadow-sm opacity-80">
              <h3 className="text-2xl font-bold mb-2">Free Plan</h3>
              <div className="text-4xl font-display font-bold mb-6">₹0<span className="text-base font-sans font-normal text-muted-foreground">/month</span></div>
              <p className="text-muted-foreground mb-8">Basic access for casual learners.</p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Limited daily queries</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Standard response speed</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Basic chat history</span>
                </li>
              </ul>

              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="relative p-8 rounded-3xl border-2 border-primary bg-gradient-to-b from-primary/5 to-background shadow-xl shadow-primary/10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold shadow-lg flex items-center gap-1">
                <Crown className="h-3 w-3" /> Most Popular
              </div>

              <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                Pro Plan
              </h3>
              <div className="text-4xl font-display font-bold mb-6">₹999<span className="text-base font-sans font-normal text-muted-foreground">/month</span></div>
              <p className="text-muted-foreground mb-8">Everything serious aspirants need.</p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="font-medium">Unlimited queries</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="font-medium">Verified sources citation</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Crown className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="font-medium">Priority access to new models</span>
                </li>
              </ul>

              <Button 
                onClick={handleUpgrade}
                disabled={isPro || upgradeMutation.isPending}
                className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
              >
                {upgradeMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isPro ? (
                  "Active"
                ) : (
                  "Upgrade Now"
                )}
              </Button>
              {isPro && <p className="text-center text-sm text-green-600 mt-2 font-medium">Your plan is active</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
