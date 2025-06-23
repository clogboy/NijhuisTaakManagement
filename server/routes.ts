import express from "express";
import { storage } from "./storage";
import { requireAuth } from "./middleware/auth.middleware";
import { 
  insertActivitySchema, insertSubtaskSchema, insertQuickWinSchema, 
  insertRoadblockSchema, insertContactSchema, insertActivityLogSchema 
} from "../shared/schema";

export function registerRoutes(app: express.Application) {
  const httpServer = require('http').createServer(app);
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth endpoints
  app.post("/api/auth/login", async (req, res) => {
    // Create a session for both dev and deployment
    const user = {
      id: 1,
      email: 'dev@nijhuis.nl',
      name: 'Development User',
      role: 'user',
      tenant_id: 1,
      microsoft_id: 'dev-user',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    if (req.session) {
      req.session.user = user;
    }
    req.user = user;
    return res.json({ success: true, user: req.user });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    res.json({ user: req.user });
  });

  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy(() => {
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  });

  // User stats for dashboard
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Activities
  app.get("/api/activities", requireAuth, async (req, res) => {
    try {
      const activities = await storage.getActivities(req.user.id);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities", requireAuth, async (req, res) => {
    try {
      const data = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity({
        ...data,
        user_id: req.user.id,
      });
      res.json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  app.put("/api/activities/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const activity = await storage.updateActivity(id, updates);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      console.error("Error updating activity:", error);
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  app.delete("/api/activities/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteActivity(id);
      if (!success) {
        return res.status(404).json({ message: "Activity not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting activity:", error);
      res.status(500).json({ message: "Failed to delete activity" });
    }
  });

  // Subtasks
  app.get("/api/subtasks", requireAuth, async (req, res) => {
    try {
      const subtasks = await storage.getSubtasks(req.user.id);
      res.json(subtasks);
    } catch (error) {
      console.error("Error fetching subtasks:", error);
      res.status(500).json({ message: "Failed to fetch subtasks" });
    }
  });

  app.post("/api/subtasks", requireAuth, async (req, res) => {
    try {
      const data = insertSubtaskSchema.parse(req.body);
      const subtask = await storage.createSubtask({
        ...data,
        user_id: req.user.id,
      });
      res.json(subtask);
    } catch (error) {
      console.error("Error creating subtask:", error);
      res.status(500).json({ message: "Failed to create subtask" });
    }
  });

  app.put("/api/subtasks/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const subtask = await storage.updateSubtask(id, updates);
      if (!subtask) {
        return res.status(404).json({ message: "Subtask not found" });
      }
      res.json(subtask);
    } catch (error) {
      console.error("Error updating subtask:", error);
      res.status(500).json({ message: "Failed to update subtask" });
    }
  });

  // Quick wins
  app.get("/api/quickwins", requireAuth, async (req, res) => {
    try {
      const quickWins = await storage.getQuickWins(req.user.id);
      res.json(quickWins);
    } catch (error) {
      console.error("Error fetching quick wins:", error);
      res.status(500).json({ message: "Failed to fetch quick wins" });
    }
  });

  app.post("/api/quickwins", requireAuth, async (req, res) => {
    try {
      const data = insertQuickWinSchema.parse(req.body);
      const quickWin = await storage.createQuickWin({
        ...data,
        user_id: req.user.id,
      });
      res.json(quickWin);
    } catch (error) {
      console.error("Error creating quick win:", error);
      res.status(500).json({ message: "Failed to create quick win" });
    }
  });

  app.put("/api/quickwins/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const quickWin = await storage.updateQuickWin(id, updates);
      if (!quickWin) {
        return res.status(404).json({ message: "Quick win not found" });
      }
      res.json(quickWin);
    } catch (error) {
      console.error("Error updating quick win:", error);
      res.status(500).json({ message: "Failed to update quick win" });
    }
  });

  // Roadblocks
  app.get("/api/roadblocks", requireAuth, async (req, res) => {
    try {
      const roadblocks = await storage.getRoadblocks(req.user.id);
      res.json(roadblocks);
    } catch (error) {
      console.error("Error fetching roadblocks:", error);
      res.status(500).json({ message: "Failed to fetch roadblocks" });
    }
  });

  app.post("/api/roadblocks", requireAuth, async (req, res) => {
    try {
      const data = insertRoadblockSchema.parse(req.body);
      const roadblock = await storage.createRoadblock({
        ...data,
        user_id: req.user.id,
      });
      res.json(roadblock);
    } catch (error) {
      console.error("Error creating roadblock:", error);
      res.status(500).json({ message: "Failed to create roadblock" });
    }
  });

  app.put("/api/roadblocks/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const roadblock = await storage.updateRoadblock(id, updates);
      if (!roadblock) {
        return res.status(404).json({ message: "Roadblock not found" });
      }
      res.json(roadblock);
    } catch (error) {
      console.error("Error updating roadblock:", error);
      res.status(500).json({ message: "Failed to update roadblock" });
    }
  });

  // Contacts
  app.get("/api/contacts", requireAuth, async (req, res) => {
    try {
      const contacts = await storage.getContacts(req.user.id);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", requireAuth, async (req, res) => {
    try {
      const data = insertContactSchema.parse(req.body);
      const contact = await storage.createContact({
        ...data,
        user_id: req.user.id,
      });
      res.json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  // Activity logs
  app.get("/api/activities/:id/logs", requireAuth, async (req, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const logs = await storage.getActivityLogs(activityId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  app.post("/api/activities/:id/logs", requireAuth, async (req, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const data = insertActivityLogSchema.parse(req.body);
      const log = await storage.createActivityLog({
        ...data,
        activityId,
        user_id: req.user.id,
      });
      res.json(log);
    } catch (error) {
      console.error("Error creating activity log:", error);
      res.status(500).json({ message: "Failed to create activity log" });
    }
  });

  return httpServer;
}