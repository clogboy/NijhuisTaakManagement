
import { createServer, type Server } from "http";
import express, { type Express, type Request, type Response } from "express";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { db } from "./db";
import { insertActivitySchema, insertActivityEntrySchema, insertTimeBlockSchema, insertUserMetricSchema, insertRoadblockSchema, insertSubtaskSchema, insertTaskCommentSchema } from "@shared/simplified-schema";

// Create temporary schemas for backwards compatibility
import { createInsertSchema } from "drizzle-zod";
import { contacts, users, activities, activity_entries, subtasks } from "@shared/simplified-schema";
import { eq, and, sql, desc, ne } from "drizzle-orm";

const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Import services
import { microsoftCalendarService } from "./microsoft-calendar-service";
import { timeBlockingService } from "./time-blocking-service";
import { dailyScheduler } from "./scheduler";
import { errorReportingService } from "./error-reporting-service";
import { emailService } from "./email-service";
import { analyticsService } from "./analytics-service";
import { auditService } from "./audit-service";
import { azureMigrationService } from "./azure-migration-service";
import { digiOfficeService } from "./digioffice-service";
import { bimCollabService } from "./bimcollab-service";

// Add auth middleware
function requireAuth(req: Request, res: Response, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      console.log('Received WebSocket message:', message.toString());
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Auth endpoints
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  // Activities endpoints
  app.get("/api/activities", requireAuth, async (req, res) => {
    try {
      const activities = await storage.getActivities(req.user.id);
      res.json(activities || []);
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
      const data = insertActivitySchema.partial().parse(req.body);
      const activity = await storage.updateActivity(id, data);
      res.json(activity);
    } catch (error) {
      console.error("Error updating activity:", error);
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  app.delete("/api/activities/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteActivity(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting activity:", error);
      res.status(500).json({ message: "Failed to delete activity" });
    }
  });

  // Contacts endpoints
  app.get("/api/contacts", requireAuth, async (req, res) => {
    try {
      const contacts = await storage.getContacts(req.user.id);
      res.json(contacts || []);
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

  // Quick wins endpoints
  app.get("/api/quickwins", requireAuth, async (req, res) => {
    try {
      const quickWins = await storage.getQuickWins(req.user.id);
      res.json(Array.isArray(quickWins) ? quickWins : []);
    } catch (error) {
      console.error("Error fetching quick wins:", error);
      res.json([]);
    }
  });

  app.post("/api/quickwins", requireAuth, async (req, res) => {
    try {
      const quickWin = await storage.createQuickWin({
        ...req.body,
        user_id: req.user.id,
      });
      res.json(quickWin);
    } catch (error) {
      console.error("Error creating quick win:", error);
      res.status(500).json({ message: "Failed to create quick win" });
    }
  });

  // Subtasks endpoints
  app.get("/api/subtasks", requireAuth, async (req, res) => {
    try {
      const subtasks = await storage.getSubtasks(req.user.id);
      res.json(Array.isArray(subtasks) ? subtasks : []);
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

  // Roadblocks endpoints
  app.get("/api/roadblocks", requireAuth, async (req, res) => {
    try {
      const roadblocks = await storage.getRoadblocks(req.user.id);
      res.json(roadblocks || []);
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

  // Time blocks endpoints
  app.get("/api/time-blocks", requireAuth, async (req, res) => {
    try {
      const timeBlocks = await storage.getTimeBlocks(req.user.id);
      res.json(timeBlocks || []);
    } catch (error) {
      console.error("Error fetching time blocks:", error);
      res.status(500).json({ message: "Failed to fetch time blocks" });
    }
  });

  app.post("/api/time-blocks", requireAuth, async (req, res) => {
    try {
      const data = insertTimeBlockSchema.parse(req.body);
      const timeBlock = await storage.createTimeBlock({
        ...data,
        user_id: req.user.id,
      });
      res.json(timeBlock);
    } catch (error) {
      console.error("Error creating time block:", error);
      res.status(500).json({ message: "Failed to create time block" });
    }
  });

  // Daily task completions
  app.get("/api/daily-task-completions", requireAuth, async (req, res) => {
    try {
      const completions = await storage.getDailyTaskCompletions(req.user.id);
      res.json(completions || []);
    } catch (error) {
      console.error("Error fetching daily task completions:", error);
      res.status(500).json({ message: "Failed to fetch daily task completions" });
    }
  });

  return httpServer;
}
