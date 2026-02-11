import { useSubscription } from "@/hooks/use-subscription";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, ArrowRight, Lock } from "lucide-react";

type UpgradeBannerProps = {
  feature: string;
  description?: string;
  requiredTier?: "starter" | "pro" | "ultimate";
  blocking?: boolean;
};

export function UpgradeBanner({ feature, description, requiredTier = "starter", blocking = false }: UpgradeBannerProps) {
  const { data: subData } = useSubscription();
  const [, navigate] = useLocation();

  const userTier = subData?.tier || null;
  const tierOrder = { starter: 1, pro: 2, ultimate: 3 };
  const userLevel = userTier ? tierOrder[userTier] : 0;
  const requiredLevel = tierOrder[requiredTier];

  if (userLevel >= requiredLevel) return null;

  const tierLabel = requiredTier === "starter" ? "Starter" : requiredTier === "pro" ? "Pro" : "Ultimate";

  if (blocking) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-primary/20">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2" data-testid="text-upgrade-title">{feature}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {description || `This feature is available on the ${tierLabel} plan and above. Upgrade now to unlock it.`}
          </p>
          <Button onClick={() => navigate("/subscription")} className="gap-2" data-testid="button-upgrade-banner">
            <Crown className="h-4 w-4" />
            View Plans
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <Card className="mx-4 sm:mx-6 mt-4 p-4 sm:p-5 border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent" data-testid="upgrade-banner">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Crown className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">{feature}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {description || `Upgrade to ${tierLabel} or above to unlock this feature.`}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate("/subscription")} className="gap-1.5 whitespace-nowrap" data-testid="button-upgrade-inline">
          Upgrade
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}
