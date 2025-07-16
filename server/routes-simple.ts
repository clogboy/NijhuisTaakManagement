import { createServer, type Server } from "http";
import express, { type Express, type Request, type Response } from "express";
import { WebSocketServer } from "ws";
import { storage } from "./storage";

// Simple auth middleware for development
function requireAuth(req: Request, res: Response, next: any) {
  const session = (req as any).session;

  // Development mode: auto-authenticate
  if (process.env.NODE_ENV === 'development' || process.env.REPL_ENVIRONMENT === 'development') {
    (req as any).user = {
      id: 1,
      email: 'demo@nijhuis.nl',
      name: 'Demo User',
      role: 'user',
      isAdmin: false
    };
    return next();
  }

  // Production: check session
  if (session && session.user) {
    (req as any).user = session.user;
    return next();
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(401).json({ message: "Authentication required" });
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/api/ws'
  });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Handle WebSocket messages here
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ status: "unhealthy", error: "Database connection failed" });
    }
  });

  // Demo mode - no auth endpoints needed

  // User preferences
  app.get("/api/user/preferences", requireAuth, async (req: any, res) => {
    try {
      const preferences = await storage.getUserPreferences(req.user.id);
      res.json(preferences || { productivityHealthEnabled: true });
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.json({ productivityHealthEnabled: true });
    }
  });

  app.patch("/api/user/preferences", requireAuth, async (req: any, res) => {
    try {
      const updatedPreferences = await storage.updateUserPreferences(req.user.id, req.body);
      res.json(updatedPreferences);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Activity routes
  app.get("/api/activities", requireAuth, async (req: any, res) => {
    try {
      const activities = await storage.getActivities(req.user.id);
      res.json(activities);
    } catch (error) {
      console.error("Get activities error:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities", requireAuth, async (req: any, res) => {
    try {
      const activity = await storage.createActivity({
        ...req.body,
        createdBy: req.user.id
      });
      res.json(activity);
    } catch (error) {
      console.error("Create activity error:", error);
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  // Other data routes
  app.get("/api/contacts", requireAuth, async (req: any, res) => {
    try {
      const contacts = await storage.getContacts(req.user.id);
      res.json(contacts);
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get("/api/subtasks", requireAuth, async (req: any, res) => {
    try {
      const subtasks = await storage.getSubtasks(req.user.id);
      res.json(subtasks);
    } catch (error) {
      console.error("Get subtasks error:", error);
      res.status(500).json({ message: "Failed to fetch subtasks" });
    }
  });

  app.get("/api/roadblocks", requireAuth, async (req: any, res) => {
    try {
      const roadblocks = await storage.getRoadblocks(req.user.id);
      res.json(roadblocks);
    } catch (error) {
      console.error("Get roadblocks error:", error);
      res.status(500).json({ message: "Failed to fetch roadblocks" });
    }
  });

  app.get("/api/quickwins", requireAuth, async (req: any, res) => {
    try {
      const quickWins = await storage.getQuickWins(req.user.id);
      const safeQuickWins = Array.isArray(quickWins) ? quickWins : [];
      res.json(safeQuickWins);
    } catch (error) {
      console.error("Error fetching quick wins:", error);
      res.status(500).json({ error: "Failed to fetch quick wins", data: [] });
    }
  });

  // Dashboard data endpoints
  app.get("/api/daily-reflections", requireAuth, async (req: any, res) => {
    try {
      const reflection = {
        date: new Date().toISOString().split('T')[0],
        completedToday: 0,
        pendingUrgent: 0,
        weeklyProgress: 0,
        insights: ["Steady progress is the key. Small consistent actions lead to big results."]
      };
      res.json(reflection);
    } catch (error) {
      console.error("Error fetching daily reflections:", error);
      res.status(500).json({ error: "Failed to fetch reflections", data: null });
    }
  });

  app.get("/api/smart-insights", requireAuth, async (req: any, res) => {
    try {
      const insights = {
        timeSlotSuggestions: {
          morning: [],
          afternoon: [],
          evening: []
        },
        insights: [
          "Morning hours are best for high-priority tasks",
          "Afternoon is ideal for collaborative work", 
          "Evening works well for quick wins and admin tasks"
        ]
      };
      res.json(insights);
    } catch (error) {
      console.error("Error fetching smart insights:", error);
      res.status(500).json({ error: "Failed to fetch smart insights", data: insights });
    }
  });

  // Placeholder endpoints for dashboard
  app.get("/api/activity-logs/:activityId", requireAuth, (req, res) => res.json([]));
  app.get("/api/task-comments/:activityId", requireAuth, (req, res) => res.json([]));
  app.get("/api/user-metrics", requireAuth, (req, res) => res.json([]));
  app.get("/api/time-blocks", requireAuth, (req, res) => res.json([]));

  // Flow Protection endpoints
  app.get("/api/flow/personality-presets", async (req, res) => {
    try {
      const { flowProtectionService } = await import("./flow-protection-service");
      const presets = flowProtectionService.getPersonalityPresets();
      res.json(presets);
    } catch (error) {
      console.error("Error fetching personality presets:", error);
      res.status(500).json({ message: "Failed to fetch personality presets" });
    }
  });

  app.get("/api/flow/current-strategy", requireAuth, async (req: any, res) => {
    try {
      const currentStrategy = await storage.getCurrentFlowStrategy(req.user.id);
      res.json(currentStrategy || null);
    } catch (error) {
      console.error("Error fetching current strategy:", error);
      res.status(500).json({ message: "Failed to fetch current strategy" });
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

  app.get("/api/flow/recommendations", requireAuth, async (req: any, res) => {
    try {
      const { flowProtectionService } = await import("./flow-protection-service");
      const currentStrategy = await storage.getCurrentFlowStrategy(req.user.id);

      if (!currentStrategy) {
        return res.json({
          shouldFocus: true,
          suggestedTaskTypes: ['deep_work'],
          allowInterruptions: false,
          energyLevel: 0.7,
          timeSlotType: 'productive',
          recommendation: 'No active flow strategy. Consider setting up a personality-based strategy.'
        });
      }

      const recommendations = flowProtectionService.getFlowRecommendations(currentStrategy);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching flow recommendations:", error);
      res.status(500).json({ message: "Failed to fetch flow recommendations" });
    }
  });

  return httpServer;
}