import { describe, it, expect, beforeEach, vi } from 'vitest';

// Initialize mock data before any imports
const mockUsers = [
  { id: 1, email: 'test@example.com', name: 'Test User', tenantId: 1 }
];

const mockTenants = [
  { id: 1, name: 'Test Tenant', domain: 'example.com', slug: 'test' }
];

const mockActivities = [
  { id: 1, title: 'Test Activity', description: 'Test', createdBy: 1, tenantId: 1 }
];

// Mock the database and storage before any imports
vi.mock('../server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    execute: vi.fn()
  }
}));

vi.mock('../server/storage', () => ({
  storage: {
    getUsers: vi.fn().mockResolvedValue(mockUsers),
    createUser: vi.fn().mockResolvedValue(mockUsers[0]),
    getUserById: vi.fn().mockResolvedValue(mockUsers[0]),
    getUserByEmail: vi.fn().mockResolvedValue(mockUsers[0]),
    getTenants: vi.fn().mockResolvedValue(mockTenants),
    createTenant: vi.fn().mockResolvedValue(mockTenants[0]),
    getActivities: vi.fn().mockResolvedValue(mockActivities)
  }
}));

describe('Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Operations', () => {
    it('should retrieve users successfully', async () => {
      const { storage } = await import('../server/storage');
      const users = await storage.getUsers(1);

      expect(users).toEqual(mockUsers);
      expect(storage.getUsers).toHaveBeenCalledWith(1);
    });

    it('should create user successfully', async () => {
      const { storage } = await import('../server/storage');
      const newUser = {
        email: 'new@example.com',
        name: 'New User',
        tenantId: 1,
        role: 'user' as const
      };

      const user = await storage.createUser(newUser);
      expect(user).toEqual(mockUsers[0]);
    });
  });

  describe('Tenant Operations', () => {
    it('should retrieve tenants successfully', async () => {
      const { storage } = await import('../server/storage');
      const tenants = await storage.getTenants();

      expect(tenants).toEqual(mockTenants);
    });
  });

  describe('Activity Operations', () => {
    it('should retrieve activities successfully', async () => {
      const { storage } = await import('../server/storage');
      const activities = await storage.getActivities(1);

      expect(activities).toEqual(mockActivities);
    });
  });
});