import express from "express";
import { storage } from "./storage";
import { requireAuth } from "./middleware/auth.middleware";
import { 
  insertActivitySchema, insertSubtaskSchema, insertQuickWinSchema, 
  insertRoadblockSchema, insertContactSchema, insertActivityLogSchema 
} from "../shared/schema";

import { createServer } from 'http';

export function registerRoutes(app: express.Application) {
  const httpServer = createServer(app);
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

  // Flow Protection Routes
  app.get("/api/flow/current-strategy", requireAuth, async (req: any, res) => {
    try {
      const currentStrategy = await storage.getCurrentFlowStrategy(req.user.id);
      res.json(currentStrategy);
    } catch (error) {
      console.error("Error fetching current flow strategy:", error);
      res.status(500).json({ message: "Failed to fetch current flow strategy" });
    }
  });

  app.get("/api/flow/personality-presets", requireAuth, async (req: any, res) => {
    try {
      const { flowProtectionService } = await import("./flow-protection-service");
      const presets = flowProtectionService.getPersonalityPresets();
      res.json(presets);
    } catch (error) {
      console.error("Error fetching personality presets:", error);
      res.status(500).json({ message: "Failed to fetch personality presets" });
    }
  });

  app.post("/api/flow/apply-preset", requireAuth, async (req: any, res) => {
    try {
      const { personalityType } = req.body;
      const { flowProtectionService } = await import("./flow-protection-service");

      const presets = flowProtectionService.getPersonalityPresets();
      const preset = presets.find(p => p.personalityType === personalityType);

      if (!preset) {
        return res.status(400).json({ message: "Invalid personality type" });
      }

      // Apply the flow strategy
      const success = await storage.applyFlowStrategy(req.user.id, preset);

      if (success) {
        res.json({ success: true, message: "Flow strategy applied successfully" });
      } else {
        res.status(500).json({ message: "Failed to apply flow strategy" });
      }
    } catch (error) {
      console.error("Error applying flow strategy:", error);
      res.status(500).json({ message: "Failed to apply flow strategy" });
    }
  });

  // Flow protection endpoints
  app.get("/api/flow-protection/config", requireAuth, async (req, res) => {
    try {
      const { flowProtectionService, timeBlockingService } = await import("./flow-protection-service");
      const config = await flowProtectionService.getUserConfig(req.user.id);
      res.json(config);
    } catch (error) {
      console.error('Error fetching flow config:', error);
      res.status(500).json({ error: 'Failed to fetch flow configuration' });
    }
  });

  app.get("/api/flow-protection/strategies", requireAuth, async (req, res) => {
    try {
      const { flowProtectionService } = await import("./flow-protection-service");
      const strategies = [
        { name: "Deep Focus", description: "2-4 hour blocks for complex work" },
        { name: "Sprint Mode", description: "25-50 minute focused bursts" },
        { name: "Hybrid Flow", description: "Mixed deep work and quick tasks" },
        { name: "Meeting Buffer", description: "Protected time around meetings" }
      ];
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch strategies' });
    }
  });

  // Time blocking endpoints
  app.get("/api/time-blocks", requireAuth, async (req, res) => {
    try {
      const { timeBlockingService } = await import("./flow-protection-service");
      const { date } = req.query;
      const timeBlocks = await timeBlockingService.getUserTimeBlocks(req.user.id, date as string);
      res.json(timeBlocks);
    } catch (error) {
      console.error('Error fetching time blocks:', error);
      res.status(500).json({ error: 'Failed to fetch time blocks' });
    }
  });

  app.post("/api/time-blocks", requireAuth, async (req, res) => {
    try {
      const { timeBlockingService } = await import("./flow-protection-service");
      const timeBlock = await timeBlockingService.createTimeBlock(req.user.id, req.body);
      res.json(timeBlock);
    } catch (error) {
      console.error('Error creating time block:', error);
      res.status(500).json({ error: 'Failed to create time block' });
    }
  });

  app.patch("/api/time-blocks/:id", requireAuth, async (req, res) => {
    try {
      const { timeBlockingService } = await import("./flow-protection-service");
      const timeBlock = await timeBlockingService.updateTimeBlock(
        parseInt(req.params.id), 
        req.body
      );
      res.json(timeBlock);
    } catch (error) {
      console.error('Error updating time block:', error);
      res.status(500).json({ error: 'Failed to update time block' });
    }
  });

  app.delete("/api/time-blocks/:id", requireAuth, async (req, res) => {
    try {
      const { timeBlockingService } = await import("./flow-protection-service");
      await timeBlockingService.deleteTimeBlock(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting time block:', error);
      res.status(500).json({ error: 'Failed to delete time block' });
    }
  });

  // Rescue workflow endpoints
  app.post("/api/rescue-workflow", requireAuth, async (req, res) => {
    try {
      const workflow = await storage.createRescueWorkflow(req.user.id, req.body);
      res.json(workflow);
    } catch (error) {
      console.error('Error creating rescue workflow:', error);
      res.status(500).json({ error: 'Failed to create rescue workflow' });
    }
  });

  app.patch("/api/rescue-workflow/:id/step", requireAuth, async (req, res) => {
    try {
      const workflow = await storage.updateRescueWorkflowStep(
        parseInt(req.params.id),
        req.body
      );
      res.json(workflow);
    } catch (error) {
      console.error('Error updating rescue workflow step:', error);
      res.status(500).json({ error: 'Failed to update workflow step' });
    }
  });

  app.patch("/api/rescue-workflow/:id/escalate", requireAuth, async (req, res) => {
    try {
      const workflow = await storage.escalateRescueWorkflow(parseInt(req.params.id));
      res.json(workflow);
    } catch (error) {
      console.error('Error escalating rescue workflow:', error);
      res.status(500).json({ error: 'Failed to escalate workflow' });
    }
  });

  return httpServer;
}