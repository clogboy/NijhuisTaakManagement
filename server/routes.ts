import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertActivitySchema, insertActivityLogSchema, insertQuickWinSchema } from "@shared/schema";
import { z } from "zod";

const loginUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  microsoftId: z.string(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, name, microsoftId } = loginUserSchema.parse(req.body);
      
      let user = await storage.getUserByMicrosoftId(microsoftId);
      
      if (!user) {
        // Create new user
        const role = email === "b.weinreder@nijhuis.nl" ? "admin" : "user";
        user = await storage.createUser({
          email,
          name,
          microsoftId,
          role,
        });
      }

      // Set user session
      (req as any).session.userId = user.id;
      
      res.json({ user: { ...user } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    (req as any).session.destroy();
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.json({ user });
  });

  // Middleware to check authentication
  const requireAuth = async (req: any, res: any, next: any) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  };

  // Contacts routes
  app.get("/api/contacts", requireAuth, async (req: any, res) => {
    try {
      const contacts = await storage.getContacts(req.user.id);
      res.json(contacts);
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", requireAuth, async (req: any, res) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact({
        ...contactData,
        createdBy: req.user.id,
      });
      res.json(contact);
    } catch (error) {
      console.error("Create contact error:", error);
      res.status(400).json({ message: "Invalid contact data" });
    }
  });

  app.put("/api/contacts/:id", requireAuth, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const contactData = insertContactSchema.partial().parse(req.body);
      const contact = await storage.updateContact(contactId, contactData);
      res.json(contact);
    } catch (error) {
      console.error("Update contact error:", error);
      res.status(400).json({ message: "Invalid contact data" });
    }
  });

  app.delete("/api/contacts/:id", requireAuth, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      await storage.deleteContact(contactId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Activities routes
  app.get("/api/activities", requireAuth, async (req: any, res) => {
    try {
      const activities = await storage.getActivities(req.user.id, req.user.role === "admin");
      res.json(activities);
    } catch (error) {
      console.error("Get activities error:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities", requireAuth, async (req: any, res) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity({
        ...activityData,
        createdBy: req.user.id,
      });
      res.json(activity);
    } catch (error) {
      console.error("Create activity error:", error);
      res.status(400).json({ message: "Invalid activity data" });
    }
  });

  app.put("/api/activities/:id", requireAuth, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const activityData = insertActivitySchema.partial().parse(req.body);
      const activity = await storage.updateActivity(activityId, activityData);
      res.json(activity);
    } catch (error) {
      console.error("Update activity error:", error);
      res.status(400).json({ message: "Invalid activity data" });
    }
  });

  app.delete("/api/activities/:id", requireAuth, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.id);
      await storage.deleteActivity(activityId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete activity error:", error);
      res.status(500).json({ message: "Failed to delete activity" });
    }
  });

  // Activity logs routes
  app.get("/api/activities/:id/logs", requireAuth, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const logs = await storage.getActivityLogs(activityId);
      res.json(logs);
    } catch (error) {
      console.error("Get activity logs error:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  app.post("/api/activities/:id/logs", requireAuth, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const logData = insertActivityLogSchema.parse(req.body);
      const log = await storage.createActivityLog({
        ...logData,
        activityId,
        createdBy: req.user.id,
      });
      res.json(log);
    } catch (error) {
      console.error("Create activity log error:", error);
      res.status(400).json({ message: "Invalid log data" });
    }
  });

  // Quick wins routes
  app.get("/api/quickwins", requireAuth, async (req: any, res) => {
    try {
      const quickWins = await storage.getQuickWins(req.user.id);
      res.json(quickWins);
    } catch (error) {
      console.error("Get quick wins error:", error);
      res.status(500).json({ message: "Failed to fetch quick wins" });
    }
  });

  app.post("/api/quickwins", requireAuth, async (req: any, res) => {
    try {
      const quickWinData = insertQuickWinSchema.parse(req.body);
      const quickWin = await storage.createQuickWin({
        ...quickWinData,
        createdBy: req.user.id,
      });
      res.json(quickWin);
    } catch (error) {
      console.error("Create quick win error:", error);
      res.status(400).json({ message: "Invalid quick win data" });
    }
  });

  app.delete("/api/quickwins/:id", requireAuth, async (req: any, res) => {
    try {
      const quickWinId = parseInt(req.params.id);
      await storage.deleteQuickWin(quickWinId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete quick win error:", error);
      res.status(500).json({ message: "Failed to delete quick win" });
    }
  });

  // Stats route
  app.get("/api/stats", requireAuth, async (req: any, res) => {
    try {
      const stats = await storage.getActivityStats(req.user.id, req.user.role === "admin");
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Email route (placeholder for Microsoft Graph integration)
  app.post("/api/send-email", requireAuth, async (req: any, res) => {
    try {
      const { to, subject, body } = req.body;
      
      // TODO: Implement Microsoft Graph API email sending
      console.log("Email would be sent:", { to, subject, body });
      
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Send email error:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
