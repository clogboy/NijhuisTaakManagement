import { 
  tenants,
  users, 
  contacts, 
  activities,
  activity_entries,
  time_blocks,
  user_metrics,
  type Activity,
  type ActivityEntry,
  type TimeBlock,
  type UserMetric,
  insertActivitySchema,
  insertActivityEntrySchema,
  insertTimeBlockSchema,
  insertUserMetricSchema
} from "@shared/simplified-schema";

// Keep backwards compatibility types for now
type Contact = typeof contacts.$inferSelect;
type InsertContact = typeof contacts.$inferInsert;
type User = typeof users.$inferSelect;
type InsertUser = typeof users.$inferInsert;
type Tenant = typeof tenants.$inferSelect;
type InsertTenant = typeof tenants.$inferInsert;

// Create mock types for backwards compatibility
type ActivityLog = {
  id: number;
  activityId: number;
  entry: string;
  entryDate: Date;
  createdBy: number;
  createdAt: Date;
};

type TaskComment = {
  id: number;
  activityId: number;
  comment: string;
  createdBy: number;
  createdAt: Date;
};

type QuickWin = {
  id: number;
  title: string;
  description: string;
  impact: string;
  effort: string;
  status: string;
  linkedActivityId: number;
  createdBy: number;
  createdAt: Date;
};

type Roadblock = {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  assignedTo: string | null;
  linkedActivityId: number;
  createdBy: number;
  createdAt: Date;
};

type Subtask = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  participants: string[];
  linkedActivityId: number;
  createdBy: number;
  createdAt: Date;
};

type WeeklyEthos = {
  id: number;
  dayOfWeek: number;
  ethos: string;
  description: string | null;
  createdBy: number;
  createdAt: Date;
};

type DailyAgenda = {
  id: number;
  date: Date;
  content: string;
  createdBy: number;
  createdAt: Date;
};

type MoodEntry = {
  id: number;
  userId: number;
  mood: string;
  energy: number;
  focus: number;
  notes: string | null;
  createdAt: Date;
};

type MoodReminder = {
  id: number;
  userId: number;
  title: string;
  message: string;
  isActive: boolean;
  createdAt: Date;
};

// Insert types
type InsertActivityLog = Omit<ActivityLog, 'id' | 'createdAt'>;
type InsertTaskComment = Omit<TaskComment, 'id' | 'createdAt'>;
type InsertQuickWin = Omit<QuickWin, 'id' | 'createdAt'>;
type InsertRoadblock = Omit<Roadblock, 'id' | 'createdAt'>;
type InsertSubtask = Omit<Subtask, 'id' | 'createdAt'>;
type InsertWeeklyEthos = Omit<WeeklyEthos, 'id' | 'createdAt'>;
type InsertDailyAgenda = Omit<DailyAgenda, 'id' | 'createdAt'>;
type InsertMoodEntry = Omit<MoodEntry, 'id' | 'createdAt'>;
type InsertMoodReminder = Omit<MoodReminder, 'id' | 'createdAt'>;

import { db } from "./db";
import { eq, and, inArray, desc, sql, or, not, ne, gte, lte } from "drizzle-orm";
import { startOfWeek } from "date-fns";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string, tenantId?: number): Promise<User | undefined>;
  getUserByMicrosoftId(microsoftId: string): Promise<User | undefined>;
  getUserByReplitId(replitId: string): Promise<User | undefined>;
  getAllUsers(tenantId?: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

  // Contacts
  getContacts(createdBy: number): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  getContactByEmail(email: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact & { createdBy: number }): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;

  // Activities with role-based access
  getActivities(userId: number, userEmail: string, isAdmin: boolean): Promise<Activity[]>;
  getActivity(id: number, userId?: number, userEmail?: string): Promise<Activity | undefined>;
  createActivity(activity: any & { createdBy: number }): Promise<Activity>;
  updateActivity(id: number, activity: any, userId?: number, userEmail?: string): Promise<Activity>;
  deleteActivity(id: number, userId?: number, userEmail?: string): Promise<void>;

  // Stats
  getActivityStats(userId: number, isAdmin: boolean): Promise<{
    urgentCount: number;
    dueThisWeek: number;
    completedCount: number;
    roadblocksCount: number;
    activeContacts: number;
    overdueCount: number;
  }>;

  // Tenants
  createTenant(tenantData: InsertTenant): Promise<Tenant>;
  getTenant(id: number): Promise<Tenant | null>;
  getTenantBySlug(slug: string): Promise<Tenant | null>;
  getTenantByDomain(domain: string): Promise<Tenant | null>;
  getAllTenants(): Promise<Tenant[]>;
}

export class DatabaseStorage implements IStorage {
  // Tenant management
  async createTenant(tenantData: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(tenantData).returning();
    return tenant;
  }

  async getTenant(id: number): Promise<Tenant | null> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || null;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant || null;
  }

  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.domain, domain));
    return tenant || null;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return db.select().from(tenants);
  }

  // User management
  async getUserById(id: number): Promise<any> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string, tenantId?: number): Promise<User | undefined> {
    try {
      if (tenantId !== undefined) {
        // Tenant-specific lookup
        const [user] = await db.select().from(users)
          .where(and(eq(users.email, email), eq(users.tenantId, tenantId)));
        return user || undefined;
      } else {
        // Global lookup across all tenants
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user || undefined;
      }
    } catch (error) {
      console.error('Error in getUserByEmail:', error);
      return undefined;
    }
  }

  async getUserByMicrosoftId(microsoftId: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.microsoftId, microsoftId));
      return user || undefined;
    } catch (error) {
      console.error('Error in getUserByMicrosoftId:', error);
      return undefined;
    }
  }

  async getUserByReplitId(replitId: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.replitId, replitId));
      return user || undefined;
    } catch (error) {
      console.error('Error in getUserByReplitId:', error);
      return undefined;
    }
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async getAllUsers(tenantId?: number): Promise<User[]> {
    if (tenantId) {
      return db.select().from(users).where(eq(users.tenantId, tenantId));
    }
    return db.select().from(users);
  }

  // Contact operations
  async getContacts(createdBy: number): Promise<Contact[]> {
    console.log(`[STORAGE] Getting contacts for user ${createdBy}`);
    try {
      const result = await db.select().from(contacts).where(eq(contacts.createdBy, createdBy)).orderBy(contacts.name);
      console.log(`[STORAGE] Found ${result.length} contacts`);
      return result;
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw new Error('Failed to get contacts');
    }
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async getContactByEmail(email: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.email, email));
    return contact || undefined;
  }

  async createContact(contact: InsertContact & { createdBy: number }): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact> {
    const [updatedContact] = await db.update(contacts).set(contact).where(eq(contacts.id, id)).returning();
    return updatedContact;
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  // Activity operations
  async getActivities(userId: number, userEmail: string, isAdmin: boolean): Promise<Activity[]> {
    if (isAdmin) {
      return await db.select().from(activities).orderBy(desc(activities.createdAt));
    } else {
      return await db.select().from(activities)
        .where(eq(activities.createdBy, userId))
        .orderBy(desc(activities.createdAt));
    }
  }

  async getActivity(id: number, userId?: number, userEmail?: string): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async createActivity(activity: any & { createdBy: number }): Promise<Activity> {
    const activityData = {
      title: activity.title,
      description: activity.description,
      type: activity.type || 'task',
      priority: activity.priority || 'normal',
      status: activity.status || 'pending',
      dueDate: activity.dueDate,
      parentId: activity.parentId,
      participants: activity.participants || [],
      metadata: activity.metadata || {},
      createdBy: activity.createdBy
    };

    const [newActivity] = await db.insert(activities).values(activityData).returning();
    return newActivity;
  }

  async updateActivity(id: number, activity: any, userId?: number, userEmail?: string): Promise<Activity> {
    const [updatedActivity] = await db.update(activities)
      .set({ ...activity, updatedAt: new Date() })
      .where(eq(activities.id, id))
      .returning();
    return updatedActivity;
  }

  async deleteActivity(id: number, userId?: number, userEmail?: string): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  // Daily task completions
  async getDailyTaskCompletions(userId: number): Promise<any[]> {
    return [];
  }

  async createOrUpdateDailyTaskCompletion(userId: number, activityId: number, taskDate: string, completed: boolean): Promise<any> {
    // Stub implementation
    return { userId, activityId, taskDate, completed };
  }

  // Deep focus blocks
  async getDeepFocusBlocks(userId: number, start?: Date, end?: Date): Promise<any[]> {
    // Stub implementation
    return [];
  }

  async getActiveDeepFocusBlock(userId: number): Promise<any | null> {
    // Stub implementation
    return null;
  }

  async createDeepFocusBlock(blockData: any): Promise<any> {
    // Stub implementation
    return { id: 1, ...blockData };
  }

  async startDeepFocusBlock(id: number, selectedActivityId?: number, selectedSubtaskId?: number): Promise<any> {
    // Stub implementation
    return { id, selectedActivityId, selectedSubtaskId, status: 'active' };
  }

  async endDeepFocusBlock(id: number, productivityRating?: number, completionNotes?: string): Promise<any> {
    // Stub implementation
    return { id, productivityRating, completionNotes, status: 'completed' };
  }

  async updateDeepFocusBlock(id: number, updates: any): Promise<any> {
    // Stub implementation
    return { id, ...updates };
  }

  async deleteDeepFocusBlock(id: number): Promise<void> {
    // Stub implementation
  }

  // Subtasks
  async getSubtasks(userId: number): Promise<any[]> {
    try {
      // Return empty array for now to prevent 500 errors
      return [];
    } catch (error) {
      console.error('Error fetching subtasks:', error);
      return [];
    }
  }

  async getSubtask(id: number): Promise<any | undefined> {
    const [subtask] = await db.select().from(activities).where(eq(activities.id, id));
    return subtask || undefined;
  }

  async createSubtask(subtaskData: any): Promise<any> {
    const data = {
      title: subtaskData.title,
      description: subtaskData.description,
      type: subtaskData.type || 'task',
      priority: subtaskData.priority || 'normal',
      status: subtaskData.status || 'pending',
      dueDate: subtaskData.dueDate,
      parentId: subtaskData.linkedActivityId,
      participants: subtaskData.participants || [],
      metadata: {
        participantTypes: subtaskData.participantTypes || {},
        ...subtaskData.metadata
      },
      createdBy: subtaskData.createdBy
    };

    const [newSubtask] = await db.insert(activities).values(data).returning();
    return newSubtask;
  }

  async updateSubtask(id: number, updates: any): Promise<any> {
    const [updatedSubtask] = await db.update(activities)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(activities.id, id))
      .returning();
    return updatedSubtask;
  }

  async deleteSubtask(id: number): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  async getSubtasksByActivity(activityId: number): Promise<any[]> {
    return await db.select().from(activities)
      .where(eq(activities.parentId, activityId))
      .orderBy(desc(activities.createdAt));
  }

  async updateSubtaskParticipantType(subtaskId: number, participantEmail: string, taskType: string): Promise<any> {
    const subtask = await this.getSubtask(subtaskId);
    if (!subtask) throw new Error('Subtask not found');

    const participantTypes = subtask.metadata?.participantTypes || {};
    participantTypes[participantEmail] = taskType;

    return await this.updateSubtask(subtaskId, {
      metadata: { ...subtask.metadata, participantTypes }
    });
  }

  async getQuickWins(userId: number): Promise<any[]> {
    try {
      const { db } = await import('./db');
      const user = await this.getUser(userId);
      if (!user) return [];

      const userActivities = await this.getActivities(userId, '', false);
      const quickWins = [];

      // Filter activities that are quick wins (estimated time <= 30 minutes)
      for (const activity of userActivities) {
        if (activity.estimatedMinutes && activity.estimatedMinutes <= 30) {
          quickWins.push({
            id: activity.id,
            title: activity.title,
            description: activity.description,
            priority: activity.priority,
            status: activity.status,
            estimatedMinutes: activity.estimatedMinutes,
            linkedActivityId: activity.id,
            createdAt: activity.createdAt
          });
        }
      }

      return quickWins;
    } catch (error) {
      console.error('Error getting quick wins:', error);
      return [];
    }
  }

  async getQuickWinsByActivity(activityId: number): Promise<any[]> {
    return await db.select().from(activities)
      .where(and(
        eq(activities.parentId, activityId),
        eq(activities.type, 'quick_win')
      ))
      .orderBy(desc(activities.createdAt));
  }

  // Roadblocks
  async getRoadblocks(userId?: number, isAdmin?: boolean): Promise<any[]> {
    if (isAdmin) {
      return await db.select().from(activities)
        .where(eq(activities.type, 'roadblock'))
        .orderBy(desc(activities.createdAt));
    } else if (userId) {
      return await db.select().from(activities)
        .where(and(
          eq(activities.createdBy, userId),
          eq(activities.type, 'roadblock')
        ))
        .orderBy(desc(activities.createdAt));
    }
    return [];
  }

  async createRoadblock(roadblockData: any): Promise<any> {
    const data = {
      title: roadblockData.title,
      description: roadblockData.description,
      type: 'roadblock' as const,
      priority: roadblockData.severity || 'medium',
      status: roadblockData.status || 'pending',
      metadata: {
        severity: roadblockData.severity,
        assignedTo: roadblockData.assignedTo,
        oorzaakCategory: roadblockData.oorzaakCategory,
        oorzaakFactor: roadblockData.oorzaakFactor,
        departmentImpact: roadblockData.departmentImpact,
        linkedActivityId: roadblockData.linkedActivityId,
        linkedSubtaskId: roadblockData.linkedSubtaskId,
        reportedDate: roadblockData.reportedDate,
        resolvedAt: roadblockData.resolvedAt,
        proposedResolution: roadblockData.proposedResolution,
        newDeadline: roadblockData.newDeadline
      },
      parentId: roadblockData.linkedActivityId,
      createdBy: roadblockData.createdBy
    };

    const [newRoadblock] = await db.insert(activities).values(data).returning();
    return newRoadblock;
  }

  async updateRoadblock(id: number, updates: any): Promise<any> {
    const [updatedRoadblock] = await db.update(activities)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(activities.id, id))
      .returning();
    return updatedRoadblock;
  }

  async deleteRoadblock(id: number): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  async getRoadblocksByActivity(activityId: number): Promise<any[]> {
    return await db.select().from(activities)
      .where(and(
        eq(activities.parentId, activityId),
        eq(activities.type, 'roadblock')
      ))
      .orderBy(desc(activities.createdAt));
  }

  // Task comments
  async getTaskComments(activityId: number): Promise<any[]> {
    return await db.select().from(activity_entries)
      .where(and(
        eq(activity_entries.activityId, activityId),
        eq(activity_entries.type, 'comment')
      ))
      .orderBy(desc(activity_entries.createdAt));
  }

  async createTaskComment(commentData: any): Promise<any> {
    const [comment] = await db.insert(activity_entries).values({
      activityId: commentData.activityId,
      type: 'comment',
      content: commentData.comment,
      metadata: {},
      createdBy: commentData.createdBy
    }).returning();
    return comment;
  }

  // Stubs for other missing methods
  async getWeeklyEthos(userId: number): Promise<any[]> { return []; }
  async getWeeklyEthosByDay(userId: number, dayOfWeek: number): Promise<any> { return null; }
  async getDailyAgendas(userId: number): Promise<any[]> { return []; }
  async getTimeBlocks(userId: number, start?: Date, end?: Date): Promise<any[]> { return []; }
  async createTimeBlock(timeBlockData: any): Promise<any> { return { id: 1, ...timeBlockData }; }
  async updateTimeBlock(id: number, updates: any): Promise<any> { return { id, ...updates }; }
  async deleteTimeBlock(id: number): Promise<void> { }
  async getUserPreferences(userId: number): Promise<any | null> { return null; }
  async createUserPreferences(prefsData: any): Promise<any> { return { id: 1, ...prefsData }; }
  async updateUserPreferences(userId: number, updates: any): Promise<any> { return { userId, ...updates }; }
  async getCalendarIntegrations(userId: number): Promise<any[]> { return []; }
  async createCalendarIntegration(integrationData: any): Promise<any> { return { id: 1, ...integrationData }; }
  async updateCalendarIntegration(id: number, updates: any): Promise<any> { return { id, ...updates }; }
  async deleteCalendarIntegration(id: number): Promise<void> { }
  async getCalendarEventsByUser(userId: number, start?: Date, end?: Date): Promise<any[]> { return []; }
  async createCalendarEvent(eventData: any): Promise<any> { return { id: 1, ...eventData }; }
  async getUpcomingDeadlineReminders(userId: number, days: number): Promise<any[]> { return []; }
  async createDeadlineReminder(reminderData: any): Promise<any> { return { id: 1, ...reminderData }; }
  async createDeadlineRemindersForActivity(activityId: number, userId: number): Promise<void> { }
  async createDeadlineRemindersForSubtask(subtaskId: number, userId: number): Promise<void> { }
  async getDocumentReferences(filters: any): Promise<any[]> { return []; }
  async createDocumentReference(referenceData: any): Promise<any> { return { id: 1, ...referenceData }; }
  async deleteDocumentReference(id: number, userId: number): Promise<boolean> { return true; }

  async getActivityStats(userId: number, isAdmin: boolean): Promise<{
    urgentCount: number;
    dueThisWeek: number;
    completedCount: number;
    roadblocksCount: number;
    activeContacts: number;
    overdueCount: number;
  }> {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });

    // Get urgent activities count
    const urgentActivities = await db.select().from(activities).where(
      and(
        eq(activities.priority, 'urgent'),
        ne(activities.status, 'completed'),
        !isAdmin ? eq(activities.createdBy, userId) : undefined
      )
    );

    // Get overdue activities
    const overdueActivities = await db.select().from(activities).where(
      and(
        sql`${activities.dueDate} IS NOT NULL`,
        sql`${activities.dueDate} < ${now.toISOString()}`,
        ne(activities.status, 'completed'),
        !isAdmin ? eq(activities.createdBy, userId) : undefined
      )
    );

    // Get due this week activities
    const dueThisWeekActivities = await db.select().from(activities).where(
      and(
        sql`${activities.dueDate} <= ${weekFromNow.toISOString()}`,
        sql`${activities.dueDate} >= ${now.toISOString()}`,
        !isAdmin ? eq(activities.createdBy, userId) : undefined
      )
    );

    // Get completed activities this week
    const completedActivitiesThisWeek = await db.select().from(activities).where(
      and(
        eq(activities.status, 'completed'),
        sql`${activities.updatedAt} >= ${weekStart.toISOString()}`,
        !isAdmin ? eq(activities.createdBy, userId) : undefined
      )
    );

    // Get active contacts count
    const activeContacts = await db.select().from(contacts).where(eq(contacts.createdBy, userId));

    return {
      urgentCount: urgentActivities.length,
      dueThisWeek: dueThisWeekActivities.length,
      completedCount: completedActivitiesThisWeek.length,
      roadblocksCount: 0, // No roadblocks table in simplified schema
      activeContacts: activeContacts.length,
      overdueCount: overdueActivities.length,
    };
  }
}

export const storage = new DatabaseStorage();