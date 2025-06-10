import { users, contacts, activities, activityLogs, taskComments, quickWins, roadblocks, weeklyEthos, dailyAgendas, timeBlocks, userPreferences, type User, type InsertUser, type Contact, type InsertContact, type Activity, type InsertActivity, type ActivityLog, type InsertActivityLog, type TaskComment, type InsertTaskComment, type QuickWin, type InsertQuickWin, type Roadblock, type InsertRoadblock, type WeeklyEthos, type InsertWeeklyEthos, type DailyAgenda, type InsertDailyAgenda, type TimeBlock, type InsertTimeBlock, type UserPreferences, type InsertUserPreferences } from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc, sql, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByMicrosoftId(microsoftId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

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

  // Task Comments
  getTaskComments(activityId: number): Promise<TaskComment[]>;
  createTaskComment(comment: InsertTaskComment & { createdBy: number }): Promise<TaskComment>;

  // Quick Wins (linked to activities)
  getQuickWins(userId: number): Promise<QuickWin[]>;
  getQuickWinsByActivity(activityId: number): Promise<QuickWin[]>;
  createQuickWin(quickWin: InsertQuickWin & { createdBy: number }): Promise<QuickWin>;
  deleteQuickWin(id: number): Promise<void>;

  // Roadblocks (linked to activities)
  getRoadblocks(userId: number, isAdmin: boolean): Promise<Roadblock[]>;
  getRoadblocksByActivity(activityId: number): Promise<Roadblock[]>;
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

  // Time Blocks
  getTimeBlocks(userId: number, startDate?: Date, endDate?: Date): Promise<TimeBlock[]>;
  getTimeBlock(id: number): Promise<TimeBlock | undefined>;
  createTimeBlock(timeBlock: InsertTimeBlock & { createdBy: number }): Promise<TimeBlock>;
  updateTimeBlock(id: number, timeBlock: Partial<InsertTimeBlock>): Promise<TimeBlock>;
  deleteTimeBlock(id: number): Promise<void>;
  getTimeBlocksForActivity(activityId: number): Promise<TimeBlock[]>;

  // User Preferences
  getUserPreferences(userId: number): Promise<any | undefined>;
  createUserPreferences(preferences: any & { createdBy: number }): Promise<any>;
  updateUserPreferences(userId: number, preferences: any): Promise<any>;
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

  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users)
      .set(userUpdate)
      .where(eq(users.id, id))
      .returning();
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
        .where(eq(activities.createdBy, userId))
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

  async getTaskComments(activityId: number): Promise<TaskComment[]> {
    return await db.select()
      .from(taskComments)
      .where(eq(taskComments.activityId, activityId))
      .orderBy(taskComments.createdAt);
  }

  async createTaskComment(comment: InsertTaskComment & { createdBy: number }): Promise<TaskComment> {
    const [newComment] = await db.insert(taskComments)
      .values(comment)
      .returning();
    return newComment;
  }

  async getQuickWins(userId: number): Promise<QuickWin[]> {
    return await db.select().from(quickWins)
      .where(eq(quickWins.createdBy, userId))
      .orderBy(desc(quickWins.createdAt));
  }

  async getQuickWinsByActivity(activityId: number): Promise<QuickWin[]> {
    return await db.select().from(quickWins)
      .where(eq(quickWins.linkedActivityId, activityId))
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

  async getRoadblocksByActivity(activityId: number): Promise<Roadblock[]> {
    return await db.select().from(roadblocks)
      .where(eq(roadblocks.linkedActivityId, activityId))
      .orderBy(desc(roadblocks.reportedDate));
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

    // Get urgent count
    const urgentActivities = await db.select().from(activities).where(
      and(
        eq(activities.priority, 'urgent'),
        !isAdmin ? eq(activities.createdBy, userId) : undefined
      )
    );

    // Get due this week count
    const dueThisWeekActivities = await db.select().from(activities).where(
      and(
        sql`${activities.dueDate} <= ${weekFromNow}`,
        sql`${activities.dueDate} >= ${now}`,
        !isAdmin ? eq(activities.createdBy, userId) : undefined
      )
    );

    // Get completed count
    const completedActivities = await db.select().from(activities).where(
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

  // Weekly Ethos methods
  async getWeeklyEthos(userId: number): Promise<WeeklyEthos[]> {
    return await db.select().from(weeklyEthos).where(eq(weeklyEthos.createdBy, userId));
  }

  async getWeeklyEthosByDay(userId: number, dayOfWeek: number): Promise<WeeklyEthos | undefined> {
    const [ethos] = await db.select().from(weeklyEthos)
      .where(and(eq(weeklyEthos.createdBy, userId), eq(weeklyEthos.dayOfWeek, dayOfWeek)));
    return ethos || undefined;
  }

  async createWeeklyEthos(ethos: InsertWeeklyEthos & { createdBy: number }): Promise<WeeklyEthos> {
    const [newEthos] = await db.insert(weeklyEthos).values(ethos).returning();
    return newEthos;
  }

  async updateWeeklyEthos(id: number, ethosUpdate: Partial<InsertWeeklyEthos>): Promise<WeeklyEthos> {
    const [updatedEthos] = await db.update(weeklyEthos)
      .set({ ...ethosUpdate, updatedAt: new Date() })
      .where(eq(weeklyEthos.id, id))
      .returning();
    return updatedEthos;
  }

  async deleteWeeklyEthos(id: number): Promise<void> {
    await db.delete(weeklyEthos).where(eq(weeklyEthos.id, id));
  }

  // Daily Agenda methods
  async getDailyAgendas(userId: number, startDate?: Date, endDate?: Date): Promise<DailyAgenda[]> {
    if (startDate && endDate) {
      return await db.select().from(dailyAgendas).where(and(
        eq(dailyAgendas.createdBy, userId),
        sql`${dailyAgendas.date} >= ${startDate}`,
        sql`${dailyAgendas.date} <= ${endDate}`
      )).orderBy(desc(dailyAgendas.date));
    }
    
    return await db.select().from(dailyAgendas)
      .where(eq(dailyAgendas.createdBy, userId))
      .orderBy(desc(dailyAgendas.date));
  }

  async getDailyAgenda(userId: number, date: Date): Promise<DailyAgenda | undefined> {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const [agenda] = await db.select().from(dailyAgendas)
      .where(and(
        eq(dailyAgendas.createdBy, userId),
        sql`DATE(${dailyAgendas.date}) = DATE(${dateOnly})`
      ));
    return agenda || undefined;
  }

  async createDailyAgenda(agenda: InsertDailyAgenda & { createdBy: number }): Promise<DailyAgenda> {
    const [newAgenda] = await db.insert(dailyAgendas).values(agenda).returning();
    return newAgenda;
  }

  async updateDailyAgenda(id: number, agendaUpdate: Partial<InsertDailyAgenda>): Promise<DailyAgenda> {
    const [updatedAgenda] = await db.update(dailyAgendas)
      .set({ ...agendaUpdate, updatedAt: new Date() })
      .where(eq(dailyAgendas.id, id))
      .returning();
    return updatedAgenda;
  }

  async deleteDailyAgenda(id: number): Promise<void> {
    await db.delete(dailyAgendas).where(eq(dailyAgendas.id, id));
  }

  // Time Blocks implementation
  async getTimeBlocks(userId: number, startDate?: Date, endDate?: Date): Promise<TimeBlock[]> {
    if (startDate && endDate) {
      const blocks = await db.select().from(timeBlocks).where(and(
        eq(timeBlocks.createdBy, userId),
        sql`${timeBlocks.startTime} >= ${startDate}`,
        sql`${timeBlocks.endTime} <= ${endDate}`
      ));
      return blocks.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }
    
    return await db.select().from(timeBlocks)
      .where(eq(timeBlocks.createdBy, userId))
      .orderBy(timeBlocks.startTime);
  }

  async getTimeBlock(id: number): Promise<TimeBlock | undefined> {
    const [timeBlock] = await db.select().from(timeBlocks).where(eq(timeBlocks.id, id));
    return timeBlock || undefined;
  }

  async createTimeBlock(timeBlock: InsertTimeBlock & { createdBy: number }): Promise<TimeBlock> {
    const [newTimeBlock] = await db.insert(timeBlocks).values(timeBlock).returning();
    return newTimeBlock;
  }

  async updateTimeBlock(id: number, timeBlockUpdate: Partial<InsertTimeBlock>): Promise<TimeBlock> {
    const [updatedTimeBlock] = await db.update(timeBlocks)
      .set({ ...timeBlockUpdate, updatedAt: new Date() })
      .where(eq(timeBlocks.id, id))
      .returning();
    return updatedTimeBlock;
  }

  async deleteTimeBlock(id: number): Promise<void> {
    await db.delete(timeBlocks).where(eq(timeBlocks.id, id));
  }

  async getTimeBlocksForActivity(activityId: number): Promise<TimeBlock[]> {
    return await db.select().from(timeBlocks)
      .where(eq(timeBlocks.activityId, activityId))
      .orderBy(timeBlocks.startTime);
  }

  // User Preferences methods
  async getUserPreferences(userId: number): Promise<any | undefined> {
    const [userPrefs] = await db.select().from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return userPrefs?.preferences || undefined;
  }

  async createUserPreferences(preferences: any & { createdBy: number }): Promise<any> {
    const { createdBy, ...prefsData } = preferences;
    const [newPrefs] = await db.insert(userPreferences)
      .values({
        userId: createdBy,
        preferences: prefsData
      })
      .returning();
    return newPrefs.preferences;
  }

  async updateUserPreferences(userId: number, preferencesUpdate: any): Promise<any> {
    // Get existing preferences first
    const existing = await this.getUserPreferences(userId);
    const mergedPrefs = { ...existing, ...preferencesUpdate };
    
    if (existing) {
      // Update existing record
      const [updatedPrefs] = await db.update(userPreferences)
        .set({ 
          preferences: mergedPrefs,
          updatedAt: new Date() 
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updatedPrefs.preferences;
    } else {
      // Create new record if none exists
      return await this.createUserPreferences({ 
        ...mergedPrefs, 
        createdBy: userId 
      });
    }
  }
}

export const storage = new DatabaseStorage();
