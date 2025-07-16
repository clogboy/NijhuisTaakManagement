import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { dailyScheduler } from "./scheduler";
import { errorReportingService } from "./error-reporting-service";
import { User } from "@shared/schema";

// Add global error handlers to prevent server restarts
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

// Graceful error handling for async operations
process.on('warning', (warning) => {
  console.warn('Process warning:', warning.name, warning.message);
});

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

// Body parser middleware - must come before routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Add user session middleware with error handling
app.use((req, res, next) => {
  try {
    if (req.session?.user) {
      req.user = req.session.user;
    }
  } catch (error) {
    console.error('Session middleware error:', error);
    // Don't fail the request, just continue without user
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const { registerOptimizedRoutes } = await import("./optimized-routes");
  const server = await registerOptimizedRoutes(app);

  // Comprehensive error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Express error handler caught:', err);

    // Ensure response is sent and don't re-throw to prevent unhandled rejections
    if (!res.headersSent) {
      res.status(status).json({ 
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    }
  });

  // Catch 404s for API routes
  app.use('/api/*', (req, res) => {
    console.log(`API route not found: ${req.method} ${req.path}`);
    if (!res.headersSent) {
      res.status(404).json({ 
        success: false, 
        message: `API endpoint not found: ${req.method} ${req.path}` 
      });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT environment variable for deployment flexibility
  // Default to 5000 for development, 8080 for production
  const port = parseInt(process.env.PORT || (process.env.NODE_ENV === "production" ? "8080" : "5000"));

  // Graceful shutdown handling
  const gracefulShutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Graceful shutdown starting...`);
    server.close((err) => {
      if (err) {
        console.error('Error during server shutdown:', err);
        process.exit(1);
      }
      console.log('Server closed successfully');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);

    // Start the daily scheduler
    dailyScheduler.start();
    log(`daily scheduler initialized - next sync at midnight`);
  });
})();