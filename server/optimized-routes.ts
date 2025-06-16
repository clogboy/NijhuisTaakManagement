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
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
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

  const httpServer = createServer(app);
  return httpServer;
}

// Export types for use in other files
export type { AuthenticatedRequest, ApiError };