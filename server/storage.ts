import { db } from "./db";
import { 
  users, activities, subtasks, quickWins, roadblocks, contacts, activityLogs,
  type User, type Activity, type Subtask, type QuickWin, type Roadblock, type Contact, type ActivityLog
} from "../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export class Storage {
  // User management
  async getUserById(id: number): Promise<User | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return user || null;
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  }

  async getUserByReplitId(replitId: string): Promise<User | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.replitId, replitId)).limit(1);
      return user || null;
    } catch (error) {
      console.error("Error fetching user by Replit ID:", error);
      return null;
    }
  }

  async createUser(userData: { email: string; name: string; replitId?: string }): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  // Activity management
  async getActivities(userId: number): Promise<Activity[]> {
    try {
      return await db.select()
        .from(activities)
        .where(eq(activities.createdBy, userId))
        .orderBy(desc(activities.createdAt));
    } catch (error) {
      console.error("Error fetching activities:", error);
      return [];
    }
  }

  async createActivity(activityData: any): Promise<Activity> {
    const [activity] = await db.insert(activities).values({
      ...activityData,
      createdBy: activityData.user_id,
    }).returning();
    return activity;
  }

  async updateActivity(id: number, updates: Partial<Activity>): Promise<Activity | null> {
    try {
      const [activity] = await db.update(activities)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(activities.id, id))
        .returning();
      return activity || null;
    } catch (error) {
      console.error("Error updating activity:", error);
      return null;
    }
  }

  async deleteActivity(id: number): Promise<boolean> {
    try {
      await db.delete(activities).where(eq(activities.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting activity:", error);
      return false;
    }
  }

  // Subtask management
  async getSubtasks(userId: number): Promise<Subtask[]> {
    try {
      return await db.select()
        .from(subtasks)
        .where(eq(subtasks.createdBy, userId))
        .orderBy(desc(subtasks.createdAt));
    } catch (error) {
      console.error("Error fetching subtasks:", error);
      return [];
    }
  }

  async createSubtask(subtaskData: any): Promise<Subtask> {
    const [subtask] = await db.insert(subtasks).values({
      ...subtaskData,
      createdBy: subtaskData.user_id,
    }).returning();
    return subtask;
  }

  async updateSubtask(id: number, updates: Partial<Subtask>): Promise<Subtask | null> {
    try {
      const [subtask] = await db.update(subtasks)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(subtasks.id, id))
        .returning();
      return subtask || null;
    } catch (error) {
      console.error("Error updating subtask:", error);
      return null;
    }
  }

  async deleteSubtask(id: number): Promise<boolean> {
    try {
      await db.delete(subtasks).where(eq(subtasks.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting subtask:", error);
      return false;
    }
  }

  // Quick wins management
  async getQuickWins(userId: number): Promise<QuickWin[]> {
    try {
      return await db.select()
        .from(quickWins)
        .where(eq(quickWins.createdBy, userId))
        .orderBy(desc(quickWins.createdAt));
    } catch (error) {
      console.error("Error fetching quick wins:", error);
      return [];
    }
  }

  async createQuickWin(quickWinData: any): Promise<QuickWin> {
    const [quickWin] = await db.insert(quickWins).values({
      ...quickWinData,
      createdBy: quickWinData.user_id,
    }).returning();
    return quickWin;
  }

  async updateQuickWin(id: number, updates: Partial<QuickWin>): Promise<QuickWin | null> {
    try {
      const [quickWin] = await db.update(quickWins)
        .set(updates)
        .where(eq(quickWins.id, id))
        .returning();
      return quickWin || null;
    } catch (error) {
      console.error("Error updating quick win:", error);
      return null;
    }
  }

  // Roadblock management
  async getRoadblocks(userId: number): Promise<Roadblock[]> {
    try {
      return await db.select()
        .from(roadblocks)
        .where(eq(roadblocks.createdBy, userId))
        .orderBy(desc(roadblocks.createdAt));
    } catch (error) {
      console.error("Error fetching roadblocks:", error);
      return [];
    }
  }

  async createRoadblock(roadblockData: any): Promise<Roadblock> {
    const [roadblock] = await db.insert(roadblocks).values({
      ...roadblockData,
      createdBy: roadblockData.user_id || roadblockData.createdBy,
      reportedDate: roadblockData.reportedDate || new Date(),
    }).returning();
    return roadblock;
  }

  async updateRoadblock(id: number, updates: Partial<Roadblock>): Promise<Roadblock | null> {
    try {
      const [roadblock] = await db.update(roadblocks)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(roadblocks.id, id))
        .returning();
      return roadblock || null;
    } catch (error) {
      console.error("Error updating roadblock:", error);
      return null;
    }
  }

  // Contact management
  async getContacts(userId: number): Promise<Contact[]> {
    try {
      return await db.select()
        .from(contacts)
        .where(eq(contacts.createdBy, userId))
        .orderBy(desc(contacts.createdAt));
    } catch (error) {
      console.error("Error fetching contacts:", error);
      return [];
    }
  }

  async createContact(contactData: any): Promise<Contact> {
    const [contact] = await db.insert(contacts).values({
      ...contactData,
      createdBy: contactData.user_id,
    }).returning();
    return contact;
  }

  // Activity logs
  async getActivityLogs(activityId: number): Promise<ActivityLog[]> {
    try {
      return await db.select()
        .from(activityLogs)
        .where(eq(activityLogs.activityId, activityId))
        .orderBy(desc(activityLogs.createdAt));
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      return [];
    }
  }

  async createActivityLog(logData: any): Promise<ActivityLog> {
    const [log] = await db.insert(activityLogs).values({
      ...logData,
      createdBy: logData.user_id,
      entryDate: logData.entryDate || new Date(),
    }).returning();
    return log;
  }

  // Basic stats for dashboard
  async getUserStats(userId: number): Promise<any> {
    try {
      const [activitiesCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(eq(activities.createdBy, userId));

      const [completedCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(and(
          eq(activities.createdBy, userId),
          eq(activities.status, 'completed')
        ));

      const [subtasksCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(subtasks)
        .where(eq(subtasks.createdBy, userId));

      const [roadblocksCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(roadblocks)
        .where(eq(roadblocks.createdBy, userId));

      return {
        totalActivities: activitiesCount.count || 0,
        completedActivities: completedCount.count || 0,
        totalSubtasks: subtasksCount.count || 0,
        totalRoadblocks: roadblocksCount.count || 0,
        productivityScore: Math.round(((completedCount.count || 0) / Math.max(activitiesCount.count || 1, 1)) * 100),
      };
    } catch (error) {
      console.error("Error fetching user stats:", error);
      return {
        totalActivities: 0,
        completedActivities: 0,
        totalSubtasks: 0,
        totalRoadblocks: 0,
        productivityScore: 0,
      };
    }
  }
}

export const storage = new Storage();