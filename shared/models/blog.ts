import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  metaTitle: text("meta_title").notNull(),
  metaDescription: text("meta_description").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  htmlContent: text("html_content").notNull(),
  coverImageUrl: text("cover_image_url"),
  coverImageAlt: text("cover_image_alt"),
  category: text("category").notNull().default("general"),
  tags: text("tags").array().notNull().default([]),
  readingTimeMinutes: integer("reading_time_minutes").default(5),
  published: boolean("published").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  sourceUrl: text("source_url"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;

export const BLOG_CATEGORIES = [
  "upsc-strategy",
  "current-affairs",
  "gs-paper-1",
  "gs-paper-2",
  "gs-paper-3",
  "gs-paper-4",
  "csat",
  "essay",
  "state-psc",
  "answer-writing",
  "booklist",
  "motivation",
  "general",
] as const;

export type BlogCategory = typeof BLOG_CATEGORIES[number];
