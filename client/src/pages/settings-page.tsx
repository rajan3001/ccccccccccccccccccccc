import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useLanguage } from "@/i18n/context";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown, Clock, FileCheck, LayoutDashboard, ArrowRight, Bell, MessageSquare, Newspaper, Brain, StickyNote, CalendarCheck, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { TIER_INFO } from "@shared/schema";

type TabKey = "billing" | "notifications";

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const { data: subData } = useSubscription();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>("billing");

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPro = subData?.isPro;
  const userTier = subData?.tier || null;
  const tierLabel = userTier ? TIER_INFO[userTier].label : "Free";
  const [, navigate] = useLocation();

  const freeLimits = [
    { icon: MessageSquare, label: "10 AI chats / day" },
    { icon: Newspaper, label: "Current Affairs (last 2 days only)" },
    { icon: Brain, label: "No Practice Quiz" },
    { icon: FileCheck, label: "1 Paper Evaluation / month" },
    { icon: StickyNote, label: "No Save Notes" },
    { icon: CalendarCheck, label: "No Study Planner" },
    { icon: BarChart3, label: "No Study Progress" },
  ];

  const starterLimits = [
    { icon: MessageSquare, label: "50 AI chats / day" },
    { icon: Newspaper, label: "Full Current Affairs access" },
    { icon: Brain, label: "Limited Practice Quiz" },
    { icon: FileCheck, label: "2 Paper Evaluations / month" },
    { icon: StickyNote, label: "No Save Notes" },
    { icon: CalendarCheck, label: "No Study Planner" },
    { icon: BarChart3, label: "No Study Progress" },
  ];

  const proLimits = [
    { icon: MessageSquare, label: "Extended AI chats" },
    { icon: Newspaper, label: "Full Current Affairs access" },
    { icon: Brain, label: "Extended Practice Quiz" },
    { icon: FileCheck, label: "10 Paper Evaluations / month" },
    { icon: StickyNote, label: "My Notes" },
    { icon: CalendarCheck, label: "Study Planner" },
    { icon: BarChart3, label: "Study Progress" },
  ];

  const ultimateLimits = [
    { icon: MessageSquare, label: "Unlimited AI chats" },
    { icon: Newspaper, label: "Full Current Affairs access" },
    { icon: Brain, label: "Unlimited Practice Quiz" },
    { icon: FileCheck, label: "Unlimited Paper Evaluations" },
    { icon: StickyNote, label: "My Notes" },
    { icon: CalendarCheck, label: "Study Planner" },
    { icon: BarChart3, label: "Study Progress + Priority Support" },
  ];

  const currentLimits = userTier === "ultimate" ? ultimateLimits : userTier === "pro" ? proLimits : userTier === "starter" ? starterLimits : freeLimits;
  const isFreePlan = !userTier;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <h1 className="text-2xl font-bold mb-6" data-testid="text-settings-heading">{t.settings.title}</h1>

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
              {t.settings.billingDetails}
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
              {t.settings.notificationSettings}
            </button>
          </div>

          {activeTab === "billing" && (
            <div className="space-y-5">
              <Card className="p-5 sm:p-6">
                <Badge variant={isPro ? "default" : "secondary"} className="mb-4 text-xs font-bold uppercase">
                  {tierLabel}
                </Badge>
                <p className="text-sm text-foreground font-medium mb-3">
                  {isFreePlan ? "You have limited access with -" : `Your ${tierLabel} plan includes -`}
                </p>
                <div className="space-y-2.5">
                  {currentLimits.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {isFreePlan && (
                <Card className="p-5 sm:p-6 border-primary/30 bg-primary/5 dark:bg-primary/10">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Crown className="h-4 w-4 text-primary" />
                        {t.settings.upgradePlan}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Unlock more features starting at just <span className="font-bold text-foreground">{"\u20B9"}299/month</span>
                      </p>
                    </div>
                    <Button className="gap-2 whitespace-nowrap" data-testid="button-upgrade-pro" onClick={() => navigate("/subscription")}>
                      {t.settings.viewPlans}
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
                  {t.common.comingSoon}
                </Badge>
                <h3 className="font-bold text-foreground mb-1.5" data-testid="text-notif-coming-soon">{t.settings.notifComingSoon}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {t.settings.notifComingSoonDesc}
                </p>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
