import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertRoadblockSchema, insertSubtaskSchema, insertActivitySchema } from "@shared/schema";

// Enhanced error handler with proper typing
interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

const handleApiError = (error: unknown, res: Response): void => {
  console.error("API Error:", error);
  
  if (error instanceof z.ZodError) {
    return res.status(400).json({ 
      message: "Validation error", 
      errors: error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
    });
  }
  
  const apiError = error as ApiError;
  const statusCode = apiError.statusCode || 500;
  const message = apiError.message || "Internal server error";
  
  res.status(statusCode).json({ message });
};

// Enhanced auth middleware with proper typing
interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    role: string;
  };
}

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  // Demo mode: always authenticate with demo user
  (req as any).user = {
    id: 1,
    email: 'demo@example.com',
    name: 'Demo User',
    role: 'user',
    isAdmin: false
  };
  next();
};

// Validation middleware factory
const validateBody = <T>(schema: z.ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      handleApiError(error, res);
    }
  };
};

// Optimized roadblocks routes with proper error handling and type safety
const setupRoadblocksRoutes = (app: Express): void => {
  app.get("/api/roadblocks", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const roadblocks = await storage.getRoadblocks(req.user.id, req.user.role === "admin");
      res.json(roadblocks);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  app.post("/api/roadblocks", 
    requireAuth, 
    validateBody(insertRoadblockSchema.extend({
      isRescueMode: z.boolean().optional(),
      linkedTaskId: z.number().optional(),
    })),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { isRescueMode, linkedTaskId, ...roadblockData } = req.body;
        
        const roadblock = await storage.createRoadblock({
          ...roadblockData,
          createdBy: req.user.id,
        });

        // Enhanced rescue mode workflow
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

          // Mark original subtask as resolved
          if (linkedTaskId) {
            await storage.updateSubtask(linkedTaskId, {
              status: "resolved",
              completedDate: new Date(),
            });
          }

          return res.status(201).json({ roadblock, rescueSubtask });
        }

        res.status(201).json(roadblock);
      } catch (error) {
        handleApiError(error, res);
      }
    }
  );

  app.put("/api/roadblocks/:id", 
    requireAuth, 
    validateBody(insertRoadblockSchema.partial()),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const roadblockId = parseInt(req.params.id);
        if (isNaN(roadblockId)) {
          return res.status(400).json({ message: "Invalid roadblock ID" });
        }

        const roadblock = await storage.updateRoadblock(roadblockId, req.body);
        res.json(roadblock);
      } catch (error) {
        handleApiError(error, res);
      }
    }
  );

  app.delete("/api/roadblocks/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const roadblockId = parseInt(req.params.id);
      if (isNaN(roadblockId)) {
        return res.status(400).json({ message: "Invalid roadblock ID" });
      }

      await storage.deleteRoadblock(roadblockId);
      res.json({ success: true });
    } catch (error) {
      handleApiError(error, res);
    }
  });
};

// Optimized subtasks routes
const setupSubtasksRoutes = (app: Express): void => {
  app.get("/api/subtasks", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const allSubtasks = await storage.getSubtasks(req.user.id);
      // Filter for user-assigned tasks with enhanced performance
      const userEmail = req.user.email;
      const assignedSubtasks = allSubtasks.filter(subtask => 
        subtask.participants?.includes(userEmail)
      );
      res.json(assignedSubtasks);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  app.post("/api/subtasks", 
    requireAuth, 
    validateBody(insertSubtaskSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const subtask = await storage.createSubtask({
          ...req.body,
          createdBy: req.user.id,
        });
        res.status(201).json(subtask);
      } catch (error) {
        handleApiError(error, res);
      }
    }
  );

  app.put("/api/subtasks/:id", 
    requireAuth, 
    validateBody(insertSubtaskSchema.partial()),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const subtaskId = parseInt(req.params.id);
        if (isNaN(subtaskId)) {
          return res.status(400).json({ message: "Invalid subtask ID" });
        }

        const subtask = await storage.updateSubtask(subtaskId, req.body);
        res.json(subtask);
      } catch (error) {
        handleApiError(error, res);
      }
    }
  );
};

// Enhanced stats route with caching potential
const setupStatsRoutes = (app: Express): void => {
  app.get("/api/stats", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await storage.getDashboardStats(req.user.id);
      
      // Add cache headers for performance
      res.set({
        'Cache-Control': 'private, max-age=30', // 30 seconds cache
        'ETag': `"stats-${req.user.id}-${Date.now()}"`,
      });
      
      res.json(stats);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Debug endpoint to see overdue items
  app.get("/api/debug/overdue", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { activities, subtasks } = require("@shared/schema");
      const { db } = require("./db");
      const { and, sql, ne, eq } = require("drizzle-orm");
      
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      // Get overdue activities
      const overdueActivities = await db.select().from(activities).where(
        and(
          sql`${activities.dueDate} IS NOT NULL`,
          sql`DATE(${activities.dueDate}) < DATE('now')`,
          ne(activities.status, 'completed'),
          !isAdmin ? eq(activities.createdBy, userId) : undefined
        )
      );

      // Get overdue subtasks
      const overdueSubtasks = await db.select().from(subtasks).where(
        and(
          sql`${subtasks.dueDate} IS NOT NULL`,
          sql`DATE(${subtasks.dueDate}) < DATE('now')`,
          sql`${subtasks.completedDate} IS NULL`,
          ne(subtasks.status, 'completed'),
          ne(subtasks.status, 'resolved'),
          !isAdmin ? eq(subtasks.createdBy, userId) : undefined
        )
      );

      res.json({
        overdueActivities: overdueActivities.map((a: any) => ({
          id: a.id,
          title: a.title,
          dueDate: a.dueDate,
          status: a.status
        })),
        overdueSubtasks: overdueSubtasks.map((s: any) => ({
          id: s.id,
          title: s.title,
          dueDate: s.dueDate,
          status: s.status,
          linkedActivityId: s.linkedActivityId
        })),
        totalOverdue: overdueActivities.length + overdueSubtasks.length
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });
};

// Activities routes
const setupActivitiesRoutes = (app: Express): void => {
  app.get("/api/activities", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const activities = await storage.getActivities(req.user.id, req.user.role === "admin");
      res.json(activities);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  app.post("/api/activities", 
    requireAuth, 
    validateBody(insertActivitySchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const activity = await storage.createActivity({
          ...req.body,
          createdBy: req.user.id,
        });
        res.status(201).json(activity);
      } catch (error) {
        handleApiError(error, res);
      }
    }
  );
};

// Contacts routes
const setupContactsRoutes = (app: Express): void => {
  app.get("/api/contacts", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const contacts = await storage.getContacts(req.user.id, req.user.role === "admin");
      res.json(contacts);
    } catch (error) {
      handleApiError(error, res);
    }
  });
};

// Quick wins routes
const setupQuickWinsRoutes = (app: Express): void => {
  app.get("/api/quickwins", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const quickWins = await storage.getQuickWins(req.user.id, req.user.role === "admin");
      res.json(quickWins);
    } catch (error) {
      handleApiError(error, res);
    }
  });
};

// User routes
const setupUserRoutes = (app: Express): void => {
  app.get("/api/user/preferences", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const preferences = await storage.getUserPreferences(req.user.id);
      res.json(preferences || {});
    } catch (error) {
      handleApiError(error, res);
    }
  });

  app.put("/api/user/preferences", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const preferences = await storage.updateUserPreferences(req.user.id, req.body);
      res.json(preferences);
    } catch (error) {
      handleApiError(error, res);
    }
  });
};

// Deep focus routes
const setupDeepFocusRoutes = (app: Express): void => {
  app.get("/api/deep-focus/active", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const activeSession = await storage.getActiveDeepFocusSession(req.user.id);
      res.json(activeSession);
    } catch (error) {
      handleApiError(error, res);
    }
  });
};

// Flow routes
const setupFlowRoutes = (app: Express): void => {
  app.get("/api/flow/current-strategy", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const strategy = await storage.getCurrentFlowStrategy(req.user.id);
      res.json(strategy);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  app.get("/api/flow/recommendations", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Return empty recommendations for now
      res.json([]);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  app.get("/api/flow/personality-presets", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const presets = await storage.getFlowPersonalityPresets();
      res.json(presets);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  app.post("/api/flow/apply-strategy", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { preset } = req.body;
      const success = await storage.applyFlowStrategy(req.user.id, preset);
      res.json({ success });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Additional endpoints that are being called by the frontend
  app.get("/api/priority-matrix", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const matrix = await storage.getPriorityMatrix(req.user.id);
      res.json(matrix);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  app.get("/api/scheduler/status", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = await storage.getSchedulerStatus();
      res.json(status);
    } catch (error) {
      handleApiError(error, res);
    }
  });
};

// Daily routes
const setupDailyRoutes = (app: Express): void => {
  app.get("/api/daily-reflections", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Return empty reflections for now
      res.json(null);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  app.get("/api/daily-task-completions", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const completions = await storage.getDailyTaskCompletions(req.user.id);
      res.json(completions || []);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  app.post("/api/daily-task-completions", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const completion = await storage.createDailyTaskCompletion({
        ...req.body,
        userId: req.user.id,
      });
      res.status(201).json(completion);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({ user: req.user });
    } catch (error) {
      handleApiError(error, res);
    }
  });
};

// Main route registration function
export function registerOptimizedRoutes(app: Express): Server {
  // Setup enhanced error handling
  app.use((err: ApiError, req: Request, res: Response, next: NextFunction) => {
    handleApiError(err, res);
  });

  // Register all route groups
  setupRoadblocksRoutes(app);
  setupSubtasksRoutes(app);
  setupStatsRoutes(app);
  setupActivitiesRoutes(app);
  setupContactsRoutes(app);
  setupQuickWinsRoutes(app);
  setupUserRoutes(app);
  setupDeepFocusRoutes(app);
  setupFlowRoutes(app);
  setupDailyRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}

// Export types for use in other files
export type { AuthenticatedRequest, ApiError };