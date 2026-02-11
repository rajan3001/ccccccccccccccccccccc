import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown, Clock, FileCheck, LayoutDashboard, ArrowRight, Bell } from "lucide-react";
import { useLocation } from "wouter";

type TabKey = "billing" | "notifications";

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const { data: subData } = useSubscription();
  const [activeTab, setActiveTab] = useState<TabKey>("billing");

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPro = subData?.isPro;
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <h1 className="text-2xl font-bold mb-6" data-testid="text-settings-heading">Settings</h1>

          <div className="flex gap-1 mb-6 border-b border-border">
            <button
              onClick={() => setActiveTab("billing")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "billing"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-billing"
            >
              Billing Details
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "notifications"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-notifications"
            >
              Notification Settings
            </button>
          </div>

          {activeTab === "billing" && (
            <div className="space-y-5">
              <Card className="p-5 sm:p-6">
                <Badge variant={isPro ? "default" : "secondary"} className="mb-4 text-xs font-bold uppercase">
                  {isPro ? "PRO" : "FREE"}
                </Badge>
                <p className="text-sm text-foreground font-medium mb-3">
                  You have {isPro ? "unlimited" : "limited"} access with -
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span>{isPro ? "Unlimited queries / day" : "2 queries / day"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <FileCheck className="h-4 w-4 flex-shrink-0" />
                    <span>{isPro ? "Unlimited Mains evaluations" : "3 Mains evaluations / month"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                    <span>{isPro ? "Full access to all features" : "Limited access in dashboard"}</span>
                  </div>
                </div>
              </Card>

              {!isPro && (
                <Card className="p-5 sm:p-6 border-primary/30 bg-primary/5 dark:bg-primary/10">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Crown className="h-4 w-4 text-primary" />
                        Upgrade Your Plan
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Continue your preparation with <span className="font-bold text-foreground">Unlimited Access</span> of Learnpro AI
                      </p>
                    </div>
                    <Button className="gap-2 whitespace-nowrap" data-testid="button-upgrade-pro" onClick={() => navigate("/subscription")}>
                      View Plans
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <Card className="p-6 sm:p-8 text-center border-dashed">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="secondary" className="mb-3 text-xs font-bold uppercase">
                  Coming Soon
                </Badge>
                <h3 className="font-bold text-foreground mb-1.5" data-testid="text-notif-coming-soon">Notification Preferences</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  We're building Email and WhatsApp notifications for transaction updates, content alerts, and announcements. Stay tuned!
                </p>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
