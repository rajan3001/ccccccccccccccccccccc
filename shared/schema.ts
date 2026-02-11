export * from "./models/auth";
export * from "./models/chat";
export * from "./models/current-affairs";
export * from "./models/quiz";
export * from "./models/evaluation";
export * from "./models/notes";
export * from "./models/study-planner";
export * from "./models/study-progress";

import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export const PLAN_CATALOG = {
  monthly: { code: "monthly", label: "Monthly", amount: 299, currency: "INR", durationDays: 30, period: "monthly" as const, interval: 1 },
  "6months": { code: "6months", label: "6 Months", amount: 1200, currency: "INR", durationDays: 180, period: "monthly" as const, interval: 6 },
  yearly: { code: "yearly", label: "1 Year", amount: 2000, currency: "INR", durationDays: 365, period: "yearly" as const, interval: 1 },
} as const;

export type PlanCode = keyof typeof PLAN_CATALOG;

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
