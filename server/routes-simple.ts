import { createServer, type Server } from "http";
import express, { type Express, type Request, type Response } from "express";
import { WebSocketServer } from "ws";
import { storage } from "./storage";

// Add auth middleware
function requireAuth(req: Request, res: Response, next: any) {
  // For development, create a mock user if none exists
  if (!req.user && process.env.NODE_ENV === 'development') {
    req.user = {
      id: 1,
      email: 'user@example.com',
      name: 'Test User',
      role: 'user',
      isAdmin: false
    } as any;
  }
  
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket server with path to avoid conflicts with Vite HMR
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

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ status: "unhealthy", error: "Database connection failed" });
    }
  });

  // Auth routes
  app.get("/api/auth/me", requireAuth, (req: any, res) => {
    res.json(req.user);
  });

  // Basic activity routes
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

  // Basic contact routes
  app.get("/api/contacts", requireAuth, async (req: any, res) => {
    try {
      const contacts = await storage.getContacts(req.user.id);
      res.json(contacts);
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  // Basic subtask routes
  app.get("/api/subtasks", requireAuth, async (req: any, res) => {
    try {
      const subtasks = await storage.getSubtasks(req.user.id);
      res.json(subtasks);
    } catch (error) {
      console.error("Get subtasks error:", error);
      res.status(500).json({ message: "Failed to fetch subtasks" });
    }
  });

  // Basic roadblock routes
  app.get("/api/roadblocks", requireAuth, async (req: any, res) => {
    try {
      const roadblocks = await storage.getRoadblocks(req.user.id);
      res.json(roadblocks);
    } catch (error) {
      console.error("Get roadblocks error:", error);
      res.status(500).json({ message: "Failed to fetch roadblocks" });
    }
  });

  return httpServer;
}