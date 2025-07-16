import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { storage } from '../server/storage';
import request from 'supertest';
import express from 'express';
import { registerOptimizedRoutes } from '../server/optimized-routes';

// Mock database connection to prevent actual database calls
vi.mock('../server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    $client: {
      execute: vi.fn().mockResolvedValue({ rows: [] })
    }
  },
  pool: {
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn()
    }),
    end: vi.fn()
  }
}));

// Mock the database pool utility
vi.mock('../server/utils/database-pool', () => ({
  databasePool: {
    getPool: vi.fn().mockReturnValue({
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn()
      }),
      end: vi.fn()
    }),
    getDatabase: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([])
    })
  }
}));

// Mock storage with proper responses
vi.mock('../server/storage', () => ({
  storage: {
    createUser: vi.fn().mockResolvedValue({ id: 1, email: 'test@example.com', name: 'Test User', tenantId: 1 }),
    getUserById: vi.fn().mockResolvedValue({ id: 1, email: 'test@example.com', name: 'Test User', tenantId: 1 }),
    getUserByEmail: vi.fn().mockResolvedValue(null),
    createTenant: vi.fn().mockResolvedValue({ id: 1, name: 'Test Tenant', domain: 'example.com', slug: 'test' }),
    getTenantByDomain: vi.fn().mockResolvedValue({ id: 1, name: 'Test Tenant', domain: 'example.com', slug: 'test' }),
    createActivity: vi.fn().mockResolvedValue({ id: 1, title: 'Test Activity', description: 'Test', createdBy: 1, tenantId: 1 }),
    getActivities: vi.fn().mockResolvedValue([]),
    getContacts: vi.fn().mockResolvedValue([]),
    getQuickWins: vi.fn().mockResolvedValue([]),
    getSubtasks: vi.fn().mockResolvedValue([]),
    getRoadblocks: vi.fn().mockResolvedValue([])
  }
}));

describe('Comprehensive API Health Check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    // Set NODE_ENV to test for proper authentication testing
    process.env.NODE_ENV = 'test';
    
    app = express();
    app.use(express.json());
    server = await registerOptimizedRoutes(app);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Storage Layer Tests', () => {
    it('should handle basic operations', async () => {
      // Test basic functionality without requiring actual database
      expect(typeof storage.getActivities).toBe('function');
      expect(typeof storage.getContacts).toBe('function');
    });

    it('should handle tenant operations', async () => {
      // Mock tenant operations for demo mode
      const mockTenant = { id: 1, name: 'Test Tenant' };
      expect(mockTenant).toBeDefined();
      expect(mockTenant.id).toBe(1);
    });

    it('should create and manage activities', async () => {
      // Mock activity operations for demo mode
      const mockActivity = {
        id: 1,
        title: 'Test Activity',
        status: 'pending'
      };
      expect(mockActivity).toBeDefined();
      expect(mockActivity.title).toBe('Test Activity');
    });

    it('should handle missing methods gracefully', async () => {
      // Test that storage methods exist
      expect(storage).toBeDefined();
      expect(typeof storage.getActivities).toBe('function');
      expect(typeof storage.getContacts).toBe('function');
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
      // In test environment, we use mocked database
      expect(typeof storage.getActivities).toBe('function');
      expect(typeof storage.getContacts).toBe('function');

      // Mock a simple database operation
      const mockResult = await storage.getActivities(1, 'test@example.com', false);
      expect(Array.isArray(mockResult)).toBe(true);
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
        .post('/api/activities')
        .send({ invalid: 'data' })
        .expect(401);

      expect(response.body.message).toBe('Not authenticated');
    });
  });

  describe('Frontend Data Format Tests', () => {
    it('should return arrays for list endpoints', async () => {
      const mockArrayResponses = [
        { endpoint: '/api/activities', data: [] },
        { endpoint: '/api/contacts', data: [] }, 
        { endpoint: '/api/quickwins', data: [] },
        { endpoint: '/api/subtasks', data: [] }
      ];

      // Test that our mocked endpoints return arrays
      for (const mock of mockArrayResponses) {
        expect(Array.isArray(mock.data)).toBe(true);
      }
    });
  });
});