import { db } from "./db";
import { subscriptions, type Subscription, type InsertSubscription } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getSubscription(userId: string): Promise<Subscription | undefined>;
  getActiveSubscription(userId: string): Promise<Subscription | undefined>;
  getSubscriptionByOrderId(orderId: string): Promise<Subscription | undefined>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  updateSubscriptionStatus(userId: string, status: string): Promise<Subscription | undefined>;
  activateSubscription(orderId: string, paymentId: string, signature: string, periodEnd: Date): Promise<Subscription | undefined>;
  cleanupPendingSubscriptions(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return sub;
  }

  async getActiveSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return sub;
  }

  async getSubscriptionByOrderId(orderId: string): Promise<Subscription | undefined> {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.razorpayOrderId, orderId));
    return sub;
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const [newSub] = await db.insert(subscriptions).values(sub).returning();
    return newSub;
  }

  async updateSubscriptionStatus(userId: string, status: string): Promise<Subscription | undefined> {
    const [updated] = await db
      .update(subscriptions)
      .set({ status, updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId))
      .returning();
    return updated;
  }

  async activateSubscription(orderId: string, paymentId: string, signature: string, periodEnd: Date): Promise<Subscription | undefined> {
    const sub = await this.getSubscriptionByOrderId(orderId);
    if (sub) {
      await db
        .update(subscriptions)
        .set({ status: "expired", updatedAt: new Date() })
        .where(and(eq(subscriptions.userId, sub.userId), eq(subscriptions.status, "active")));
    }

    const [updated] = await db
      .update(subscriptions)
      .set({
        status: "active",
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        currentPeriodEnd: periodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.razorpayOrderId, orderId))
      .returning();
    return updated;
  }
  async cleanupPendingSubscriptions(userId: string): Promise<void> {
    await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "pending")));
  }
}

export const storage = new DatabaseStorage();
