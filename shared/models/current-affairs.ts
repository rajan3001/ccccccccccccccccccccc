import { pgTable, serial, integer, text, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const dailyDigests = pgTable("daily_digests", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  generatedAt: timestamp("generated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const dailyTopics = pgTable("daily_topics", {
  id: serial("id").primaryKey(),
  digestId: integer("digest_id").notNull().references(() => dailyDigests.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  category: text("category").notNull(),
  gsCategory: text("gs_category").notNull(),
  relevance: text("relevance"),
  source: text("source"),
  revised: boolean("revised").default(false).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertDailyDigestSchema = createInsertSchema(dailyDigests).omit({
  id: true,
  generatedAt: true,
});

export const insertDailyTopicSchema = createInsertSchema(dailyTopics).omit({
  id: true,
  createdAt: true,
});

export type DailyDigest = typeof dailyDigests.$inferSelect;
export type InsertDailyDigest = z.infer<typeof insertDailyDigestSchema>;
export type DailyTopic = typeof dailyTopics.$inferSelect;
export type InsertDailyTopic = z.infer<typeof insertDailyTopicSchema>;
