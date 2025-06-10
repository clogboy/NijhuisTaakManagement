import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertActivitySchema, insertActivityLogSchema, insertQuickWinSchema, insertRoadblockSchema, insertWeeklyEthosSchema, insertDailyAgendaSchema, insertTimeBlockSchema } from "@shared/schema";
import { generateDailyAgenda, categorizeActivitiesWithEisenhower } from "./ai-service";
import { timeBlockingService } from "./time-blocking-service";
import { microsoftCalendarService } from "./microsoft-calendar-service";
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
      const activities = await storage.getActivities(req.session.userId, user?.isAdmin || false);
      
      // Get ethos for the day
      const ethos = await storage.getWeeklyEthosByDay(req.session.userId, dayOfWeek);
      
      // Generate AI-powered agenda
      const agendaSuggestion = await generateDailyAgenda(
        activities.filter(a => a.status !== 'completed'),
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
      const activities = await storage.getActivities(req.session.userId, user?.isAdmin || false);
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
        activityIds,
        scheduleDate,
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

  // Health check endpoint for Fly.io
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
