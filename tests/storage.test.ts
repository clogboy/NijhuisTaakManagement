
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseStorage } from '../server/storage';
import { eq } from 'drizzle-orm';

// Mock the database
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  execute: vi.fn(),
};

const mockUsers = {
  microsoftId: 'microsoft_id',
  replitId: 'replit_id',
  email: 'email',
  id: 'id',
  tenantId: 'tenant_id',
};

const mockTenants = {
  id: 'id',
  slug: 'slug',
  domain: 'domain',
  isActive: 'is_active',
};

const mockContacts = {
  id: 'id',
  createdBy: 'created_by',
  name: 'name',
  email: 'email',
};

const mockActivities = {
  id: 'id',
  createdBy: 'created_by',
  createdAt: 'created_at',
  priority: 'priority',
  status: 'status',
  dueDate: 'due_date',
  updatedAt: 'updated_at',
};

// Mock database imports
vi.mock('../server/db', () => ({
  db: mockDb,
}));

vi.mock('../shared/simplified-schema', () => ({
  users: mockUsers,
  tenants: mockTenants,
  contacts: mockContacts,
  activities: mockActivities,
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
  ne: vi.fn(),
}));

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;
  
  beforeEach(() => {
    storage = new DatabaseStorage();
    vi.clearAllMocks();
    
    // Setup common mock chains
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockResolvedValue([]),
      }),
    });
    
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });
    
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
  });

  describe('User Operations', () => {
    it('should get user by Microsoft ID', async () => {
      const mockUser = {
        id: 1,
        email: 'test@nijhuis.nl',
        microsoftId: 'mock-ms-id',
        name: 'Test User',
      };
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });

      const result = await storage.getUserByMicrosoftId('mock-ms-id');
      
      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should get user by Replit ID', async () => {
      const mockUser = {
        id: 1,
        email: 'test@nijhuis.nl',
        replitId: 'mock-replit-id',
        name: 'Test User',
      };
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });

      const result = await storage.getUserByReplitId('mock-replit-id');
      
      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should handle user not found gracefully', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await storage.getUserByMicrosoftId('non-existent');
      
      expect(result).toBeUndefined();
    });

    it('should create a new user', async () => {
      const newUser = {
        email: 'new@nijhuis.nl',
        name: 'New User',
        tenantId: 1,
        role: 'user',
      };
      
      const createdUser = { id: 1, ...newUser };
      
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdUser]),
        }),
      });

      const result = await storage.createUser(newUser);
      
      expect(result).toEqual(createdUser);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('Tenant Operations', () => {
    it('should get tenant by domain', async () => {
      const mockTenant = {
        id: 1,
        name: 'Nijhuis',
        slug: 'nijhuis',
        domain: 'nijhuis.nl',
        isActive: true,
      };
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockTenant]),
        }),
      });

      const result = await storage.getTenantByDomain('nijhuis.nl');
      
      expect(result).toEqual(mockTenant);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should create a new tenant', async () => {
      const newTenant = {
        name: 'Test Tenant',
        slug: 'test-tenant',
        domain: 'test.com',
      };
      
      const createdTenant = { id: 1, ...newTenant, isActive: true };
      
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdTenant]),
        }),
      });

      const result = await storage.createTenant(newTenant);
      
      expect(result).toEqual(createdTenant);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in getUserByMicrosoftId', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const result = await storage.getUserByMicrosoftId('test-id');
      
      expect(result).toBeUndefined();
      expect(consoleError).toHaveBeenCalled();
      
      consoleError.mockRestore();
    });

    it('should handle database errors in getUserByReplitId', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const result = await storage.getUserByReplitId('test-id');
      
      expect(result).toBeUndefined();
      expect(consoleError).toHaveBeenCalled();
      
      consoleError.mockRestore();
    });
  });
});
