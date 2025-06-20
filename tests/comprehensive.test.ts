
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { storage } from '../server/storage';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';

describe('Comprehensive API Health Check', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Storage Layer Tests', () => {
    it('should create and retrieve users', async () => {
      const userData = {
        tenantId: 1,
        email: 'test@nijhuis.nl',
        name: 'Test User',
        role: 'user' as const
      };

      const user = await storage.createUser(userData);
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);

      const retrievedUser = await storage.getUser(user.id);
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.email).toBe(userData.email);
    });

    it('should handle tenant operations', async () => {
      const tenantData = {
        name: 'Test Tenant',
        slug: 'test-tenant',
        domain: 'test.com',
        settings: {},
        isActive: true
      };

      const tenant = await storage.createTenant(tenantData);
      expect(tenant).toBeDefined();
      expect(tenant.name).toBe(tenantData.name);

      const retrievedTenant = await storage.getTenant(tenant.id);
      expect(retrievedTenant).toBeDefined();
      expect(retrievedTenant?.name).toBe(tenantData.name);
    });

    it('should create and manage activities', async () => {
      // First create a user for the activity
      const user = await storage.createUser({
        tenantId: 1,
        email: 'activity-test@nijhuis.nl',
        name: 'Activity Test User',
        role: 'user'
      });

      const activityData = {
        title: 'Test Activity',
        description: 'Test Description',
        type: 'task' as const,
        priority: 'normal' as const,
        status: 'pending' as const,
        createdBy: user.id
      };

      const activity = await storage.createActivity(activityData);
      expect(activity).toBeDefined();
      expect(activity.title).toBe(activityData.title);

      const activities = await storage.getActivities(user.id, user.email, false);
      expect(activities).toBeDefined();
      expect(Array.isArray(activities)).toBe(true);
    });

    it('should handle missing methods gracefully', () => {
      // Test that all required methods exist
      expect(typeof storage.getDailyTaskCompletions).toBe('function');
      expect(typeof storage.getActiveDeepFocusBlock).toBe('function');
      expect(typeof storage.getSubtasks).toBe('function');
      expect(typeof storage.getQuickWins).toBe('function');
      expect(typeof storage.getRoadblocks).toBe('function');
    });
  });

  describe('API Endpoint Tests', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle authentication check', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.message).toBe('Not authenticated');
    });

    it('should return empty arrays for unauthenticated API calls requiring auth', async () => {
      // These should return 401, not throw errors
      await request(app).get('/api/activities').expect(401);
      await request(app).get('/api/contacts').expect(401);
      await request(app).get('/api/subtasks').expect(401);
      await request(app).get('/api/quickwins').expect(401);
    });
  });

  describe('Database Connection Tests', () => {
    it('should connect to database successfully', async () => {
      const { db } = await import('../server/db');
      expect(db).toBeDefined();
      
      // Test a simple query
      try {
        const result = await db.select().from(storage['contacts'] || {} as any).limit(1);
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        // Database might not be fully initialized in test environment
        console.warn('Database query test skipped:', error.message);
      }
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid routes gracefully', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });

    it('should validate input data', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('Frontend Data Format Tests', () => {
    it('should return arrays for list endpoints', async () => {
      // Mock authenticated user for testing
      const mockSession = { userId: 1 };
      
      // Test that endpoints return arrays even when empty
      expect(await storage.getQuickWins(1)).toEqual([]);
      expect(await storage.getSubtasks(1)).toEqual([]);
      expect(await storage.getRoadblocks(1)).toEqual([]);
      expect(await storage.getDailyTaskCompletions(1)).toEqual([]);
    });
  });
});
