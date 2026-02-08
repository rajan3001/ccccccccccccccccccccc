import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerCurrentAffairsRoutes } from "./current-affairs-routes";
import { registerQuizRoutes } from "./quiz-routes";
import { registerEvaluationRoutes } from "./evaluation-routes";
import { registerNotesRoutes } from "./notes-routes";
import { registerStudyPlannerRoutes } from "./study-planner-routes";
import { api } from "@shared/routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  registerObjectStorageRoutes(app);
  registerChatRoutes(app);
  registerCurrentAffairsRoutes(app);
  registerQuizRoutes(app);
  registerEvaluationRoutes(app);
  registerNotesRoutes(app);
  registerStudyPlannerRoutes(app);

  // Subscription Routes
  app.get(api.subscription.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const sub = await storage.getSubscription(userId);
    const isPro = sub?.status === 'active';
    res.json({ isPro, subscription: sub || null });
  });

  app.post(api.subscription.create.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    // Mock upgrade logic
    let sub = await storage.getSubscription(userId);
    if (!sub) {
      sub = await storage.createSubscription({
        userId,
        status: 'active',
        plan: 'pro'
      });
    } else {
      sub = await storage.updateSubscriptionStatus(userId, 'active');
    }
    res.status(201).json({ success: true });
  });

  return httpServer;
}
