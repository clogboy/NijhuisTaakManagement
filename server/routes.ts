import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertActivitySchema, insertActivityLogSchema, insertQuickWinSchema, insertRoadblockSchema, insertSubtaskSchema, insertWeeklyEthosSchema, insertDailyAgendaSchema, insertTimeBlockSchema, insertTaskCommentSchema, insertWorkspaceInvitationSchema } from "@shared/schema";
import { generateDailyAgenda, categorizeActivitiesWithEisenhower } from "./ai-service";
import { timeBlockingService } from "./time-blocking-service";
import { microsoftCalendarService } from "./microsoft-calendar-service";
import { dailyScheduler } from "./scheduler";
import { supabaseService } from "./supabase-service";
import { z } from "zod";
import "./types";

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
      
      // First try to find by Microsoft ID
      let user = await storage.getUserByMicrosoftId(microsoftId);
      
      // If not found, try to find by email and update with Microsoft ID
      if (!user) {
        user = await storage.getUserByEmail(email);
        if (user && !user.microsoftId) {
          // Update existing user with Microsoft ID and correct name
          user = await storage.updateUser(user.id, { microsoftId, name });
        }
      }
      
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

  // Simple email/password login endpoint
  app.post("/api/auth/simple-login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // For now, accept any password for the admin user
      if (email === "b.weinreder@nijhuis.nl" && password === "admin123") {
        let user = await storage.getUserByEmail(email);
        
        if (!user) {
          // Create admin user if doesn't exist
          user = await storage.createUser({
            email,
            name: "Bram Weinreder",
            role: "admin",
            microsoftId: null,
          });
        }

        // Set user session
        (req as any).session.userId = user.id;
        
        res.json({ user: { ...user } });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Simple login error:", error);
      res.status(400).json({ message: "Login failed" });
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
      console.log("[API] Loading contacts - attempting Supabase first...");
      
      // Use local storage directly due to Supabase schema issues
      const contacts = await storage.getContacts(req.user.id);
      console.log(`[API] Loaded ${contacts.length} contacts from local storage`);
      res.json(contacts);
    } catch (error) {
      console.error("[API] Error fetching contacts from all sources:", error);
      res.status(500).json({ 
        message: "Failed to fetch contacts",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/contacts", requireAuth, async (req: any, res) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      
      console.log("[API] Creating contact - attempting Supabase first...");
      
      // Try Supabase first
      try {
        const contact = await supabaseService.createContact({
          ...contactData,
          createdBy: req.user.id,
        });
        console.log(`[API] Successfully created contact in Supabase: ${contact.id}`);
        res.status(201).json(contact);
        return;
      } catch (supabaseError) {
        console.warn("[API] Supabase creation failed, falling back to local storage:", supabaseError);
        
        // Fallback to local storage
        const contact = await storage.createContact({
          ...contactData,
          createdBy: req.user.id,
        });
        console.log(`[API] Created contact in local storage: ${contact.id}`);
        res.status(201).json(contact);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      } else {
        console.error("[API] Error creating contact:", error);
        res.status(500).json({ 
          message: "Failed to create contact",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  app.put("/api/contacts/:id", requireAuth, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const contactData = insertContactSchema.partial().parse(req.body);
      
      console.log(`[API] Updating contact ${contactId} - attempting Supabase first...`);
      
      // Try Supabase first
      try {
        const contact = await supabaseService.updateContact(contactId, contactData);
        console.log(`[API] Successfully updated contact in Supabase: ${contact.id}`);
        res.json(contact);
        return;
      } catch (supabaseError) {
        console.warn("[API] Supabase update failed, falling back to local storage:", supabaseError);
        
        // Fallback to local storage
        const contact = await storage.updateContact(contactId, contactData);
        if (!contact) {
          res.status(404).json({ message: "Contact not found" });
          return;
        }
        console.log(`[API] Updated contact in local storage: ${contact.id}`);
        res.json(contact);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      } else {
        console.error("[API] Error updating contact:", error);
        res.status(500).json({ 
          message: "Failed to update contact",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  app.delete("/api/contacts/:id", requireAuth, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      console.log(`[API] Deleting contact ${contactId} - attempting Supabase first...`);
      
      // Try Supabase first
      try {
        await supabaseService.deleteContact(contactId);
        console.log(`[API] Successfully deleted contact from Supabase: ${contactId}`);
        res.json({ message: "Contact deleted successfully" });
        return;
      } catch (supabaseError) {
        console.warn("[API] Supabase deletion failed, falling back to local storage:", supabaseError);
        
        // Fallback to local storage
        await storage.deleteContact(contactId);
        console.log(`[API] Deleted contact from local storage: ${contactId}`);
        res.json({ message: "Contact deleted successfully" });
      }
    } catch (error) {
      console.error("[API] Error deleting contact:", error);
      res.status(500).json({ 
        message: "Failed to delete contact",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Supabase health check endpoints
  app.get("/api/supabase/health", async (_req, res) => {
    try {
      const healthCheck = await supabaseService.healthCheck();
      res.json(healthCheck);
    } catch (error) {
      console.error("[API] Supabase health check error:", error);
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/supabase/status", async (_req, res) => {
    try {
      const status = supabaseService.getConnectionStatus();
      res.json(status);
    } catch (error) {
      console.error("[API] Supabase status error:", error);
      res.status(500).json({
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/supabase/test-connection", async (_req, res) => {
    try {
      console.log("[API] Testing Supabase connection...");
      const connectionTest = await supabaseService.testConnection();
      res.json({
        success: connectionTest.connected,
        ...connectionTest
      });
    } catch (error) {
      console.error("[API] Supabase connection test error:", error);
      res.status(500).json({
        success: false,
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
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
      // Convert string dates to Date objects for validation
      const data = { ...req.body };
      if (data.dueDate && typeof data.dueDate === 'string') {
        data.dueDate = new Date(data.dueDate);
      }
      
      const activityData = insertActivitySchema.parse(data);
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

  // Roadblocks routes
  app.get("/api/roadblocks", requireAuth, async (req: any, res) => {
    try {
      const roadblocks = await storage.getRoadblocks(req.user.id, req.user.role === "admin");
      res.json(roadblocks);
    } catch (error) {
      console.error("Get roadblocks error:", error);
      res.status(500).json({ message: "Failed to fetch roadblocks" });
    }
  });

  app.post("/api/roadblocks", requireAuth, async (req: any, res) => {
    try {
      const roadblockData = insertRoadblockSchema.parse(req.body);
      const roadblock = await storage.createRoadblock({
        ...roadblockData,
        createdBy: req.user.id,
      });
      res.json(roadblock);
    } catch (error) {
      console.error("Create roadblock error:", error);
      res.status(400).json({ message: "Invalid roadblock data" });
    }
  });

  app.put("/api/roadblocks/:id", requireAuth, async (req: any, res) => {
    try {
      const roadblockId = parseInt(req.params.id);
      const roadblockData = insertRoadblockSchema.partial().parse(req.body);
      const roadblock = await storage.updateRoadblock(roadblockId, roadblockData);
      res.json(roadblock);
    } catch (error) {
      console.error("Update roadblock error:", error);
      res.status(400).json({ message: "Invalid roadblock data" });
    }
  });

  app.delete("/api/roadblocks/:id", requireAuth, async (req: any, res) => {
    try {
      const roadblockId = parseInt(req.params.id);
      await storage.deleteRoadblock(roadblockId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete roadblock error:", error);
      res.status(500).json({ message: "Failed to delete roadblock" });
    }
  });

  // QuickWins routes
  app.get("/api/quickwins", requireAuth, async (req: any, res) => {
    try {
      const quickWins = await storage.getQuickWins(req.user.id);
      res.json(quickWins);
    } catch (error) {
      console.error("Get quick wins error:", error);
      res.status(500).json({ message: "Failed to fetch quick wins" });
    }
  });

  // Subtasks routes (unified Quick Wins and Roadblocks)
  app.get("/api/subtasks", requireAuth, async (req: any, res) => {
    try {
      const subtasks = await storage.getSubtasks(req.user.id);
      res.json(subtasks);
    } catch (error) {
      console.error("Get subtasks error:", error);
      res.status(500).json({ message: "Failed to fetch subtasks" });
    }
  });

  app.get("/api/activities/:id/subtasks", requireAuth, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const subtasks = await storage.getSubtasksByActivity(activityId);
      res.json(subtasks);
    } catch (error) {
      console.error("Get activity subtasks error:", error);
      res.status(500).json({ message: "Failed to fetch activity subtasks" });
    }
  });

  app.post("/api/subtasks", requireAuth, async (req: any, res) => {
    try {
      const subtaskData = insertSubtaskSchema.parse(req.body);
      const subtask = await storage.createSubtask({
        ...subtaskData,
        createdBy: req.user.id,
      });
      res.json(subtask);
    } catch (error) {
      console.error("Create subtask error:", error);
      res.status(400).json({ message: "Invalid subtask data" });
    }
  });

  app.put("/api/subtasks/:id", requireAuth, async (req: any, res) => {
    try {
      const subtaskId = parseInt(req.params.id);
      const subtaskData = insertSubtaskSchema.partial().parse(req.body);
      const subtask = await storage.updateSubtask(subtaskId, subtaskData);
      res.json(subtask);
    } catch (error) {
      console.error("Update subtask error:", error);
      res.status(400).json({ message: "Invalid subtask data" });
    }
  });

  app.delete("/api/subtasks/:id", requireAuth, async (req: any, res) => {
    try {
      const subtaskId = parseInt(req.params.id);
      await storage.deleteSubtask(subtaskId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete subtask error:", error);
      res.status(500).json({ message: "Failed to delete subtask" });
    }
  });

  // Update participant's task type for a subtask
  app.patch("/api/subtasks/:id/participant-type", requireAuth, async (req: any, res) => {
    try {
      const subtaskId = parseInt(req.params.id);
      const { participantEmail, taskType } = req.body;
      
      if (!participantEmail || !taskType) {
        return res.status(400).json({ error: "participantEmail and taskType are required" });
      }

      if (!["task", "quick_win", "roadblock"].includes(taskType)) {
        return res.status(400).json({ error: "taskType must be 'task', 'quick_win', or 'roadblock'" });
      }

      const updatedSubtask = await storage.updateSubtaskParticipantType(subtaskId, participantEmail, taskType);
      res.json(updatedSubtask);
    } catch (error) {
      console.error("Error updating participant task type:", error);
      res.status(500).json({ error: "Failed to update participant task type" });
    }
  });

  // Daily task completions
  app.get("/api/daily-task-completions/:date?", requireAuth, async (req: any, res) => {
    try {
      const date = req.params.date;
      const completions = await storage.getDailyTaskCompletions(req.user.id, date);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching daily task completions:", error);
      res.status(500).json({ error: "Failed to fetch daily task completions" });
    }
  });

  app.post("/api/daily-task-completions", requireAuth, async (req: any, res) => {
    try {
      const { activityId, taskDate, completed } = req.body;
      
      if (!activityId || !taskDate || typeof completed !== 'boolean') {
        return res.status(400).json({ error: "activityId, taskDate, and completed are required" });
      }

      // Verify activity exists before creating completion
      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(400).json({ error: `Activity ${activityId} not found` });
      }

      const result = await storage.createOrUpdateDailyTaskCompletion(
        req.user.id,
        activityId,
        taskDate,
        completed
      );

      res.json({ success: true, activityId, taskDate, completed, result });
    } catch (error) {
      console.error("Error updating task completion:", error);
      res.status(500).json({ error: "Failed to update task completion" });
    }
  });

  // Task Comments routes
  app.get("/api/activities/:id/comments", requireAuth, async (req: any, res) => {
    try {
      const comments = await storage.getTaskComments(parseInt(req.params.id));
      res.json(comments);
    } catch (error) {
      console.error("Error fetching task comments:", error);
      res.status(500).json({ message: "Failed to fetch task comments" });
    }
  });

  app.post("/api/task-comments", requireAuth, async (req: any, res) => {
    try {
      const commentData = insertTaskCommentSchema.parse(req.body);
      const newComment = await storage.createTaskComment({
        ...commentData,
        createdBy: req.user.id,
      });
      res.json(newComment);
    } catch (error) {
      console.error("Error creating task comment:", error);
      res.status(500).json({ message: "Failed to create task comment" });
    }
  });

  // Activity-specific Quick Wins routes
  app.get("/api/activities/:id/quickwins", requireAuth, async (req: any, res) => {
    try {
      const quickWins = await storage.getQuickWinsByActivity(parseInt(req.params.id));
      res.json(quickWins);
    } catch (error) {
      console.error("Error fetching activity quick wins:", error);
      res.status(500).json({ message: "Failed to fetch activity quick wins" });
    }
  });

  // Activity-specific Roadblocks routes
  app.get("/api/activities/:id/roadblocks", requireAuth, async (req: any, res) => {
    try {
      const roadblocks = await storage.getRoadblocksByActivity(parseInt(req.params.id));
      res.json(roadblocks);
    } catch (error) {
      console.error("Error fetching activity roadblocks:", error);
      res.status(500).json({ message: "Failed to fetch activity roadblocks" });
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

  // Weekly Ethos routes
  app.get("/api/ethos", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const ethos = await storage.getWeeklyEthos(req.session.userId);
      res.json(ethos);
    } catch (error) {
      console.error("Get weekly ethos error:", error);
      res.status(500).json({ message: "Failed to get weekly ethos" });
    }
  });

  app.get("/api/ethos/day/:dayOfWeek", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const dayOfWeek = parseInt(req.params.dayOfWeek);
      const ethos = await storage.getWeeklyEthosByDay(req.session.userId, dayOfWeek);
      res.json(ethos);
    } catch (error) {
      console.error("Get daily ethos error:", error);
      res.status(500).json({ message: "Failed to get daily ethos" });
    }
  });

  app.post("/api/ethos", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const ethosData = insertWeeklyEthosSchema.parse(req.body);
      const ethos = await storage.createWeeklyEthos({
        ...ethosData,
        createdBy: req.session.userId,
      });
      
      res.json(ethos);
    } catch (error) {
      console.error("Create weekly ethos error:", error);
      res.status(500).json({ message: "Failed to create weekly ethos" });
    }
  });

  app.put("/api/ethos/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const ethosData = insertWeeklyEthosSchema.partial().parse(req.body);
      const ethos = await storage.updateWeeklyEthos(id, ethosData);
      
      res.json(ethos);
    } catch (error) {
      console.error("Update weekly ethos error:", error);
      res.status(500).json({ message: "Failed to update weekly ethos" });
    }
  });

  app.post("/api/agenda/generate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { date, maxTaskSwitches } = req.body;
      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay();
      
      // Get activities for the user
      const user = await storage.getUser(req.session.userId);
      const activities = await storage.getActivities(req.session.userId, user?.role === 'admin');
      
      // Get subtasks for the user
      const subtasks = await storage.getSubtasks(req.session.userId);
      
      // Get ethos for the day
      const ethos = await storage.getWeeklyEthosByDay(req.session.userId, dayOfWeek);
      
      // Generate AI-powered agenda
      const agendaSuggestion = await generateDailyAgenda(
        activities.filter(a => a.status !== 'completed'),
        subtasks,
        user?.email,
        ethos,
        maxTaskSwitches || 3
      );
      
      res.json({
        eisenhowerMatrix: agendaSuggestion.eisenhowerMatrix,
        suggestions: agendaSuggestion.suggestions,
        taskSwitchOptimization: agendaSuggestion.taskSwitchOptimization,
        estimatedTaskSwitches: agendaSuggestion.estimatedTaskSwitches,
        scheduledActivities: agendaSuggestion.scheduledActivities,
      });
    } catch (error) {
      console.error("Generate agenda error:", error);
      res.status(500).json({ message: "Failed to generate agenda" });
    }
  });

  // AI key status endpoint
  app.get("/api/ai-key-status", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { getKeyStatus } = await import("./ai-service");
      const status = getKeyStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting AI key status:", error);
      res.status(500).json({ message: "Failed to get AI key status" });
    }
  });

  app.get("/api/eisenhower", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { date } = req.query;
      const targetDate = date ? new Date(date as string) : new Date();
      const dayOfWeek = targetDate.getDay();
      
      // Get activities and ethos
      const user = await storage.getUser(req.session.userId);
      const activities = await storage.getActivities(req.session.userId, user?.role === 'admin');
      const ethos = await storage.getWeeklyEthosByDay(req.session.userId, dayOfWeek);
      
      // Categorize activities using Eisenhower matrix
      const matrix = await categorizeActivitiesWithEisenhower(
        activities.filter(a => a.status !== 'completed'),
        ethos
      );
      
      res.json(matrix);
    } catch (error) {
      console.error("Get Eisenhower matrix error:", error);
      res.status(500).json({ message: "Failed to get Eisenhower matrix" });
    }
  });

  // Time Blocks routes
  app.get("/api/timeblocks", requireAuth, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      
      const timeBlocks = await storage.getTimeBlocks(req.user.id, start, end);
      res.json(timeBlocks);
    } catch (error) {
      console.error("Get time blocks error:", error);
      res.status(500).json({ message: "Failed to fetch time blocks" });
    }
  });

  app.post("/api/timeblocks", requireAuth, async (req: any, res) => {
    try {
      const timeBlockData = insertTimeBlockSchema.parse(req.body);
      const timeBlock = await storage.createTimeBlock({
        ...timeBlockData,
        createdBy: req.user.id,
      });
      res.json(timeBlock);
    } catch (error) {
      console.error("Create time block error:", error);
      res.status(400).json({ message: "Failed to create time block" });
    }
  });

  app.put("/api/timeblocks/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertTimeBlockSchema.partial().parse(req.body);
      const timeBlock = await storage.updateTimeBlock(id, updates);
      res.json(timeBlock);
    } catch (error) {
      console.error("Update time block error:", error);
      res.status(400).json({ message: "Failed to update time block" });
    }
  });

  app.delete("/api/timeblocks/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTimeBlock(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete time block error:", error);
      res.status(500).json({ message: "Failed to delete time block" });
    }
  });

  // Smart scheduling endpoint
  app.post("/api/smart-schedule", requireAuth, async (req: any, res) => {
    try {
      const { activityIds, date, options } = req.body;
      const scheduleDate = new Date(date);
      
      const result = await timeBlockingService.autoScheduleActivities(
        req.user.id,
        scheduleDate,
        activityIds,
        options
      );
      
      res.json(result);
    } catch (error) {
      console.error("Smart schedule error:", error);
      res.status(500).json({ message: "Failed to generate smart schedule" });
    }
  });

  // Generate schedule preview without saving
  app.post("/api/schedule-preview", requireAuth, async (req: any, res) => {
    try {
      const { activityIds, date, options } = req.body;
      const scheduleDate = new Date(date);
      
      // Get activities to schedule
      const activities = [];
      for (const id of activityIds) {
        const activity = await storage.getActivity(id);
        if (activity) {
          activities.push(activity);
        }
      }
      
      const result = await timeBlockingService.generateSmartSchedule(
        req.user.id,
        scheduleDate,
        activities,
        options
      );
      
      res.json(result);
    } catch (error) {
      console.error("Schedule preview error:", error);
      res.status(500).json({ message: "Failed to generate schedule preview" });
    }
  });

  // Microsoft Calendar integration routes
  app.get("/api/calendar/events", requireAuth, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const events = await microsoftCalendarService.getCalendarEvents(req.user.id, start, end);
      res.json(events);
    } catch (error) {
      console.error("Get calendar events error:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  app.post("/api/calendar/check-conflicts", requireAuth, async (req: any, res) => {
    try {
      const { timeBlocks } = req.body;
      const result = await microsoftCalendarService.checkCalendarConflicts(req.user.id, timeBlocks);
      res.json(result);
    } catch (error) {
      console.error("Check calendar conflicts error:", error);
      res.status(500).json({ message: "Failed to check calendar conflicts" });
    }
  });

  app.post("/api/calendar/sync", requireAuth, async (req: any, res) => {
    try {
      const { timeBlockIds } = req.body;
      const result = await microsoftCalendarService.syncTimeBlocksToCalendar(req.user.id, timeBlockIds);
      res.json(result);
    } catch (error) {
      console.error("Calendar sync error:", error);
      res.status(500).json({ message: "Failed to sync with calendar" });
    }
  });

  app.get("/api/calendar/available-slots", requireAuth, async (req: any, res) => {
    try {
      const { date, workingHours } = req.query;
      const targetDate = date ? new Date(date) : new Date();
      const hours = workingHours ? JSON.parse(workingHours) : { start: "09:00", end: "17:00" };
      
      const slots = await microsoftCalendarService.getAvailableSlots(req.user.id, targetDate, hours);
      res.json(slots);
    } catch (error) {
      console.error("Get available slots error:", error);
      res.status(500).json({ message: "Failed to get available time slots" });
    }
  });

  // User preferences routes
  app.get("/api/user/preferences", requireAuth, async (req: any, res) => {
    try {
      let userPrefs = await storage.getUserPreferences(req.user.id);
      
      if (!userPrefs) {
        // Create default preferences if none exist
        const defaultPrefs = {
          workingHours: { start: "09:00", end: "17:00" },
          timezone: "Europe/Amsterdam",
          language: "en",
          emailNotifications: true,
          pushNotifications: true,
          weeklyDigest: true,
          calendarSync: false,
          autoTimeBlocks: false,
          darkMode: false,
          compactSidebar: false,
          aiSuggestions: true,
        };
        
        userPrefs = await storage.createUserPreferences({
          ...defaultPrefs,
          createdBy: req.user.id,
        });
      }
      
      res.json(userPrefs);
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.patch("/api/user/preferences", requireAuth, async (req: any, res) => {
    try {
      const updatedPrefs = await storage.updateUserPreferences(req.user.id, req.body);
      res.json(updatedPrefs);
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // User profile and settings routes
  app.put("/api/users/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Ensure users can only update their own profile (or admin can update any)
      if (userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedUser = await storage.updateUser(userId, req.body);
      res.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  app.get("/api/export", requireAuth, async (req: any, res) => {
    try {
      const isAdmin = req.user.role === 'admin';
      
      // Get all user data for export
      const [activities, contacts, quickWins, roadblocks, weeklyEthos, dailyAgendas, timeBlocks] = await Promise.all([
        storage.getActivities(req.user.id, isAdmin),
        storage.getContacts(req.user.id),
        storage.getQuickWins(req.user.id),
        storage.getRoadblocks(req.user.id, isAdmin),
        storage.getWeeklyEthos(req.user.id),
        storage.getDailyAgendas(req.user.id),
        storage.getTimeBlocks(req.user.id)
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        },
        data: {
          activities,
          contacts,
          quickWins,
          roadblocks,
          weeklyEthos,
          dailyAgendas,
          timeBlocks
        },
        metadata: {
          totalActivities: activities.length,
          totalContacts: contacts.length,
          totalQuickWins: quickWins.length,
          totalRoadblocks: roadblocks.length,
          totalTimeBlocks: timeBlocks.length
        }
      };

      res.json(exportData);
    } catch (error) {
      console.error("Export data error:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Schedule preview endpoint
  app.post("/api/schedule-preview", requireAuth, async (req, res) => {
    try {
      const { activityIds, date, options } = req.body;
      const userId = (req as any).user.id;
      
      const result = await timeBlockingService.generateSmartSchedule(
        userId,
        new Date(date),
        activityIds,
        options
      );
      
      res.json(result);
    } catch (error) {
      console.error("Schedule preview error:", error);
      res.status(500).json({ message: "Failed to generate schedule preview" });
    }
  });



  // Scheduler management routes
  app.get("/api/scheduler/status", requireAuth, async (req, res) => {
    try {
      const { dailyScheduler } = await import("./scheduler");
      const status = dailyScheduler.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Failed to get scheduler status:", error);
      res.status(500).json({ message: "Failed to get scheduler status" });
    }
  });

  app.post("/api/scheduler/trigger", requireAuth, async (req: any, res) => {
    try {
      const { dailyScheduler } = await import("./scheduler");
      await dailyScheduler.triggerSync(req.user.id);
      res.json({ message: "Daily sync triggered successfully" });
    } catch (error) {
      console.error("Manual sync trigger failed:", error);
      res.status(500).json({ message: "Failed to trigger sync" });
    }
  });

  // Teams Integration endpoints
  app.get("/api/teams/boards", requireAuth, async (req, res) => {
    try {
      const { teamsService } = await import("./teams-service");
      const boards = await teamsService.getTeamsBoards(req.user!.id);
      res.json(boards);
    } catch (error) {
      console.error("Teams boards error:", error);
      res.status(500).json({ message: "Failed to fetch Teams boards" });
    }
  });

  app.get("/api/teams/boards/:boardId/tasks", requireAuth, async (req, res) => {
    try {
      const { teamsService } = await import("./teams-service");
      const tasks = await teamsService.getTeamsTasks(req.params.boardId, req.user!.id);
      res.json(tasks);
    } catch (error) {
      console.error("Teams tasks error:", error);
      res.status(500).json({ message: "Failed to fetch Teams tasks" });
    }
  });

  app.post("/api/teams/boards/:boardId/tasks", requireAuth, async (req, res) => {
    try {
      const { teamsService } = await import("./teams-service");
      const task = await teamsService.createTeamsTask(req.params.boardId, req.body, req.user!.id);
      res.json(task);
    } catch (error) {
      console.error("Teams task creation error:", error);
      res.status(500).json({ message: "Failed to create Teams task" });
    }
  });

  app.patch("/api/teams/tasks/:taskId/status", requireAuth, async (req, res) => {
    try {
      const { teamsService } = await import("./teams-service");
      const success = await teamsService.updateTeamsTaskStatus(
        req.params.taskId, 
        req.body.status, 
        req.user!.id
      );
      res.json({ success });
    } catch (error) {
      console.error("Teams task update error:", error);
      res.status(500).json({ message: "Failed to update Teams task" });
    }
  });

  app.get("/api/teams/status", requireAuth, async (req, res) => {
    try {
      const { teamsService } = await import("./teams-service");
      const status = await teamsService.getIntegrationStatus(req.user!.id);
      res.json(status);
    } catch (error) {
      console.error("Teams status error:", error);
      res.status(500).json({ message: "Failed to get Teams status" });
    }
  });

  // BimCollab Integration endpoints
  app.get("/api/bimcollab/projects", requireAuth, async (req, res) => {
    try {
      const { bimcollabService } = await import("./bimcollab-service");
      const projects = await bimcollabService.getBimcollabProjects(req.user!.id);
      res.json(projects);
    } catch (error) {
      console.error("BimCollab projects error:", error);
      res.status(500).json({ message: "Failed to fetch BimCollab projects" });
    }
  });

  app.get("/api/bimcollab/projects/:projectId/issues", requireAuth, async (req, res) => {
    try {
      const { bimcollabService } = await import("./bimcollab-service");
      const issues = await bimcollabService.getBimcollabIssues(req.params.projectId, req.user!.id);
      res.json(issues);
    } catch (error) {
      console.error("BimCollab issues error:", error);
      res.status(500).json({ message: "Failed to fetch BimCollab issues" });
    }
  });

  app.post("/api/bimcollab/projects/:projectId/issues", requireAuth, async (req, res) => {
    try {
      const { bimcollabService } = await import("./bimcollab-service");
      const issue = await bimcollabService.createBimcollabIssue(req.params.projectId, req.body, req.user!.id);
      res.json(issue);
    } catch (error) {
      console.error("BimCollab issue creation error:", error);
      res.status(500).json({ message: "Failed to create BimCollab issue" });
    }
  });

  app.patch("/api/bimcollab/issues/:issueId/status", requireAuth, async (req, res) => {
    try {
      const { bimcollabService } = await import("./bimcollab-service");
      const success = await bimcollabService.updateBimcollabIssueStatus(
        req.params.issueId, 
        req.body.status, 
        req.user!.id
      );
      res.json({ success });
    } catch (error) {
      console.error("BimCollab issue update error:", error);
      res.status(500).json({ message: "Failed to update BimCollab issue" });
    }
  });

  app.post("/api/bimcollab/issues/:issueId/convert-to-roadblock", requireAuth, async (req, res) => {
    try {
      const { bimcollabService } = await import("./bimcollab-service");
      const success = await bimcollabService.convertIssueToRoadblock(req.params.issueId, req.user!.id);
      res.json({ success });
    } catch (error) {
      console.error("BimCollab issue conversion error:", error);
      res.status(500).json({ message: "Failed to convert issue to roadblock" });
    }
  });

  app.get("/api/bimcollab/status", requireAuth, async (req, res) => {
    try {
      const { bimcollabService } = await import("./bimcollab-service");
      const status = await bimcollabService.getIntegrationStatus(req.user!.id);
      res.json(status);
    } catch (error) {
      console.error("BimCollab status error:", error);
      res.status(500).json({ message: "Failed to get BimCollab status" });
    }
  });

  // Integration Settings endpoints
  app.get("/api/integrations/:type/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getIntegrationSettings(req.user!.id, req.params.type);
      res.json(settings || {});
    } catch (error) {
      console.error("Integration settings error:", error);
      res.status(500).json({ message: "Failed to get integration settings" });
    }
  });

  app.post("/api/integrations/:type/settings", requireAuth, async (req, res) => {
    try {
      const existingSettings = await storage.getIntegrationSettings(req.user!.id, req.params.type);
      
      if (existingSettings) {
        const updated = await storage.updateIntegrationSettings(existingSettings.id, req.body);
        res.json(updated);
      } else {
        const created = await storage.createIntegrationSettings({
          userId: req.user!.id,
          integrationType: req.params.type,
          ...req.body
        });
        res.json(created);
      }
    } catch (error) {
      console.error("Integration settings update error:", error);
      res.status(500).json({ message: "Failed to update integration settings" });
    }
  });

  // Health check endpoint for Fly.io
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
