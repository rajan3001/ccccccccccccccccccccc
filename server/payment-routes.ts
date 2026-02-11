import type { Express } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import { PLAN_CATALOG, type PlanCode } from "@shared/schema";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const planIdCache: Record<string, string> = {};

async function getOrCreateRazorpayPlan(planCode: PlanCode): Promise<string> {
  if (planIdCache[planCode]) return planIdCache[planCode];

  const plan = PLAN_CATALOG[planCode];
  const amountInPaise = plan.amount * 100;

  try {
    const plans = await razorpay.plans.all({ count: 100 });
    const existing = (plans as any).items?.find(
      (p: any) =>
        p.item?.amount === amountInPaise &&
        p.period === plan.period &&
        p.interval === plan.interval &&
        p.item?.currency === plan.currency
    );

    if (existing) {
      planIdCache[planCode] = existing.id;
      return existing.id;
    }
  } catch (e) {
  }

  const created = await razorpay.plans.create({
    period: plan.period,
    interval: plan.interval,
    item: {
      name: `Learnpro AI - ${plan.label}`,
      amount: amountInPaise,
      currency: plan.currency,
      description: `${plan.label} subscription for Learnpro AI`,
    },
  });

  planIdCache[planCode] = created.id;
  return created.id;
}

const validPlanCodes = [
  "starter_monthly", "starter_6months", "starter_yearly",
  "pro_monthly", "pro_6months", "pro_yearly",
  "ultimate_monthly", "ultimate_6months", "ultimate_yearly",
  "monthly", "6months", "yearly",
] as const;

const createOrderSchema = z.object({
  planCode: z.enum(validPlanCodes),
});

const verifyPaymentSchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_subscription_id: z.string(),
  razorpay_signature: z.string(),
});

const reconcileThrottle = new Map<string, number>();

export async function reconcilePendingSubscription(userId: string): Promise<boolean> {
  try {
    const lastAttempt = reconcileThrottle.get(userId) || 0;
    if (Date.now() - lastAttempt < 60_000) {
      return false;
    }
    reconcileThrottle.set(userId, Date.now());

    const sub = await storage.getSubscription(userId);
    if (!sub || sub.status !== "pending" || !sub.razorpaySubscriptionId) {
      return false;
    }

    const createdAt = sub.createdAt ? new Date(sub.createdAt).getTime() : 0;
    const hoursSinceCreation = (Date.now() - createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreation > 72) {
      return false;
    }

    const razorpaySub = await razorpay.subscriptions.fetch(sub.razorpaySubscriptionId);
    const subStatus = (razorpaySub as any).status;
    const paidCount = (razorpaySub as any).paid_count || 0;

    if (subStatus === "active" && paidCount > 0) {
      const planCode = sub.plan as PlanCode;
      const plan = PLAN_CATALOG[planCode];
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + (plan?.durationDays || 30));

      let realPaymentId = "";
      try {
        const payments = await (razorpay.subscriptions as any).fetchPayments(sub.razorpaySubscriptionId);
        const items = payments?.items || payments || [];
        const captured = items.find((p: any) => p.status === "captured");
        if (captured) {
          realPaymentId = captured.id;
        }
      } catch (e) {
      }

      if (!realPaymentId) {
        console.log(`[RECONCILE] Razorpay sub ${sub.razorpaySubscriptionId} active but no captured payment found`);
        return false;
      }

      const realSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(`${realPaymentId}|${sub.razorpaySubscriptionId}`)
        .digest("hex");

      await storage.activateByRazorpaySub(
        sub.razorpaySubscriptionId,
        realPaymentId,
        realSignature,
        periodEnd
      );

      console.log(`[RECONCILE] Activated subscription for user ${userId}, payment: ${realPaymentId}, razorpay sub: ${sub.razorpaySubscriptionId}`);
      return true;
    }

    return false;
  } catch (error: any) {
    console.error("[RECONCILE] Error reconciling subscription:", error.message);
    return false;
  }
}

export function registerPaymentRoutes(app: Express, isAuthenticated: any) {
  app.post("/api/payments/razorpay/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      const { planCode } = parsed.data;
      const plan = PLAN_CATALOG[planCode as PlanCode];
      if (!plan) {
        return res.status(400).json({ message: "Plan not found" });
      }

      const userId = req.user.claims.sub;

      await storage.cleanupPendingSubscriptions(userId);

      const razorpayPlanId = await getOrCreateRazorpayPlan(planCode as PlanCode);

      const duration = (plan as any).duration || "monthly";
      let totalCount = 12;
      if (duration === "monthly") totalCount = 12;
      else if (duration === "6months") totalCount = 2;
      else totalCount = 1;

      const subscription = await razorpay.subscriptions.create({
        plan_id: razorpayPlanId,
        total_count: totalCount,
        quantity: 1,
        customer_notify: 0,
        notes: {
          userId,
          planCode,
          planLabel: plan.label,
        },
      });

      await storage.createSubscription({
        userId,
        status: "pending",
        plan: planCode,
        amount: plan.amount,
        currency: plan.currency,
        razorpaySubscriptionId: subscription.id,
        razorpayPlanId: razorpayPlanId,
      });

      res.json({
        subscriptionId: subscription.id,
        keyId: process.env.RAZORPAY_KEY_ID,
        planLabel: plan.label,
        amount: plan.amount,
      });
    } catch (error: any) {
      console.error("Razorpay subscription creation error:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.post("/api/payments/razorpay/verify", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = verifyPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid payment data" });
      }

      const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = parsed.data;
      const userId = req.user.claims.sub;

      const sub = await storage.getSubscriptionByRazorpaySubId(razorpay_subscription_id);
      if (!sub) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      if (sub.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (sub.status !== "pending") {
        return res.status(400).json({ message: "This subscription has already been processed" });
      }

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
        .digest("hex");

      if (razorpay_signature !== expectedSignature) {
        return res.status(400).json({ message: "Payment verification failed" });
      }

      const planCode = sub.plan as PlanCode;
      const plan = PLAN_CATALOG[planCode];
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + (plan?.durationDays || 30));

      const activated = await storage.activateByRazorpaySub(
        razorpay_subscription_id,
        razorpay_payment_id,
        razorpay_signature,
        periodEnd
      );

      if (!activated) {
        return res.status(500).json({ message: "Failed to activate subscription" });
      }

      res.json({ success: true, subscription: activated });
    } catch (error: any) {
      console.error("Payment verification error:", error);
      res.status(500).json({ message: "Payment verification failed" });
    }
  });

  app.post("/api/payments/razorpay/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activeSub = await storage.getActiveSubscription(userId);

      if (!activeSub || !activeSub.razorpaySubscriptionId) {
        return res.status(404).json({ message: "No active subscription found" });
      }

      await (razorpay.subscriptions as any).cancel(activeSub.razorpaySubscriptionId, { cancel_at_cycle_end: true });
      const cancelled = await storage.cancelSubscription(userId);

      res.json({ success: true, subscription: cancelled });
    } catch (error: any) {
      console.error("Subscription cancellation error:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });
}
