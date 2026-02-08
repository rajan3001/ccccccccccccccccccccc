import type { Express } from "express";
import { db } from "./db";
import { notes, createNoteSchema, updateNoteSchema, type Note } from "@shared/schema";
import { eq, and, desc, ilike, or, sql, lte, isNotNull } from "drizzle-orm";
import { isAuthenticated } from "./replit_integrations/auth";

export function registerNotesRoutes(app: Express) {
  app.get("/api/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { search, gsCategory, folder, tag, dueForReview } = req.query;

      let query = db.select().from(notes).where(eq(notes.userId, userId));

      const conditions: any[] = [eq(notes.userId, userId)];

      if (search) {
        conditions.push(
          or(
            ilike(notes.title, `%${search}%`),
            ilike(notes.content, `%${search}%`)
          )
        );
      }

      if (gsCategory) {
        conditions.push(eq(notes.gsCategory, gsCategory as string));
      }

      if (folder) {
        conditions.push(eq(notes.folder, folder as string));
      }

      if (dueForReview === "true") {
        conditions.push(isNotNull(notes.nextReviewAt));
        conditions.push(lte(notes.nextReviewAt, new Date()));
      }

      const results = await db
        .select()
        .from(notes)
        .where(and(...conditions))
        .orderBy(desc(notes.updatedAt));

      let filtered = results;
      if (tag) {
        filtered = results.filter((n) => {
          const noteTags = (n.tags as string[]) || [];
          return noteTags.includes(tag as string);
        });
      }

      res.json(filtered);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  app.get("/api/notes/folders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const results = await db
        .selectDistinct({ folder: notes.folder })
        .from(notes)
        .where(and(eq(notes.userId, userId), sql`${notes.folder} IS NOT NULL`));
      res.json(results.map((r) => r.folder).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  app.get("/api/notes/tags", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allNotes = await db
        .select({ tags: notes.tags })
        .from(notes)
        .where(eq(notes.userId, userId));
      const tagSet = new Set<string>();
      allNotes.forEach((n) => {
        const noteTags = (n.tags as string[]) || [];
        noteTags.forEach((t) => tagSet.add(t));
      });
      res.json(Array.from(tagSet).sort());
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.get("/api/notes/due-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(notes)
        .where(
          and(
            eq(notes.userId, userId),
            isNotNull(notes.nextReviewAt),
            lte(notes.nextReviewAt, new Date())
          )
        );
      res.json({ count: Number(result[0]?.count || 0) });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch due count" });
    }
  });

  app.get("/api/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const noteId = parseInt(req.params.id);
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
      if (!note) return res.status(404).json({ error: "Note not found" });
      res.json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch note" });
    }
  });

  app.post("/api/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = createNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const now = new Date();
      const nextReview = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const [note] = await db
        .insert(notes)
        .values({
          userId,
          title: parsed.data.title,
          content: parsed.data.content,
          gsCategory: parsed.data.gsCategory || null,
          tags: parsed.data.tags || [],
          folder: parsed.data.folder || null,
          sourceMessageId: parsed.data.sourceMessageId || null,
          sourceConversationId: parsed.data.sourceConversationId || null,
          nextReviewAt: nextReview,
          reviewCount: 0,
        })
        .returning();

      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating note:", error);
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  app.patch("/api/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const noteId = parseInt(req.params.id);
      const parsed = updateNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const [existing] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
      if (!existing) return res.status(404).json({ error: "Note not found" });

      const [updated] = await db
        .update(notes)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(notes.id, noteId))
        .returning();

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  app.post("/api/notes/:id/review", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const noteId = parseInt(req.params.id);

      const [existing] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
      if (!existing) return res.status(404).json({ error: "Note not found" });

      const newCount = existing.reviewCount + 1;
      const intervals = [1, 3, 7, 14, 30, 60, 120];
      const intervalDays = intervals[Math.min(newCount, intervals.length - 1)];
      const nextReview = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

      const [updated] = await db
        .update(notes)
        .set({
          reviewCount: newCount,
          nextReviewAt: nextReview,
          updatedAt: new Date(),
        })
        .where(eq(notes.id, noteId))
        .returning();

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark review" });
    }
  });

  app.delete("/api/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const noteId = parseInt(req.params.id);

      const [existing] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
      if (!existing) return res.status(404).json({ error: "Note not found" });

      await db.delete(notes).where(eq(notes.id, noteId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete note" });
    }
  });
}
