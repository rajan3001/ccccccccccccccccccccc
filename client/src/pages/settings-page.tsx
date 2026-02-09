import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown, Clock, FileCheck, LayoutDashboard, ArrowRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

type TabKey = "billing" | "notifications";

const notificationCategories = [
  {
    key: "transaction",
    title: "Transaction updates",
    description: "Important notifications such as OTPs, payment receipts, etc.",
    channels: [
      { key: "transaction_email", label: "Email" },
      { key: "transaction_whatsapp", label: "WhatsApp" },
    ],
  },
  {
    key: "content",
    title: "Content updates",
    description: "Get updates for latest content, videos and notes",
    channels: [
      { key: "content_email", label: "Email" },
      { key: "content_whatsapp", label: "WhatsApp" },
    ],
  },
  {
    key: "announcements",
    title: "General announcements",
    description: "Get updates on new features releases and improvements. No spam!",
    channels: [
      { key: "announcements_email", label: "Email" },
      { key: "announcements_whatsapp", label: "WhatsApp" },
    ],
  },
  {
    key: "dna",
    title: "Daily News Analysis",
    description: "Get updates on Daily News Analysis and MCQ practice",
    channels: [
      { key: "dna_whatsapp", label: "WhatsApp" },
    ],
  },
];

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const { data: subData } = useSubscription();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("billing");
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(
    (user?.notificationPrefs as Record<string, boolean>) || {}
  );

  const updatePrefsMutation = useMutation({
    mutationFn: async (prefs: Record<string, boolean>) => {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPrefs: prefs }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const handleToggle = (key: string, checked: boolean) => {
    const newPrefs = { ...notifPrefs, [key]: checked };
    setNotifPrefs(newPrefs);
    updatePrefsMutation.mutate(newPrefs);
  };

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
              {notificationCategories.map((cat) => (
                <div key={cat.key}>
                  <h3 className="font-bold text-sm text-foreground" data-testid={`text-notif-${cat.key}`}>
                    {cat.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">{cat.description}</p>
                  <Card className="divide-y divide-border">
                    {cat.channels.map((ch) => (
                      <div key={ch.key} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-foreground">{ch.label}</span>
                        <Switch
                          checked={notifPrefs[ch.key] ?? true}
                          onCheckedChange={(checked) => handleToggle(ch.key, checked)}
                          data-testid={`switch-${ch.key}`}
                        />
                      </div>
                    ))}
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
