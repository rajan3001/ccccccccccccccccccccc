import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  gsCategory: text("gs_category"),
  tags: jsonb("tags").$type<string[]>().default([]),
  folder: text("folder"),
  sourceMessageId: integer("source_message_id"),
  sourceConversationId: integer("source_conversation_id"),
  nextReviewAt: timestamp("next_review_at"),
  reviewCount: integer("review_count").default(0).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createNoteSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  gsCategory: z.string().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  folder: z.string().nullable().optional(),
  sourceMessageId: z.number().int().nullable().optional(),
  sourceConversationId: z.number().int().nullable().optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  gsCategory: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  folder: z.string().nullable().optional(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
