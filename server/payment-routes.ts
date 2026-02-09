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

const createOrderSchema = z.object({
  planCode: z.enum(["monthly", "6months", "yearly"]),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export function registerPaymentRoutes(app: Express, isAuthenticated: any) {
  app.post("/api/payments/razorpay/order", isAuthenticated, async (req: any, res) => {
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
      const amountInPaise = plan.amount * 100;

      await storage.cleanupPendingSubscriptions(userId);

      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: plan.currency,
        receipt: `learnpro_${userId}_${Date.now()}`,
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
        razorpayOrderId: order.id,
      });

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        planLabel: plan.label,
      });
    } catch (error: any) {
      console.error("Razorpay order creation error:", error);
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  app.post("/api/payments/razorpay/verify", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = verifyPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid payment data" });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
      const userId = req.user.claims.sub;

      const sub = await storage.getSubscriptionByOrderId(razorpay_order_id);
      if (!sub) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (sub.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (sub.status !== "pending") {
        return res.status(400).json({ message: "This order has already been processed" });
      }

      const planCode = sub.plan as PlanCode;
      const plan = PLAN_CATALOG[planCode];
      if (!plan || (sub.amount && sub.amount !== plan.amount)) {
        return res.status(400).json({ message: "Plan amount mismatch" });
      }

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (razorpay_signature !== expectedSignature) {
        return res.status(400).json({ message: "Payment verification failed" });
      }

      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + (plan?.durationDays || 30));

      const activated = await storage.activateSubscription(
        razorpay_order_id,
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
}
