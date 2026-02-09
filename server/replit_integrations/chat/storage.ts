import { db } from "../../db";
import { conversations, messages } from "@shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

export interface IChatStorage {
  getConversation(id: number): Promise<typeof conversations.$inferSelect | undefined>;
  getAllConversations(userId?: string): Promise<(typeof conversations.$inferSelect)[]>;
  createConversation(title: string, userId?: string): Promise<typeof conversations.$inferSelect>;
  updateConversationTitle(id: number, title: string): Promise<void>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<(typeof messages.$inferSelect)[]>;
  createMessage(conversationId: number, role: string, content: string, attachments?: any[]): Promise<typeof messages.$inferSelect>;
  getTodayUserMessageCount(userId?: string): Promise<number>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  },

  async getAllConversations(userId?: string) {
    const MAX_HISTORY = 20;
    const conditions = userId ? eq(conversations.userId, userId) : undefined;
    const allConvos = await db.select().from(conversations).where(conditions).orderBy(desc(conversations.createdAt));
    const nonEmpty = [];
    const toDelete = [];
    for (const convo of allConvos) {
      const [msgCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(eq(messages.conversationId, convo.id));
      if (msgCount?.count > 0) {
        nonEmpty.push(convo);
      } else {
        toDelete.push(convo.id);
      }
    }
    for (const id of toDelete) {
      await db.delete(conversations).where(eq(conversations.id, id));
    }
    if (nonEmpty.length > MAX_HISTORY) {
      const overflow = nonEmpty.slice(MAX_HISTORY);
      for (const convo of overflow) {
        await db.delete(messages).where(eq(messages.conversationId, convo.id));
        await db.delete(conversations).where(eq(conversations.id, convo.id));
      }
      return nonEmpty.slice(0, MAX_HISTORY);
    }
    return nonEmpty;
  },

  async createConversation(title: string, userId?: string) {
    const [conversation] = await db.insert(conversations).values({ title, userId }).returning();
    return conversation;
  },

  async updateConversationTitle(id: number, title: string) {
    await db.update(conversations).set({ title }).where(eq(conversations.id, id));
  },

  async deleteConversation(id: number) {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  },

  async createMessage(conversationId: number, role: string, content: string, attachmentsList?: any[]) {
    const [message] = await db.insert(messages).values({ 
      conversationId, 
      role, 
      content,
      attachments: attachmentsList || []
    }).returning();
    return message;
  },

  async getTodayUserMessageCount(userId?: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (!userId) {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(and(eq(messages.role, "user"), gte(messages.createdAt, todayStart)));
      return result?.count || 0;
    }
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(
        eq(messages.role, "user"),
        gte(messages.createdAt, todayStart),
        eq(conversations.userId, userId)
      ));
    return result?.count || 0;
  },
};

