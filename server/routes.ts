import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertActivitySchema, insertActivityLogSchema, insertQuickWinSchema, insertRoadblockSchema, insertSubtaskSchema, insertWeeklyEthosSchema, insertDailyAgendaSchema, insertTimeBlockSchema, insertTaskCommentSchema, insertWorkspaceInvitationSchema } from "@shared/schema";
import { generateDailyAgenda, categorizeActivitiesWithPriority } from "./ai-service";
import { timeBlockingService } from "./time-blocking-service";
import { microsoftCalendarService } from "./microsoft-calendar-service";
import { dailyScheduler } from "./scheduler";
import { supabaseService } from "./supabase-service";
import { emailService } from "./email-service";
import { analyticsService } from "./analytics-service";
import { auditService } from "./audit-service";
import { azureMigrationService } from "./azure-migration-service";
import { digiOfficeService } from "./digioffice-service";
import { smartPrioritizationService } from "./smart-prioritization-service";
import { z } from "zod";
import { apiLimiter, authLimiter } from "./middleware/rate-limiter";
import { requireAuth } from "./middleware/auth.middleware";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import MemoryStore from "memorystore";
// import { setupAuth, isAuthenticated } from "./replitAuth"; // Ready for future migration
import "./types";

const MemStore = MemoryStore(session);

const loginUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  microsoftId: z.string(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup for authentication
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    store: new MemStore({
      checkPeriod: 86400000
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
  }));

  // Add rate limiting middleware
  app.use("/api", apiLimiter.middleware());

  // Development endpoint to clear rate limits
  app.post("/api/dev/clear-rate-limits", async (req, res) => {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
      authLimiter.clearAll();
      apiLimiter.clearAll();
      strictLimiter.clearAll();
      res.json({ message: "Rate limits cleared" });
    } else {
      res.status(404).json({ message: "Not found" });
    }
  });

  // Authentication routes with stricter rate limiting
  app.post("/api/auth/login", authLimiter.middleware(), async (req, res) => {
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
      console.log(`[API] Loading contacts for user ${req.user.id} from Supabase`);
      const contacts = await storage.getContacts(req.user.id);
      console.log(`[API] Loaded ${contacts.length} contacts from Supabase`);
      res.json(contacts);
    } catch (error) {
      console.error("[API] Error fetching contacts:", error);
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
      
      if (isNaN(contactId) || contactId <= 0) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }
      
      console.log(`[API] Deleting contact ${contactId} - attempting Supabase first...`);
      
      // Check if contact exists and belongs to user
      const existingContact = await storage.getContact(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      if (existingContact.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this contact" });
      }
      
      // Delete from both Supabase and local storage to maintain sync
      try {
        await supabaseService.deleteContact(contactId);
        console.log(`[API] Successfully deleted contact from Supabase: ${contactId}`);
        
        // Also delete from local storage to maintain sync
        await storage.deleteContact(contactId);
        console.log(`[API] Successfully deleted contact from local storage: ${contactId}`);
        
        res.json({ message: "Contact deleted successfully" });
        return;
      } catch (supabaseError) {
        console.warn("[API] Supabase deletion failed, falling back to local storage only:", supabaseError);
        
        // Fallback to local storage only
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
      const activities = await storage.getActivities(req.user.id, req.user.email, req.user.role === "admin");
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

      // Send email notifications to participants and collaborators
      const authorName = req.user.name || req.user.email;
      const authorEmail = req.user.email;

      // Notify participants (they can interact with the activity)
      if (activity.participants && activity.participants.length > 0) {
        for (const participantEmail of activity.participants) {
          if (participantEmail !== authorEmail) { // Don't notify the author
            try {
              await emailService.sendActivityInvitation(
                participantEmail,
                activity.title,
                activity.description || '',
                authorName,
                authorEmail,
                activity.id
              );
            } catch (error) {
              console.error(`Failed to send invitation to ${participantEmail}:`, error);
            }
          }
        }
      }

      // Notify collaborators (they have read-only access)
      if (activity.collaborators && activity.collaborators.length > 0) {
        for (const collaboratorEmail of activity.collaborators) {
          if (collaboratorEmail !== authorEmail) { // Don't notify the author
            try {
              await emailService.sendCollaboratorInvitation(
                collaboratorEmail,
                activity.title,
                activity.description || '',
                authorName,
                authorEmail,
                activity.id
              );
            } catch (error) {
              console.error(`Failed to send collaboration invite to ${collaboratorEmail}:`, error);
            }
          }
        }
      }

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

  // Transfer ownership route
  app.post("/api/activities/:id/transfer-ownership", requireAuth, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const { newOwnerId } = req.body;
      
      if (!newOwnerId || typeof newOwnerId !== 'number') {
        return res.status(400).json({ message: "New owner ID is required" });
      }

      const updatedActivity = await storage.transferActivityOwnership(
        activityId, 
        newOwnerId, 
        req.user.id
      );
      
      res.json(updatedActivity);
    } catch (error) {
      console.error("Transfer ownership error:", error);
      res.status(400).json({ message: error.message || "Failed to transfer ownership" });
    }
  });

  // Archive/Unarchive activity routes
  app.patch("/api/activities/:id/archive", requireAuth, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const activity = await storage.updateActivity(activityId, { status: "archived" });
      res.json(activity);
    } catch (error) {
      console.error("Archive activity error:", error);
      res.status(500).json({ message: "Failed to archive activity" });
    }
  });

  app.patch("/api/activities/:id/unarchive", requireAuth, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const activity = await storage.updateActivity(activityId, { status: "pending" });
      res.json(activity);
    } catch (error) {
      console.error("Unarchive activity error:", error);
      res.status(500).json({ message: "Failed to unarchive activity" });
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

  // Smart prioritization endpoint
  app.get("/api/smart-insights", requireAuth, async (req: any, res) => {
    try {
      const activities = await storage.getActivities(req.user.id, req.user.role === "admin");
      const insights = smartPrioritizationService.getPersonalizedRecommendations(activities);
      res.json(insights);
    } catch (error) {
      console.error("Get smart insights error:", error);
      res.status(500).json({ message: "Failed to fetch smart insights" });
    }
  });

  // Users route for ownership transfer
  app.get("/api/users", requireAuth, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
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
      const { isRescueMode, linkedTaskId, ...roadblockData } = req.body;
      
      const roadblock = await storage.createRoadblock({
        ...roadblockData,
        createdBy: req.user.id,
      });

      // If this is rescue mode with resolution, create high-priority subtask
      if (isRescueMode && roadblockData.resolution && roadblockData.newDeadline && linkedTaskId) {
        const rescueSubtask = await storage.createSubtask({
          title: `[RESCUED] ${roadblockData.title}`,
          description: `Rescued task with solution: ${roadblockData.resolution}`,
          type: "task",
          status: "pending",
          priority: "high",
          dueDate: new Date(roadblockData.newDeadline),
          participants: [req.user.email],
          participantTypes: { [req.user.email]: "task" },
          linkedActivityId: roadblockData.linkedActivityId,
          createdBy: req.user.id,
        });

        // Mark original subtask as resolved via roadblock rescue
        if (linkedTaskId) {
          await storage.updateSubtask(linkedTaskId, {
            status: "resolved",
            completedDate: new Date(),
          });
        }

        return res.json({ roadblock, rescueSubtask });
      }

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
      const allSubtasks = await storage.getSubtasks(req.user.id);
      // Filter subtasks to only show those assigned to the current user
      const userEmail = req.user.email;
      const assignedSubtasks = allSubtasks.filter(subtask => 
        subtask.participants.includes(userEmail)
      );
      res.json(assignedSubtasks);
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
      console.log(`[API] Updating subtask ${subtaskId} with data:`, req.body);
      
      // Allow partial updates without strict validation for status changes
      const allowedFields = ['status', 'title', 'description', 'priority', 'dueDate', 'participants', 'participantTypes'];
      const updateData = Object.keys(req.body)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {} as any);
      
      console.log(`[API] Filtered update data:`, updateData);
      
      const subtask = await storage.updateSubtask(subtaskId, updateData);
      console.log(`[API] Successfully updated subtask:`, subtask);
      res.json(subtask);
    } catch (error) {
      console.error("Update subtask error:", error);
      res.status(500).json({ 
        message: "Failed to update subtask", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
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

      // Verify either activity or subtask exists before creating completion
      const activity = await storage.getActivity(activityId);
      const subtask = activity ? null : await storage.getSubtask(activityId);
      
      if (!activity && !subtask) {
        console.log(`[API] Task completion failed: Neither activity nor subtask found for ID ${activityId}`);
        return res.status(400).json({ error: `Task ${activityId} not found` });
      }

      // Check user has access to this task
      if (activity && activity.createdBy !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to update this task" });
      }
      
      if (subtask) {
        const userEmail = req.user.email;
        if (!subtask.participants.includes(userEmail)) {
          return res.status(403).json({ error: "Not authorized to update this subtask" });
        }
      }

      const result = await storage.createOrUpdateDailyTaskCompletion(
        req.user.id,
        activityId,
        taskDate,
        completed
      );

      // If completing a task, mark the underlying activity/subtask as completed
      if (completed) {
        if (activity) {
          await storage.updateActivity(activityId, { 
            status: 'completed'
          });
        } else if (subtask) {
          await storage.updateSubtask(activityId, {
            status: 'completed',
            completedDate: new Date()
          });
        }
      } else {
        // If uncompleting, revert to active status
        if (activity) {
          await storage.updateActivity(activityId, { 
            status: 'active'
          });
        } else if (subtask) {
          await storage.updateSubtask(activityId, {
            status: 'active',
            completedDate: null
          });
        }
      }

      res.json({ success: true, activityId, taskDate, completed, result });
    } catch (error) {
      console.error("Error updating task completion:", error);
      res.status(500).json({ error: "Failed to update task completion" });
    }
  });

  // Manual status update endpoint for activities
  app.patch("/api/activities/:id/status", requireAuth, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const { status } = req.body;

      const validStatuses = ['pending', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      if (activity.createdBy !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to update this activity" });
      }

      const updatedActivity = await storage.updateActivity(activityId, { status });
      res.json({ success: true, activity: updatedActivity });
    } catch (error) {
      console.error("Error updating activity status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.patch("/api/subtasks/:id/status", requireAuth, async (req: any, res) => {
    try {
      const subtaskId = parseInt(req.params.id);
      const { status } = req.body;

      const validStatuses = ['pending', 'in_progress', 'completed', 'resolved'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const subtask = await storage.getSubtask(subtaskId);
      if (!subtask) {
        return res.status(404).json({ error: "Subtask not found" });
      }

      const userEmail = req.user.email;
      if (!subtask.participants.includes(userEmail)) {
        return res.status(403).json({ error: "Not authorized to update this subtask" });
      }

      const updatedSubtask = await storage.updateSubtask(subtaskId, {
        status,
        completedDate: status === 'completed' ? new Date() : null
      });

      res.json({ success: true, subtask: updatedSubtask });
    } catch (error) {
      console.error("Error updating subtask status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.post("/api/subtasks/:id/rescue", requireAuth, async (req: any, res) => {
    try {
      const subtaskId = parseInt(req.params.id);
      const { proposedResolution, newDeadline, oorzaakCategory, oorzaakFactor, severity } = req.body;
      
      if (!proposedResolution || !newDeadline || !oorzaakCategory) {
        return res.status(400).json({ error: "Proposed resolution, new deadline, and root cause category are required" });
      }

      const subtask = await storage.getSubtask(subtaskId);
      if (!subtask) {
        return res.status(404).json({ error: "Subtask not found" });
      }

      const userEmail = req.user.email;
      if (!subtask.participants.includes(userEmail)) {
        return res.status(403).json({ error: "Not authorized to rescue this subtask" });
      }

      // Create a high-priority resolution task in the same activity
      // Reset participant types to ensure it's treated as a regular task, not a roadblock
      const cleanParticipantTypes: Record<string, string> = {};
      subtask.participants.forEach(participant => {
        cleanParticipantTypes[participant] = 'task';
      });

      const rescueTaskData = {
        title: `🚨 RESCUE: ${subtask.title}`,
        description: `RESCUE TASK - Original deadline missed\n\nOriginal Task: ${subtask.title}\nProposed Resolution: ${proposedResolution}\n\nRoot Cause Analysis:\n- Category: ${oorzaakCategory}\n- Factor: ${oorzaakFactor || 'Not specified'}\n- Severity: ${severity}\n\nThis is a high-priority rescue task to resolve the roadblock.`,
        type: 'task' as const,
        status: 'pending' as const,
        priority: 'high' as const,
        dueDate: new Date(newDeadline),
        participants: subtask.participants,
        participantTypes: cleanParticipantTypes as any,
        linkedActivityId: subtask.linkedActivityId,
        createdBy: req.user.id
      };

      // Create roadblock entry for Blame Analytics
      const roadblockData = {
        title: `Roadblock: ${subtask.title}`,
        description: `Task became roadblock due to missed deadline. Original: ${subtask.description}`,
        severity: severity || 'medium',
        status: 'resolved' as const,
        assignedTo: subtask.participants[0] || null,
        oorzaakCategory,
        oorzaakFactor: oorzaakFactor || null,
        departmentImpact: [],
        linkedActivityId: subtask.linkedActivityId,
        linkedSubtaskId: subtaskId,
        reportedDate: new Date(),
        resolvedAt: new Date(),
        proposedResolution,
        newDeadline: new Date(newDeadline),
        createdBy: req.user.id
      };

      const roadblock = await storage.createRoadblock(roadblockData);
      const rescueTask = await storage.createSubtask(rescueTaskData);

      // Mark the original roadblock as resolved
      const updatedSubtask = await storage.updateSubtask(subtaskId, {
        status: 'resolved',
        rescuedAt: new Date(),
        rescueCount: (subtask.rescueCount || 0) + 1
      });

      // Remove from roadblocks if it was there
      try {
        const roadblocks = await storage.getRoadblocks();
        const roadblock = roadblocks.find(r => 
          r.linkedActivityId === subtask.linkedActivityId && r.linkedSubtaskId === subtaskId
        );
        if (roadblock) {
          await storage.updateRoadblock(roadblock.id, { status: 'resolved' });
        }
      } catch (roadblockError) {
        console.warn("Could not update roadblock status:", roadblockError);
      }

      res.json({ 
        success: true, 
        subtask: updatedSubtask,
        rescueTask: rescueTask,
        roadblock: roadblock,
        message: "High-priority resolution task created successfully with roadblock analysis"
      });
    } catch (error) {
      console.error("Error rescuing subtask:", error);
      res.status(500).json({ error: "Failed to rescue task" });
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
      
      // Check if ethos already exists for this day
      const existingEthos = await storage.getWeeklyEthosByDay(req.session.userId, ethosData.dayOfWeek);
      
      let ethos;
      if (existingEthos) {
        // Update existing ethos if one exists for this day
        ethos = await storage.updateWeeklyEthos(existingEthos.id, ethosData);
      } else {
        // Create new ethos
        ethos = await storage.createWeeklyEthos({
          ...ethosData,
          createdBy: req.session.userId,
        });
      }
      
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

  app.delete("/api/ethos/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      await storage.deleteWeeklyEthos(id);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete weekly ethos error:", error);
      res.status(500).json({ message: "Failed to delete weekly ethos" });
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
      const activities = await storage.getActivities(req.session.userId, user?.email || '', user?.role === 'admin');
      
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
        priorityMatrix: agendaSuggestion.priorityMatrix,
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
      const activities = await storage.getActivities(req.session.userId, user?.email || '', user?.role === 'admin');
      const ethos = await storage.getWeeklyEthosByDay(req.session.userId, dayOfWeek);
      
      // Categorize activities using priority matrix
      const matrix = await categorizeActivitiesWithPriority(
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

  // Analytics routes for management insights
  app.get("/api/analytics/productivity", requireAuth, async (req: any, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const metrics = await analyticsService.getUserProductivityMetrics(req.user.id, days);
      res.json(metrics);
    } catch (error) {
      console.error("Get productivity metrics error:", error);
      res.status(500).json({ message: "Failed to fetch productivity metrics" });
    }
  });

  app.get("/api/analytics/team", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const metrics = await analyticsService.getTeamMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Get team metrics error:", error);
      res.status(500).json({ message: "Failed to fetch team metrics" });
    }
  });

  app.get("/api/analytics/roi", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const metrics = await analyticsService.getROIMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Get ROI metrics error:", error);
      res.status(500).json({ message: "Failed to fetch ROI metrics" });
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
        storage.getActivities(req.user.id, req.user.email, isAdmin),
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

  // Microsoft Contacts routes
  app.get("/api/microsoft/contacts", requireAuth, async (req: any, res) => {
    try {
      const searchFilter = req.query.search as string;
      console.log(`[API] Fetching Microsoft contacts for user ${req.user.id}${searchFilter ? ` with filter: ${searchFilter}` : ''}`);
      
      const contacts = await microsoftCalendarService.getMicrosoftContacts(req.user.id, searchFilter);
      
      const nijhuisContacts = contacts.filter(c => 
        c.emailAddresses?.some(e => e.address?.includes('nijhuis.nl'))
      );
      
      console.log(`[API] Found ${contacts.length} total contacts (${nijhuisContacts.length} from Nijhuis domain)`);
      
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching Microsoft contacts:", error);
      res.status(500).json({ message: "Failed to fetch Microsoft contacts" });
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
      // TODO: Implement integration settings storage
      const settings = null; // await storage.getIntegrationSettings(req.user!.id, req.params.type);
      res.json(settings || {});
    } catch (error) {
      console.error("Integration settings error:", error);
      res.status(500).json({ message: "Failed to get integration settings" });
    }
  });

  app.post("/api/integrations/:type/settings", requireAuth, async (req, res) => {
    try {
      // TODO: Implement integration settings storage
      const existingSettings = null; // await storage.getIntegrationSettings(req.user!.id, req.params.type);
      
      if (existingSettings) {
        // const updated = await storage.updateIntegrationSettings(existingSettings.id, req.body);
        res.json({ message: "Settings updated successfully" });
      } else {
        // const created = await storage.createIntegrationSettings({
        //   userId: req.user!.id,
        //   integrationType: req.params.type,
        //   ...req.body
        // });
        res.json({ message: "Settings created successfully" });
      }
    } catch (error) {
      console.error("Integration settings update error:", error);
      res.status(500).json({ message: "Failed to update integration settings" });
    }
  });

  // Azure Migration API routes
  app.get("/api/azure/status", requireAuth, async (req, res) => {
    try {
      const configured = azureMigrationService.isConfigured();
      const migrationStatus = azureMigrationService.getMigrationStatus();
      const serviceHealth = await azureMigrationService.getAzureServiceHealth();
      
      res.json({
        configured,
        migrationStatus,
        serviceHealth
      });
    } catch (error) {
      console.error("Azure status error:", error);
      res.status(500).json({ message: "Failed to get Azure status" });
    }
  });

  app.post("/api/azure/test-connection", requireAuth, async (req, res) => {
    try {
      const result = await azureMigrationService.testConnection();
      res.json(result);
    } catch (error) {
      console.error("Azure connection test error:", error);
      res.status(500).json({ message: "Failed to test Azure connection" });
    }
  });

  app.get("/api/azure/migration-estimate", requireAuth, async (req, res) => {
    try {
      const estimate = await azureMigrationService.getMigrationEstimate();
      res.json(estimate);
    } catch (error) {
      console.error("Migration estimate error:", error);
      res.status(500).json({ message: "Failed to get migration estimate" });
    }
  });

  app.post("/api/azure/prepare-migration", requireAuth, async (req, res) => {
    try {
      const result = await azureMigrationService.prepareMigration();
      res.json(result);
    } catch (error) {
      console.error("Migration preparation error:", error);
      res.status(500).json({ message: "Failed to prepare migration" });
    }
  });

  app.post("/api/azure/execute-migration", requireAuth, async (req, res) => {
    try {
      const result = await azureMigrationService.executeMigration();
      res.json(result);
    } catch (error) {
      console.error("Migration execution error:", error);
      res.status(500).json({ message: "Failed to execute migration" });
    }
  });

  app.post("/api/azure/rollback-migration", requireAuth, async (req, res) => {
    try {
      const result = await azureMigrationService.rollbackMigration();
      res.json(result);
    } catch (error) {
      console.error("Migration rollback error:", error);
      res.status(500).json({ message: "Failed to rollback migration" });
    }
  });

  // DigiOffice Integration endpoints
  app.get("/api/digioffice/status", requireAuth, async (req, res) => {
    try {
      const status = await digiOfficeService.getIntegrationStatus(req.user!.id);
      res.json(status);
    } catch (error) {
      console.error("DigiOffice status error:", error);
      res.status(500).json({ message: "Failed to get DigiOffice status" });
    }
  });

  app.get("/api/digioffice/test-connection", requireAuth, async (req, res) => {
    try {
      const connected = await digiOfficeService.testConnection();
      res.json({ connected });
    } catch (error) {
      console.error("DigiOffice connection test error:", error);
      res.status(500).json({ message: "Failed to test DigiOffice connection" });
    }
  });

  app.get("/api/digioffice/search", requireAuth, async (req, res) => {
    try {
      const { query, folderId, pageSize = 50, pageToken } = req.query;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const results = await digiOfficeService.searchDocuments(
        req.user!.id,
        query as string,
        folderId as string,
        parseInt(pageSize as string),
        pageToken as string
      );
      
      res.json(results);
    } catch (error) {
      console.error("DigiOffice search error:", error);
      res.status(500).json({ message: "Failed to search DigiOffice documents" });
    }
  });

  app.get("/api/digioffice/folders", requireAuth, async (req, res) => {
    try {
      const { parentId } = req.query;
      const folders = await digiOfficeService.getFolders(req.user!.id, parentId as string);
      res.json(folders);
    } catch (error) {
      console.error("DigiOffice folders error:", error);
      res.status(500).json({ message: "Failed to get DigiOffice folders" });
    }
  });

  app.get("/api/digioffice/folders/:folderId/documents", requireAuth, async (req, res) => {
    try {
      const { pageSize = 50, pageToken } = req.query;
      const results = await digiOfficeService.getFolderDocuments(
        req.user!.id,
        req.params.folderId,
        parseInt(pageSize as string),
        pageToken as string
      );
      res.json(results);
    } catch (error) {
      console.error("DigiOffice folder documents error:", error);
      res.status(500).json({ message: "Failed to get folder documents" });
    }
  });

  app.get("/api/digioffice/documents/:documentId", requireAuth, async (req, res) => {
    try {
      const document = await digiOfficeService.getDocument(req.user!.id, req.params.documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("DigiOffice document error:", error);
      res.status(500).json({ message: "Failed to get document" });
    }
  });

  app.post("/api/digioffice/documents/:documentId/checkout", requireAuth, async (req, res) => {
    try {
      const result = await digiOfficeService.checkOutDocument(req.user!.id, req.params.documentId);
      res.json(result);
    } catch (error) {
      console.error("DigiOffice checkout error:", error);
      res.status(500).json({ message: "Failed to checkout document" });
    }
  });

  app.post("/api/digioffice/documents/:documentId/checkin", requireAuth, async (req, res) => {
    try {
      const { comment } = req.body;
      const result = await digiOfficeService.checkInDocument(
        req.user!.id, 
        req.params.documentId, 
        comment
      );
      res.json(result);
    } catch (error) {
      console.error("DigiOffice checkin error:", error);
      res.status(500).json({ message: "Failed to checkin document" });
    }
  });

  app.get("/api/digioffice/documents/:documentId/download-url", requireAuth, async (req, res) => {
    try {
      const downloadUrl = await digiOfficeService.getDocumentDownloadUrl(req.user!.id, req.params.documentId);
      
      if (!downloadUrl) {
        return res.status(404).json({ message: "Download URL not available" });
      }
      
      res.json({ downloadUrl });
    } catch (error) {
      console.error("DigiOffice download URL error:", error);
      res.status(500).json({ message: "Failed to get download URL" });
    }
  });

  app.post("/api/digioffice/document-references", requireAuth, async (req, res) => {
    try {
      const { activityId, subtaskId, quickWinId, roadblockId, documentId, description } = req.body;
      
      if (!documentId) {
        return res.status(400).json({ message: "Document ID is required" });
      }

      // Get document details from DigiOffice
      const document = await digiOfficeService.getDocument(req.user!.id, documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found in DigiOffice" });
      }

      // Create document reference in database
      const reference = await storage.createDocumentReference({
        activityId,
        subtaskId,
        quickWinId,
        roadblockId,
        documentId: document.id,
        documentName: document.name,
        documentPath: document.path,
        documentUrl: document.url,
        documentType: document.mimeType,
        fileSize: document.fileSize,
        version: document.version,
        description,
        isCheckedOut: document.isCheckedOut,
        checkedOutBy: document.checkedOutBy ? req.user!.id : null,
        checkedOutAt: document.checkedOutAt ? new Date(document.checkedOutAt) : null,
        createdBy: req.user!.id
      });

      res.json(reference);
    } catch (error) {
      console.error("Document reference creation error:", error);
      res.status(500).json({ message: "Failed to create document reference" });
    }
  });

  app.get("/api/activities/:activityId/document-references", requireAuth, async (req, res) => {
    try {
      const references = await storage.getDocumentReferences({ activityId: parseInt(req.params.activityId) });
      res.json(references);
    } catch (error) {
      console.error("Document references error:", error);
      res.status(500).json({ message: "Failed to get document references" });
    }
  });

  app.delete("/api/document-references/:referenceId", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteDocumentReference(parseInt(req.params.referenceId), req.user!.id);
      
      if (!success) {
        return res.status(404).json({ message: "Document reference not found or not authorized" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Document reference deletion error:", error);
      res.status(500).json({ message: "Failed to delete document reference" });
    }
  });

  // Health check endpoint for Fly.io
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  // Calendar Integration API
  app.get("/api/calendar/integrations", requireAuth, async (req: any, res) => {
    try {
      const integrations = await storage.getCalendarIntegrations(req.user.id);
      res.json(integrations);
    } catch (error) {
      console.error("Get calendar integrations error:", error);
      res.status(500).json({ message: "Failed to get calendar integrations" });
    }
  });

  app.post("/api/calendar/integrations", requireAuth, async (req: any, res) => {
    try {
      const integrationData = {
        ...req.body,
        userId: req.user.id
      };
      
      const integration = await storage.createCalendarIntegration(integrationData);
      res.status(201).json(integration);
    } catch (error) {
      console.error("Create calendar integration error:", error);
      res.status(500).json({ message: "Failed to create calendar integration" });
    }
  });

  // OAuth callback handler for Microsoft calendar
  app.post("/api/calendar/oauth/callback", requireAuth, async (req: any, res) => {
    try {
      const { code, redirectUri } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Authorization code is required" });
      }

      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(500).json({ error: "Microsoft OAuth not configured" });
      }

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokenData);
        return res.status(400).json({ error: "Failed to exchange authorization code" });
      }

      // Get user's calendar information
      const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      const profileData = await profileResponse.json();

      if (!profileResponse.ok) {
        console.error('Profile fetch failed:', profileData);
        return res.status(400).json({ error: "Failed to fetch user profile" });
      }

      // Store the calendar integration
      const integration = await storage.createCalendarIntegration({
        userId: req.user.id,
        provider: 'outlook',
        accountEmail: profileData.mail || profileData.userPrincipalName,
        accountId: profileData.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiry: new Date(Date.now() + tokenData.expires_in * 1000),
        isActive: true,
        syncEnabled: true,
      });

      res.json({
        success: true,
        integration: {
          id: integration.id,
          provider: integration.provider,
          accountEmail: integration.accountEmail,
          isActive: integration.isActive,
          syncEnabled: integration.syncEnabled,
        }
      });
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).json({ error: "Failed to process OAuth callback" });
    }
  });

  app.put("/api/calendar/integrations/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const integration = await storage.updateCalendarIntegration(parseInt(id), req.body);
      res.json(integration);
    } catch (error) {
      console.error("Update calendar integration error:", error);
      res.status(500).json({ message: "Failed to update calendar integration" });
    }
  });

  app.delete("/api/calendar/integrations/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCalendarIntegration(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete calendar integration error:", error);
      res.status(500).json({ message: "Failed to delete calendar integration" });
    }
  });

  app.get("/api/calendar/events", requireAuth, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      
      const events = await storage.getCalendarEventsByUser(req.user.id, start, end);
      res.json(events);
    } catch (error) {
      console.error("Get calendar events error:", error);
      res.status(500).json({ message: "Failed to get calendar events" });
    }
  });

  app.post("/api/calendar/events", requireAuth, async (req: any, res) => {
    try {
      const event = await storage.createCalendarEvent(req.body);
      res.status(201).json(event);
    } catch (error) {
      console.error("Create calendar event error:", error);
      res.status(500).json({ message: "Failed to create calendar event" });
    }
  });

  app.get("/api/deadline-reminders", requireAuth, async (req: any, res) => {
    try {
      const { daysAhead } = req.query;
      const days = daysAhead ? parseInt(daysAhead) : 7;
      
      const reminders = await storage.getUpcomingDeadlineReminders(req.user.id, days);
      res.json(reminders);
    } catch (error) {
      console.error("Get deadline reminders error:", error);
      res.status(500).json({ message: "Failed to get deadline reminders" });
    }
  });

  app.post("/api/deadline-reminders", requireAuth, async (req: any, res) => {
    try {
      const reminderData = {
        ...req.body,
        userId: req.user.id
      };
      
      const reminder = await storage.createDeadlineReminder(reminderData);
      res.status(201).json(reminder);
    } catch (error) {
      console.error("Create deadline reminder error:", error);
      res.status(500).json({ message: "Failed to create deadline reminder" });
    }
  });

  app.post("/api/activities/:id/deadline-reminders", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.createDeadlineRemindersForActivity(parseInt(id), req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Create activity deadline reminders error:", error);
      res.status(500).json({ message: "Failed to create deadline reminders" });
    }
  });

  app.post("/api/subtasks/:id/deadline-reminders", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.createDeadlineRemindersForSubtask(parseInt(id), req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Create subtask deadline reminders error:", error);
      res.status(500).json({ message: "Failed to create deadline reminders" });
    }
  });

  return httpServer;
}
