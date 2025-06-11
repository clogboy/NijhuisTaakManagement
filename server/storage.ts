import { 
  users, contacts, activities, activityLogs, taskComments, quickWins, roadblocks, subtasks, weeklyEthos, dailyAgendas, timeBlocks, userPreferences, moodEntries, moodReminders, dailyTaskCompletions,
  teamsBoards, teamsCards, bimcollabProjects, bimcollabIssues, integrationSettings,
  type User, type InsertUser, type Contact, type InsertContact, type Activity, type InsertActivity, type ActivityLog, type InsertActivityLog, type TaskComment, type InsertTaskComment, type QuickWin, type InsertQuickWin, type Roadblock, type InsertRoadblock, type Subtask, type InsertSubtask, type WeeklyEthos, type InsertWeeklyEthos, type DailyAgenda, type InsertDailyAgenda, type TimeBlock, type InsertTimeBlock, type UserPreferences, type InsertUserPreferences, type MoodEntry, type InsertMoodEntry, type MoodReminder, type InsertMoodReminder,
  type TeamsBoard, type InsertTeamsBoard, type TeamsCard, type InsertTeamsCard,
  type BimcollabProject, type InsertBimcollabProject, type BimcollabIssue, type InsertBimcollabIssue,
  type IntegrationSettings, type InsertIntegrationSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc, sql, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByMicrosoftId(microsoftId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

  // Contacts
  getContacts(createdBy: number): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  getContactByEmail(email: string): Promise<Contact | undefined>;
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

  // Subtasks (replacement for Quick Wins and Roadblocks)
  getSubtasks(userId: number): Promise<Subtask[]>;
  getSubtasksByActivity(activityId: number): Promise<Subtask[]>;
  getSubtasksByParticipant(participantEmail: string): Promise<Subtask[]>;
  getSubtask(id: number): Promise<Subtask | undefined>;
  createSubtask(subtask: InsertSubtask & { createdBy: number }): Promise<Subtask>;
  updateSubtask(id: number, subtask: Partial<InsertSubtask>): Promise<Subtask>;
  deleteSubtask(id: number): Promise<void>;
  updateSubtaskParticipantType(subtaskId: number, participantEmail: string, taskType: string): Promise<Subtask>;

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

  // Daily Task Completions
  getDailyTaskCompletions(userId: number, date?: string): Promise<any[]>;
  createOrUpdateDailyTaskCompletion(userId: number, activityId: number, taskDate: string, completed: boolean): Promise<any>;

  // Mood Tracking
  getMoodEntries(userId: number, limit?: number): Promise<MoodEntry[]>;
  getLatestMoodEntry(userId: number): Promise<MoodEntry | undefined>;
  createMoodEntry(entry: InsertMoodEntry & { userId: number }): Promise<MoodEntry>;
  getMoodReminders(userId: number): Promise<MoodReminder[]>;
  createMoodReminder(reminder: InsertMoodReminder & { userId: number }): Promise<MoodReminder>;
  updateMoodReminder(id: number, reminder: Partial<InsertMoodReminder>): Promise<MoodReminder>;
  deleteMoodReminder(id: number): Promise<void>;
  getMoodBasedTaskSuggestions(userId: number, currentMood: string, energy: number, focus: number): Promise<Activity[]>;

  // Workspace Invitations
  getWorkspaceInvitations(inviterId: number): Promise<WorkspaceInvitation[]>;
  getWorkspaceInvitationByToken(token: string): Promise<WorkspaceInvitation | undefined>;
  createWorkspaceInvitation(invitation: InsertWorkspaceInvitation & { inviterId: number }): Promise<WorkspaceInvitation>;
  updateWorkspaceInvitation(id: number, invitation: Partial<InsertWorkspaceInvitation>): Promise<WorkspaceInvitation>;
  deleteWorkspaceInvitation(id: number): Promise<void>;

  // Workspace Access
  getWorkspaceAccess(ownerId: number): Promise<WorkspaceAccess[]>;
  getGuestAccess(guestId: number): Promise<WorkspaceAccess[]>;
  createWorkspaceAccess(access: InsertWorkspaceAccess): Promise<WorkspaceAccess>;
  updateWorkspaceAccess(id: number, access: Partial<InsertWorkspaceAccess>): Promise<WorkspaceAccess>;
  deleteWorkspaceAccess(id: number): Promise<void>;
  hasWorkspaceAccess(guestId: number, ownerId: number): Promise<boolean>;
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
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
    console.log(`[STORAGE] Getting contacts for user ${createdBy}`);
    const result = await db.select().from(contacts).where(eq(contacts.created_by, createdBy)).orderBy(contacts.name);
    console.log(`[STORAGE] Found ${result.length} contacts`);
    return result;
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
    const contactData = {
      ...contact,
      created_by: contact.createdBy
    };
    delete contactData.createdBy;
    const [newContact] = await db.insert(contacts).values(contactData).returning();
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
    // Ensure the author is always included as a participant (using contact ID)
    const participants = activity.participants || [];
    if (!participants.includes(activity.createdBy)) {
      participants.unshift(activity.createdBy); // Add author at the beginning
    }

    const [newActivity] = await db.insert(activities).values({
      ...activity,
      participants,
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
        !isAdmin ? eq(activities.createdBy, userId) : undefined
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

  // Mood Tracking Methods
  async getMoodEntries(userId: number, limit: number = 30): Promise<MoodEntry[]> {
    return await db.select()
      .from(moodEntries)
      .where(eq(moodEntries.userId, userId))
      .orderBy(desc(moodEntries.createdAt))
      .limit(limit);
  }

  async getLatestMoodEntry(userId: number): Promise<MoodEntry | undefined> {
    const [entry] = await db.select()
      .from(moodEntries)
      .where(eq(moodEntries.userId, userId))
      .orderBy(desc(moodEntries.createdAt))
      .limit(1);
    return entry || undefined;
  }

  async createMoodEntry(entry: InsertMoodEntry & { userId: number }): Promise<MoodEntry> {
    const [newEntry] = await db.insert(moodEntries).values(entry).returning();
    return newEntry;
  }

  async getMoodReminders(userId: number): Promise<MoodReminder[]> {
    return await db.select()
      .from(moodReminders)
      .where(and(eq(moodReminders.userId, userId), eq(moodReminders.isActive, true)))
      .orderBy(moodReminders.createdAt);
  }

  async createMoodReminder(reminder: InsertMoodReminder & { userId: number }): Promise<MoodReminder> {
    const [newReminder] = await db.insert(moodReminders).values(reminder).returning();
    return newReminder;
  }

  async updateMoodReminder(id: number, reminderUpdate: Partial<InsertMoodReminder>): Promise<MoodReminder> {
    const [updatedReminder] = await db.update(moodReminders)
      .set(reminderUpdate)
      .where(eq(moodReminders.id, id))
      .returning();
    return updatedReminder;
  }

  async deleteMoodReminder(id: number): Promise<void> {
    await db.delete(moodReminders).where(eq(moodReminders.id, id));
  }

  async getMoodBasedTaskSuggestions(userId: number, currentMood: string, energy: number, focus: number): Promise<Activity[]> {
    // Determine task complexity and type based on mood and energy/focus levels
    let priorityFilter: string[] = [];
    let statusFilter: string[] = ['planned', 'in_progress'];

    if (energy >= 4 && focus >= 4) {
      // High energy and focus - suggest urgent/complex tasks
      priorityFilter = ['urgent', 'normal'];
    } else if (energy >= 3 || focus >= 3) {
      // Medium energy/focus - suggest normal priority tasks
      priorityFilter = ['normal'];
    } else {
      // Low energy/focus - suggest low priority, simple tasks
      priorityFilter = ['low', 'normal'];
    }

    // Mood-specific adjustments
    if (currentMood === 'stressed' || currentMood === 'overwhelmed') {
      // For stressed moods, prefer simpler, shorter tasks
      priorityFilter = ['low'];
    } else if (currentMood === 'creative') {
      // For creative moods, include all tasks but prioritize by type
      priorityFilter = ['urgent', 'normal', 'low'];
    }

    const baseQuery = db.select()
      .from(activities)
      .where(and(
        or(eq(activities.createdBy, userId)),
        inArray(activities.priority, priorityFilter),
        inArray(activities.status, statusFilter)
      ))
      .orderBy(
        // Prioritize by urgency first, then by estimated duration (shorter for low energy)
        sql`CASE 
          WHEN ${activities.priority} = 'urgent' THEN 1
          WHEN ${activities.priority} = 'normal' THEN 2
          ELSE 3
        END`,
        activities.estimatedDuration || sql`60`
      )
      .limit(10);

    return await baseQuery;
  }

  // Subtasks methods
  async getSubtasks(userId: number): Promise<Subtask[]> {
    // Get subtasks for activities the user created or is a participant in
    const userActivities = await this.getActivities(userId, false);
    const activityIds = userActivities.map(a => a.id);
    
    if (activityIds.length === 0) return [];
    
    return await db.select().from(subtasks)
      .where(inArray(subtasks.linkedActivityId, activityIds))
      .orderBy(desc(subtasks.createdAt));
  }

  async getSubtasksByActivity(activityId: number): Promise<Subtask[]> {
    return await db.select().from(subtasks)
      .where(eq(subtasks.linkedActivityId, activityId))
      .orderBy(desc(subtasks.createdAt));
  }

  async getSubtasksByParticipant(participantEmail: string): Promise<Subtask[]> {
    return await db.select().from(subtasks)
      .where(sql`${participantEmail} = ANY(${subtasks.participants})`)
      .orderBy(desc(subtasks.createdAt));
  }

  async getSubtask(id: number): Promise<Subtask | undefined> {
    const [subtask] = await db.select().from(subtasks).where(eq(subtasks.id, id));
    return subtask || undefined;
  }

  async createSubtask(subtask: InsertSubtask & { createdBy: number }): Promise<Subtask> {
    // Ensure the author is always included as a participant
    const authorUser = await this.getUser(subtask.createdBy);
    const authorEmail = authorUser?.email || '';
    
    const participants = subtask.participants || [];
    if (authorEmail && !participants.includes(authorEmail)) {
      participants.unshift(authorEmail); // Add author at the beginning
    }

    // Initialize participant types with default type for all participants
    const participantTypes = (subtask.participantTypes as Record<string, string>) || {};
    participants.forEach(email => {
      if (!participantTypes[email]) {
        participantTypes[email] = subtask.type; // Default to the subtask's main type
      }
    });

    const [newSubtask] = await db.insert(subtasks).values({
      ...subtask,
      participants,
      participantTypes
    }).returning();
    return newSubtask;
  }

  async updateSubtask(id: number, subtaskUpdate: Partial<InsertSubtask>): Promise<Subtask> {
    const [updatedSubtask] = await db.update(subtasks)
      .set({ ...subtaskUpdate, updatedAt: new Date() })
      .where(eq(subtasks.id, id))
      .returning();
    return updatedSubtask;
  }

  async deleteSubtask(id: number): Promise<void> {
    await db.delete(subtasks).where(eq(subtasks.id, id));
  }

  async updateSubtaskParticipantType(subtaskId: number, participantEmail: string, taskType: string): Promise<Subtask> {
    // Get current subtask
    const subtask = await this.getSubtask(subtaskId);
    if (!subtask) {
      throw new Error("Subtask not found");
    }

    // Update participant types
    const participantTypes = subtask.participantTypes as Record<string, string> || {};
    participantTypes[participantEmail] = taskType;

    const [updatedSubtask] = await db.update(subtasks)
      .set({ 
        participantTypes,
        updatedAt: new Date() 
      })
      .where(eq(subtasks.id, subtaskId))
      .returning();
    
    return updatedSubtask;
  }

  // Daily task completion methods
  async getDailyTaskCompletions(userId: number, date?: string): Promise<any[]> {
    if (date) {
      const results = await db.select().from(dailyTaskCompletions).where(
        and(
          eq(dailyTaskCompletions.userId, userId),
          eq(dailyTaskCompletions.taskDate, new Date(date))
        )
      );
      return results;
    } else {
      // Return all completions for the user if no date specified
      const results = await db.select().from(dailyTaskCompletions).where(
        eq(dailyTaskCompletions.userId, userId)
      );
      return results;
    }
  }

  async createOrUpdateDailyTaskCompletion(userId: number, activityId: number, taskDate: string, completed: boolean): Promise<any> {
    const existingCompletion = await db.select().from(dailyTaskCompletions).where(
      and(
        eq(dailyTaskCompletions.userId, userId),
        eq(dailyTaskCompletions.activityId, activityId),
        eq(dailyTaskCompletions.taskDate, new Date(taskDate))
      )
    );

    if (existingCompletion.length > 0) {
      // Update existing completion
      const [updated] = await db.update(dailyTaskCompletions)
        .set({ 
          completed, 
          completedAt: completed ? new Date() : null 
        })
        .where(eq(dailyTaskCompletions.id, existingCompletion[0].id))
        .returning();
      return updated;
    } else {
      // Create new completion
      const [created] = await db.insert(dailyTaskCompletions)
        .values({
          userId,
          activityId,
          taskDate: new Date(taskDate),
          completed,
          completedAt: completed ? new Date() : null
        })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
