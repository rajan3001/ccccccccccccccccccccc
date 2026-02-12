export * from "./models/auth";
export * from "./models/chat";
export * from "./models/current-affairs";
export * from "./models/quiz";
export * from "./models/evaluation";
export * from "./models/notes";
export * from "./models/study-planner";
export * from "./models/study-progress";
export * from "./models/blog";

import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export type PlanTier = "starter" | "pro" | "ultimate";
export type PlanDuration = "monthly" | "6months" | "yearly";

export const TIER_INFO = {
  starter: { label: "Starter", order: 1 },
  pro: { label: "Pro", order: 2 },
  ultimate: { label: "Ultimate", order: 3 },
} as const;

export const PLAN_CATALOG = {
  starter_monthly:  { code: "starter_monthly",  tier: "starter" as PlanTier, duration: "monthly" as PlanDuration, label: "Starter Monthly",  amount: 299, currency: "INR", durationDays: 30,  period: "monthly" as const, interval: 1 },
  starter_6months:  { code: "starter_6months",  tier: "starter" as PlanTier, duration: "6months" as PlanDuration, label: "Starter 6 Months", amount: 1494, currency: "INR", durationDays: 180, period: "monthly" as const, interval: 6 },
  starter_yearly:   { code: "starter_yearly",   tier: "starter" as PlanTier, duration: "yearly" as PlanDuration,  label: "Starter Yearly",   amount: 2390, currency: "INR", durationDays: 365, period: "yearly" as const,  interval: 1 },
  pro_monthly:      { code: "pro_monthly",      tier: "pro" as PlanTier,     duration: "monthly" as PlanDuration, label: "Pro Monthly",      amount: 350, currency: "INR", durationDays: 30,  period: "monthly" as const, interval: 1 },
  pro_6months:      { code: "pro_6months",      tier: "pro" as PlanTier,     duration: "6months" as PlanDuration, label: "Pro 6 Months",     amount: 1750, currency: "INR", durationDays: 180, period: "monthly" as const, interval: 6 },
  pro_yearly:       { code: "pro_yearly",       tier: "pro" as PlanTier,     duration: "yearly" as PlanDuration,  label: "Pro Yearly",       amount: 2800, currency: "INR", durationDays: 365, period: "yearly" as const,  interval: 1 },
  ultimate_monthly: { code: "ultimate_monthly", tier: "ultimate" as PlanTier, duration: "monthly" as PlanDuration, label: "Ultimate Monthly", amount: 399, currency: "INR", durationDays: 30,  period: "monthly" as const, interval: 1 },
  ultimate_6months: { code: "ultimate_6months", tier: "ultimate" as PlanTier, duration: "6months" as PlanDuration, label: "Ultimate 6 Months", amount: 1994, currency: "INR", durationDays: 180, period: "monthly" as const, interval: 6 },
  ultimate_yearly:  { code: "ultimate_yearly",  tier: "ultimate" as PlanTier, duration: "yearly" as PlanDuration,  label: "Ultimate Yearly",  amount: 2790, currency: "INR", durationDays: 365, period: "yearly" as const,  interval: 1 },
} as const;

export type PlanCode = keyof typeof PLAN_CATALOG;

export function getTierFromPlan(planCode: string): PlanTier | null {
  const plan = PLAN_CATALOG[planCode as PlanCode];
  if (plan) return plan.tier;
  if (planCode === "monthly") return "ultimate";
  if (planCode === "6months") return "ultimate";
  if (planCode === "yearly") return "ultimate";
  return null;
}

export function tierHasAccess(userTier: PlanTier | null, requiredTier: PlanTier): boolean {
  if (!userTier) return false;
  const order: Record<PlanTier, number> = { starter: 1, pro: 2, ultimate: 3 };
  return order[userTier] >= order[requiredTier];
}

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  plan: text("plan").notNull().default("monthly"),
  amount: integer("amount"),
  currency: text("currency").default("INR"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpaySignature: text("razorpay_signature"),
  razorpaySubscriptionId: text("razorpay_subscription_id"),
  razorpayPlanId: text("razorpay_plan_id"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
