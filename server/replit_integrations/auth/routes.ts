import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { onboardingSchema, users } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/onboarding", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = onboardingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const [user] = await db.update(users)
        .set({
          displayName: parsed.data.displayName,
          userType: parsed.data.userType,
          targetExams: parsed.data.targetExams,
          onboardingCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      res.json(user);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to save onboarding data" });
    }
  });

  app.patch("/api/auth/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { displayName, email, profileImageUrl, notificationPrefs, language } = req.body;
      const updates: any = { updatedAt: new Date() };
      if (displayName !== undefined) updates.displayName = displayName;
      if (email !== undefined) updates.email = email;
      if (profileImageUrl !== undefined) updates.profileImageUrl = profileImageUrl;
      if (notificationPrefs !== undefined) updates.notificationPrefs = notificationPrefs;
      if (language !== undefined) updates.language = language;

      const [user] = await db.update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning();
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
}
