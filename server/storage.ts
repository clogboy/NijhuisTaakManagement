import { users, contacts, activities, activityLogs, quickWins, roadblocks, weeklyEthos, dailyAgendas, type User, type InsertUser, type Contact, type InsertContact, type Activity, type InsertActivity, type ActivityLog, type InsertActivityLog, type QuickWin, type InsertQuickWin, type Roadblock, type InsertRoadblock, type WeeklyEthos, type InsertWeeklyEthos, type DailyAgenda, type InsertDailyAgenda } from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc, sql, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByMicrosoftId(microsoftId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Contacts
  getContacts(createdBy: number): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact & { createdBy: number }): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;

  // Activities
  getActivities(userId: number, isAdmin: boolean): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity & { createdBy: number }): Promise<Activity>;
  updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity>;
  deleteActivity(id: number): Promise<void>;

  // Activity Logs
  getActivityLogs(activityId: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog & { createdBy: number }): Promise<ActivityLog>;

  // Quick Wins
  getQuickWins(userId: number): Promise<QuickWin[]>;
  createQuickWin(quickWin: InsertQuickWin & { createdBy: number }): Promise<QuickWin>;
  deleteQuickWin(id: number): Promise<void>;

  // Roadblocks
  getRoadblocks(userId: number, isAdmin: boolean): Promise<Roadblock[]>;
  getRoadblock(id: number): Promise<Roadblock | undefined>;
  createRoadblock(roadblock: InsertRoadblock & { createdBy: number }): Promise<Roadblock>;
  updateRoadblock(id: number, roadblock: Partial<InsertRoadblock>): Promise<Roadblock>;
  deleteRoadblock(id: number): Promise<void>;

  // Stats
  getActivityStats(userId: number, isAdmin: boolean): Promise<{
    urgentCount: number;
    dueThisWeek: number;
    completedCount: number;
    activeContacts: number;
  }>;

  // Weekly Ethos
  getWeeklyEthos(userId: number): Promise<WeeklyEthos[]>;
  getWeeklyEthosByDay(userId: number, dayOfWeek: number): Promise<WeeklyEthos | undefined>;
  createWeeklyEthos(ethos: InsertWeeklyEthos & { createdBy: number }): Promise<WeeklyEthos>;
  updateWeeklyEthos(id: number, ethos: Partial<InsertWeeklyEthos>): Promise<WeeklyEthos>;
  deleteWeeklyEthos(id: number): Promise<void>;

  // Daily Agendas
  getDailyAgendas(userId: number, startDate?: Date, endDate?: Date): Promise<DailyAgenda[]>;
  getDailyAgenda(userId: number, date: Date): Promise<DailyAgenda | undefined>;
  createDailyAgenda(agenda: InsertDailyAgenda & { createdBy: number }): Promise<DailyAgenda>;
  updateDailyAgenda(id: number, agenda: Partial<InsertDailyAgenda>): Promise<DailyAgenda>;
  deleteDailyAgenda(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByMicrosoftId(microsoftId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.microsoftId, microsoftId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getContacts(createdBy: number): Promise<Contact[]> {
    return await db.select().from(contacts).where(eq(contacts.createdBy, createdBy)).orderBy(contacts.name);
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
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

  async getActivities(userId: number, isAdmin: boolean): Promise<Activity[]> {
    if (isAdmin) {
      return await db.select().from(activities).orderBy(desc(activities.createdAt));
    } else {
      return await db.select().from(activities)
        .where(or(
          eq(activities.createdBy, userId),
          sql`${userId} = ANY(${activities.assignedUsers})`
        ))
        .orderBy(desc(activities.createdAt));
    }
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async createActivity(activity: InsertActivity & { createdBy: number }): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values({
      ...activity,
      updatedAt: new Date(),
    }).returning();
    return newActivity;
  }

  async updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity> {
    const [updatedActivity] = await db.update(activities)
      .set({ ...activity, updatedAt: new Date() })
      .where(eq(activities.id, id))
      .returning();
    return updatedActivity;
  }

  async deleteActivity(id: number): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  async getActivityLogs(activityId: number): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs)
      .where(eq(activityLogs.activityId, activityId))
      .orderBy(desc(activityLogs.entryDate));
  }

  async createActivityLog(log: InsertActivityLog & { createdBy: number }): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  async getQuickWins(userId: number): Promise<QuickWin[]> {
    return await db.select().from(quickWins)
      .where(eq(quickWins.createdBy, userId))
      .orderBy(desc(quickWins.createdAt));
  }

  async createQuickWin(quickWin: InsertQuickWin & { createdBy: number }): Promise<QuickWin> {
    const [newQuickWin] = await db.insert(quickWins).values(quickWin).returning();
    return newQuickWin;
  }

  async deleteQuickWin(id: number): Promise<void> {
    await db.delete(quickWins).where(eq(quickWins.id, id));
  }

  async getRoadblocks(userId: number, isAdmin: boolean): Promise<Roadblock[]> {
    if (isAdmin) {
      return await db.select().from(roadblocks).orderBy(desc(roadblocks.reportedDate));
    } else {
      return await db.select().from(roadblocks)
        .where(eq(roadblocks.createdBy, userId))
        .orderBy(desc(roadblocks.reportedDate));
    }
  }

  async getRoadblock(id: number): Promise<Roadblock | undefined> {
    const [roadblock] = await db.select().from(roadblocks).where(eq(roadblocks.id, id));
    return roadblock || undefined;
  }

  async createRoadblock(roadblock: InsertRoadblock & { createdBy: number }): Promise<Roadblock> {
    const [newRoadblock] = await db.insert(roadblocks).values({
      ...roadblock,
      updatedAt: new Date(),
    }).returning();
    return newRoadblock;
  }

  async updateRoadblock(id: number, roadblock: Partial<InsertRoadblock>): Promise<Roadblock> {
    const [updatedRoadblock] = await db.update(roadblocks)
      .set({ ...roadblock, updatedAt: new Date() })
      .where(eq(roadblocks.id, id))
      .returning();
    return updatedRoadblock;
  }

  async deleteRoadblock(id: number): Promise<void> {
    await db.delete(roadblocks).where(eq(roadblocks.id, id));
  }

  async getActivityStats(userId: number, isAdmin: boolean): Promise<{
    urgentCount: number;
    dueThisWeek: number;
    completedCount: number;
    activeContacts: number;
  }> {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let baseQuery = db.select().from(activities);
    
    if (!isAdmin) {
      baseQuery = baseQuery.where(or(
        eq(activities.createdBy, userId),
        sql`${userId} = ANY(${activities.assignedUsers})`
      ));
    }

    // Get urgent count
    const urgentActivities = await baseQuery.where(
      and(
        eq(activities.priority, 'urgent'),
        !isAdmin ? or(
          eq(activities.createdBy, userId),
          sql`${userId} = ANY(${activities.assignedUsers})`
        ) : undefined
      )
    );

    // Get due this week count
    const dueThisWeekActivities = await baseQuery.where(
      and(
        sql`${activities.dueDate} <= ${weekFromNow}`,
        sql`${activities.dueDate} >= ${now}`,
        !isAdmin ? or(
          eq(activities.createdBy, userId),
          sql`${userId} = ANY(${activities.assignedUsers})`
        ) : undefined
      )
    );

    // Get completed count
    const completedActivities = await baseQuery.where(
      and(
        eq(activities.status, 'completed'),
        !isAdmin ? or(
          eq(activities.createdBy, userId),
          sql`${userId} = ANY(${activities.assignedUsers})`
        ) : undefined
      )
    );

    // Get active contacts count
    const activeContacts = await db.select().from(contacts).where(eq(contacts.createdBy, userId));

    return {
      urgentCount: urgentActivities.length,
      dueThisWeek: dueThisWeekActivities.length,
      completedCount: completedActivities.length,
      activeContacts: activeContacts.length,
    };
  }
}

export const storage = new DatabaseStorage();
