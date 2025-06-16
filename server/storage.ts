import { 
  users, contacts, activities, activityLogs, taskComments, quickWins, roadblocks, subtasks, weeklyEthos, dailyAgendas, timeBlocks, userPreferences, moodEntries, moodReminders, dailyTaskCompletions,
  teamsBoards, teamsCards, bimcollabProjects, bimcollabIssues, integrationSettings, documentReferences, calendarIntegrations, calendarEvents, deadlineReminders,
  type User, type InsertUser, type UpsertUser, type Contact, type InsertContact, type Activity, type InsertActivity, type ActivityLog, type InsertActivityLog, type TaskComment, type InsertTaskComment, type QuickWin, type InsertQuickWin, type Roadblock, type InsertRoadblock, type Subtask, type InsertSubtask, type WeeklyEthos, type InsertWeeklyEthos, type DailyAgenda, type InsertDailyAgenda, type TimeBlock, type InsertTimeBlock, type UserPreferences, type InsertUserPreferences, type MoodEntry, type InsertMoodEntry, type MoodReminder, type InsertMoodReminder,
  type TeamsBoard, type InsertTeamsBoard, type TeamsCard, type InsertTeamsCard,
  type BimcollabProject, type InsertBimcollabProject, type BimcollabIssue, type InsertBimcollabIssue,
  type IntegrationSettings, type InsertIntegrationSettings, type DocumentReference, type InsertDocumentReference,
  type CalendarIntegration, type InsertCalendarIntegration, type CalendarEvent, type InsertCalendarEvent,
  type DeadlineReminder, type InsertDeadlineReminder
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc, sql, or, not, ne } from "drizzle-orm";
import { startOfWeek } from "date-fns";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByMicrosoftId(microsoftId: string): Promise<User | undefined>;
  getUserByReplitId(replitId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

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
  createActivity(activity: InsertActivity & { createdBy: number }): Promise<Activity>;
  updateActivity(id: number, activity: Partial<InsertActivity>, userId?: number, userEmail?: string): Promise<Activity>;
  deleteActivity(id: number, userId?: number, userEmail?: string): Promise<void>;
  canUserAccessActivity(activityId: number, userId: number, userEmail: string): Promise<{ canView: boolean; canEdit: boolean }>;
  transferActivityOwnership(activityId: number, newOwnerId: number, currentUserId: number): Promise<Activity>;

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
    roadblocksCount: number;
    activeContacts: number;
    overdueCount: number;
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

  // BimCollab Integration
  getBimcollabProjects(userId: number): Promise<BimcollabProject[]>;
  getBimcollabIssues(projectId: string): Promise<BimcollabIssue[]>;
  getBimcollabProjectByProjectId(projectId: string): Promise<BimcollabProject | undefined>;
  getBimcollabIssueByIssueId(issueId: string): Promise<BimcollabIssue | undefined>;
  createBimcollabProject(project: InsertBimcollabProject & { userId: number }): Promise<BimcollabProject>;
  createBimcollabIssue(issue: InsertBimcollabIssue): Promise<BimcollabIssue>;
  updateBimcollabProject(id: number, project: Partial<InsertBimcollabProject>): Promise<BimcollabProject>;
  updateBimcollabIssue(id: number, issue: Partial<InsertBimcollabIssue>): Promise<BimcollabIssue>;

  // Teams Integration
  getTeamsBoards(userId: number): Promise<TeamsBoard[]>;
  getTeamsCards(boardId: string): Promise<TeamsCard[]>;
  createTeamsBoard(board: InsertTeamsBoard & { userId: number }): Promise<TeamsBoard>;
  createTeamsCard(card: InsertTeamsCard): Promise<TeamsCard>;

  // Integration Settings
  getIntegrationSettings(userId: number): Promise<IntegrationSettings | undefined>;
  createIntegrationSettings(settings: InsertIntegrationSettings & { userId: number }): Promise<IntegrationSettings>;
  updateIntegrationSettings(userId: number, settings: Partial<InsertIntegrationSettings>): Promise<IntegrationSettings>;

  // Document References
  getDocumentReferences(filter: { activityId?: number; subtaskId?: number; quickWinId?: number; roadblockId?: number }): Promise<DocumentReference[]>;
  createDocumentReference(reference: InsertDocumentReference): Promise<DocumentReference>;
  deleteDocumentReference(id: number, userId: number): Promise<boolean>;
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

  async getUserByReplitId(replitId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.replitId, replitId));
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First try to find existing user by replit ID or email
    let existingUser;
    if (userData.replitId) {
      existingUser = await this.getUserByReplitId(userData.replitId);
    }
    if (!existingUser && userData.email) {
      existingUser = await this.getUserByEmail(userData.email);
    }

    if (existingUser) {
      // Update existing user
      const [user] = await db
        .update(users)
        .set({
          name: userData.name,
          email: userData.email,
          role: userData.role || existingUser.role,
          replitId: userData.replitId || existingUser.replitId,
          microsoftId: userData.microsoftId || existingUser.microsoftId,
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return user;
    } else {
      // Create new user
      const [user] = await db
        .insert(users)
        .values({
          email: userData.email,
          name: userData.name,
          role: userData.role || "user",
          replitId: userData.replitId,
          microsoftId: userData.microsoftId,
        })
        .returning();
      return user;
    }
  }

  async getContacts(createdBy: number): Promise<Contact[]> {
    console.log(`[STORAGE] Getting contacts for user ${createdBy} from Supabase`);
    const result = await db.select().from(contacts).where(eq(contacts.createdBy, createdBy)).orderBy(contacts.name);
    console.log(`[STORAGE] Found ${result.length} contacts in Supabase`);
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

  async getActivities(userId: number, userEmail: string, isAdmin: boolean): Promise<Activity[]> {
    if (isAdmin) {
      return await db.select().from(activities).orderBy(desc(activities.createdAt));
    } else {
      // User can see:
      // 1. Activities they created
      // 2. Activities where they are a participant (by email)
      // 3. Activities where they are a collaborator
      // 4. Public activities
      return await db.select().from(activities)
        .where(
          or(
            eq(activities.createdBy, userId),
            sql`${userEmail} = ANY(${activities.participants})`,
            sql`${userEmail} = ANY(${activities.collaborators})`,
            eq(activities.isPublic, true)
          )
        )
        .orderBy(desc(activities.createdAt));
    }
  }

  async getActivity(id: number, userId?: number, userEmail?: string): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    if (!activity) return undefined;
    
    // If user info provided, check access permissions
    if (userId && userEmail) {
      const access = await this.canUserAccessActivity(id, userId, userEmail);
      if (!access.canView) return undefined;
    }
    
    return activity;
  }

  async createActivity(activity: InsertActivity & { createdBy: number }): Promise<Activity> {
    // Get the creator's email for participant list
    const creator = await this.getUser(activity.createdBy);
    const participants = activity.participants || [];
    
    // Ensure the author's email is always included as a participant
    if (creator && !participants.includes(creator.email)) {
      participants.unshift(creator.email);
    }

    const [newActivity] = await db.insert(activities).values({
      ...activity,
      participants,
      updatedAt: new Date(),
    }).returning();
    return newActivity;
  }

  async updateActivity(id: number, activity: Partial<InsertActivity>, userId?: number, userEmail?: string): Promise<Activity> {
    // Check edit permissions if user info provided
    if (userId && userEmail) {
      const access = await this.canUserAccessActivity(id, userId, userEmail);
      if (!access.canEdit) {
        throw new Error("Insufficient permissions to edit this activity");
      }
    }
    
    const [updatedActivity] = await db.update(activities)
      .set({ ...activity, updatedAt: new Date() })
      .where(eq(activities.id, id))
      .returning();
    return updatedActivity;
  }

  async deleteActivity(id: number, userId?: number, userEmail?: string): Promise<void> {
    // Check delete permissions if user info provided
    if (userId && userEmail) {
      const access = await this.canUserAccessActivity(id, userId, userEmail);
      if (!access.canEdit) {
        throw new Error("Insufficient permissions to delete this activity");
      }
    }
    
    await db.delete(activities).where(eq(activities.id, id));
  }

  async canUserAccessActivity(activityId: number, userId: number, userEmail: string): Promise<{ canView: boolean; canEdit: boolean }> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, activityId));
    if (!activity) return { canView: false, canEdit: false };

    // Author has full access
    if (activity.createdBy === userId) {
      return { canView: true, canEdit: true };
    }

    // Check if user is a participant
    const isParticipant = activity.participants?.includes(userEmail) || false;
    
    // Check if user is a collaborator
    const isCollaborator = activity.collaborators?.includes(userEmail) || false;
    
    // Check if activity is public
    const isPublic = activity.isPublic;

    // Determine access levels
    const canView = isParticipant || isCollaborator || isPublic;
    const canEdit = activity.createdBy === userId; // Only authors can edit for now

    return { canView, canEdit };
  }

  async transferActivityOwnership(activityId: number, newOwnerId: number, currentUserId: number): Promise<Activity> {
    // Verify current user owns the activity
    const [activity] = await db.select().from(activities).where(eq(activities.id, activityId));
    if (!activity) {
      throw new Error("Activity not found");
    }
    
    if (activity.createdBy !== currentUserId) {
      throw new Error("Only the activity owner can transfer ownership");
    }

    // Verify new owner exists
    const [newOwner] = await db.select().from(users).where(eq(users.id, newOwnerId));
    if (!newOwner) {
      throw new Error("New owner not found");
    }

    // Transfer ownership of the main activity
    const [updatedActivity] = await db.update(activities)
      .set({ 
        createdBy: newOwnerId,
        updatedAt: new Date()
      })
      .where(eq(activities.id, activityId))
      .returning();

    // Only transfer ownership of subtasks created by the activity owner
    // Leave subtasks assigned to other team members unchanged
    await db.update(subtasks)
      .set({ 
        createdBy: newOwnerId,
        updatedAt: new Date()
      })
      .where(and(
        eq(subtasks.linkedActivityId, activityId),
        eq(subtasks.createdBy, currentUserId)
      ));

    // Create activity log for the transfer
    await this.createActivityLog({
      activityId,
      entry: `Activity ownership transferred from user ${currentUserId} to user ${newOwnerId}. Task assignments to project members preserved.`,
      entryDate: new Date(),
      createdBy: currentUserId
    });

    return updatedActivity;
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
    // Return recent subtasks marked as quick wins from the unified workflow
    const recentSubtasks = await db.select().from(subtasks)
      .where(and(
        eq(subtasks.createdBy, userId),
        eq(subtasks.type, 'quick_win')
      ))
      .orderBy(desc(subtasks.createdAt))
      .limit(10);

    // Convert to QuickWin format for compatibility
    return recentSubtasks.map((subtask: any) => ({
      id: subtask.id,
      title: subtask.title,
      description: subtask.description || '',
      impact: 'medium',
      effort: 'low',
      linkedActivityId: subtask.linkedActivityId,
      completedAt: subtask.completedDate,
      createdAt: subtask.createdAt,
      createdBy: subtask.createdBy,
      status: subtask.status
    }));
  }

  async getQuickWinsByActivity(activityId: number): Promise<QuickWin[]> {
    return await db.select().from(quickWins)
      .where(eq(quickWins.linkedActivityId, activityId))
      .orderBy(desc(quickWins.createdAt));
  }

  async createQuickWin(quickWin: InsertQuickWin & { createdBy: number }): Promise<QuickWin> {
    // Create as a subtask with type 'quick_win' in the unified workflow
    const subtaskData = {
      title: quickWin.title,
      description: quickWin.description,
      type: 'quick_win',
      status: 'active',
      priority: 'low',
      linkedActivityId: quickWin.linkedActivityId,
      createdBy: quickWin.createdBy,
    };
    
    const [newSubtask] = await db.insert(subtasks).values(subtaskData).returning();
    
    // Return in QuickWin format for compatibility
    return {
      id: newSubtask.id,
      title: newSubtask.title,
      description: newSubtask.description || '',
      impact: 'medium',
      effort: 'low',
      linkedActivityId: newSubtask.linkedActivityId,
      createdAt: newSubtask.createdAt,
      createdBy: newSubtask.createdBy,
      status: newSubtask.status
    };
  }

  async deleteQuickWin(id: number): Promise<void> {
    // Delete from subtasks table instead of deprecated quickWins table
    await db.delete(subtasks).where(eq(subtasks.id, id));
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
    roadblocksCount: number;
    activeContacts: number;
    overdueCount: number;
  }> {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Get urgent activities count
    const urgentActivities = await db.select().from(activities).where(
      and(
        eq(activities.priority, 'urgent'),
        !isAdmin ? eq(activities.createdBy, userId) : undefined
      )
    );

    // Get urgent subtasks count (includes priority and due date urgency)
    const urgentSubtasks = await db.select().from(subtasks).where(
      and(
        or(
          eq(subtasks.priority, 'urgent'),
          sql`${subtasks.dueDate} <= ${now.toISOString()}`
        ),
        sql`${subtasks.completedDate} IS NULL`,
        !isAdmin ? eq(subtasks.createdBy, userId) : undefined
      )
    );

    // Get overdue subtasks count - only truly overdue incomplete tasks
    const overdueSubtasks = await db.select().from(subtasks).where(
      and(
        sql`${subtasks.dueDate} IS NOT NULL`,
        sql`DATE(${subtasks.dueDate}) < DATE('now')`,
        sql`${subtasks.completedDate} IS NULL`,
        !isAdmin ? eq(subtasks.createdBy, userId) : undefined
      )
    );

    // Get due this week count (activities and subtasks)
    const dueThisWeekActivities = await db.select().from(activities).where(
      and(
        sql`${activities.dueDate} <= ${weekFromNow.toISOString()}`,
        sql`${activities.dueDate} >= ${now.toISOString()}`,
        !isAdmin ? eq(activities.createdBy, userId) : undefined
      )
    );

    const dueThisWeekSubtasks = await db.select().from(subtasks).where(
      and(
        sql`${subtasks.dueDate} <= ${weekFromNow.toISOString()}`,
        sql`${subtasks.dueDate} >= ${now.toISOString()}`,
        sql`${subtasks.completedDate} IS NULL`,
        !isAdmin ? eq(subtasks.createdBy, userId) : undefined
      )
    );

    // Get completed count for this week only (activities and subtasks)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    
    const completedActivitiesThisWeek = await db.select().from(activities).where(
      and(
        eq(activities.status, 'completed'),
        sql`${activities.updatedAt} >= ${weekStart.toISOString()}`,
        !isAdmin ? eq(activities.createdBy, userId) : undefined
      )
    );

    const completedSubtasksThisWeek = await db.select().from(subtasks).where(
      and(
        sql`${subtasks.completedDate} IS NOT NULL`,
        sql`${subtasks.completedDate} >= ${weekStart.toISOString()}`,
        !isAdmin ? eq(subtasks.createdBy, userId) : undefined
      )
    );

    // Get roadblocks count
    const roadblocksCount = await db.select().from(roadblocks).where(
      and(
        ne(roadblocks.status, 'resolved'),
        !isAdmin ? eq(roadblocks.createdBy, userId) : undefined
      )
    );

    // Get active contacts count
    const activeContacts = await db.select().from(contacts).where(eq(contacts.createdBy, userId));

    return {
      urgentCount: urgentActivities.length + urgentSubtasks.length,
      dueThisWeek: dueThisWeekActivities.length + dueThisWeekSubtasks.length,
      completedCount: completedActivitiesThisWeek.length + completedSubtasksThisWeek.length,
      roadblocksCount: roadblocksCount.length,
      activeContacts: activeContacts.length,
      overdueCount: overdueSubtasks.length,
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
      return blocks.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
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
    const user = await this.getUser(userId);
    if (!user) return [];
    
    const userActivities = await this.getActivities(userId, user.email, false);
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
    // Convert date strings to Date objects if needed
    const processedUpdate = { ...subtaskUpdate };
    if (processedUpdate.dueDate && typeof processedUpdate.dueDate === 'string') {
      processedUpdate.dueDate = new Date(processedUpdate.dueDate);
    }
    
    const [updatedSubtask] = await db.update(subtasks)
      .set({ ...processedUpdate, updatedAt: new Date() })
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
    // Verify the activity exists before creating completion
    const activity = await this.getActivity(activityId);
    
    if (!activity) {
      // Check if it's a subtask - if so, update the subtask status instead
      const subtask = await this.getSubtask(activityId);
      if (subtask) {
        // Update subtask completion status
        await this.updateSubtask(activityId, { 
          status: completed ? 'completed' : 'active',
          completedDate: completed ? new Date() : null 
        });
        
        // Return a mock completion object for consistency
        return {
          id: activityId,
          userId,
          activityId,
          taskDate: new Date(taskDate),
          completed,
          completedAt: completed ? new Date() : null
        };
      }
      
      console.warn(`Skipping task completion for non-existent activity/subtask: ${activityId}`);
      return null;
    }

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
      // Create new completion only for valid activities
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

  // BimCollab Integration methods
  async getBimcollabProjects(userId: number): Promise<BimcollabProject[]> {
    return await db.select().from(bimcollabProjects).where(eq(bimcollabProjects.createdBy, userId));
  }

  async getBimcollabProjectByProjectId(projectId: string): Promise<BimcollabProject | undefined> {
    const [project] = await db.select().from(bimcollabProjects).where(eq(bimcollabProjects.projectId, projectId));
    return project || undefined;
  }

  async getBimcollabIssues(projectId: string): Promise<BimcollabIssue[]> {
    // Find the project first to get the internal ID
    const [project] = await db.select().from(bimcollabProjects).where(eq(bimcollabProjects.projectId, projectId));
    if (!project) return [];
    
    return await db.select().from(bimcollabIssues).where(eq(bimcollabIssues.projectId, project.id));
  }

  async getBimcollabIssueByIssueId(issueId: string): Promise<BimcollabIssue | undefined> {
    const [issue] = await db.select().from(bimcollabIssues).where(eq(bimcollabIssues.issueId, issueId));
    return issue || undefined;
  }

  async createBimcollabProject(project: InsertBimcollabProject & { userId: number }): Promise<BimcollabProject> {
    const { userId, ...projectData } = project;
    const [created] = await db.insert(bimcollabProjects).values({
      ...projectData,
      createdBy: userId
    }).returning();
    return created;
  }

  async updateBimcollabProject(id: number, projectUpdate: Partial<InsertBimcollabProject>): Promise<BimcollabProject> {
    const [updated] = await db.update(bimcollabProjects)
      .set(projectUpdate)
      .where(eq(bimcollabProjects.id, id))
      .returning();
    return updated;
  }

  async createBimcollabIssue(issue: InsertBimcollabIssue): Promise<BimcollabIssue> {
    const [created] = await db.insert(bimcollabIssues).values(issue).returning();
    return created;
  }

  async updateBimcollabIssue(id: number, issueUpdate: Partial<InsertBimcollabIssue>): Promise<BimcollabIssue> {
    const [updated] = await db.update(bimcollabIssues)
      .set(issueUpdate)
      .where(eq(bimcollabIssues.id, id))
      .returning();
    return updated;
  }

  // Teams Integration methods
  async getTeamsBoards(userId: number): Promise<TeamsBoard[]> {
    return await db.select().from(teamsBoards).where(eq(teamsBoards.createdBy, userId));
  }

  async getTeamsCards(boardId: string): Promise<TeamsCard[]> {
    // Find the board first to get the internal ID
    const [board] = await db.select().from(teamsBoards).where(eq(teamsBoards.boardId, boardId));
    if (!board) return [];
    
    return await db.select().from(teamsCards).where(eq(teamsCards.boardId, board.id));
  }

  async createTeamsBoard(board: InsertTeamsBoard & { userId: number }): Promise<TeamsBoard> {
    const { userId, ...boardData } = board;
    const [created] = await db.insert(teamsBoards).values({
      ...boardData,
      createdBy: userId
    }).returning();
    return created;
  }

  async createTeamsCard(card: InsertTeamsCard): Promise<TeamsCard> {
    const [created] = await db.insert(teamsCards).values(card).returning();
    return created;
  }

  // Integration Settings methods
  async getIntegrationSettings(userId: number): Promise<IntegrationSettings | undefined> {
    const [settings] = await db.select().from(integrationSettings).where(eq(integrationSettings.userId, userId));
    return settings || undefined;
  }

  async createIntegrationSettings(settings: InsertIntegrationSettings & { userId: number }): Promise<IntegrationSettings> {
    const [created] = await db.insert(integrationSettings).values(settings).returning();
    return created;
  }

  async updateIntegrationSettings(userId: number, settingsUpdate: Partial<InsertIntegrationSettings>): Promise<IntegrationSettings> {
    const [updated] = await db.update(integrationSettings)
      .set(settingsUpdate)
      .where(eq(integrationSettings.userId, userId))
      .returning();
    return updated;
  }

  // Document References
  async getDocumentReferences(filter: { activityId?: number; subtaskId?: number; quickWinId?: number; roadblockId?: number }): Promise<DocumentReference[]> {
    let whereConditions: any[] = [];
    
    if (filter.activityId) {
      whereConditions.push(eq(documentReferences.activityId, filter.activityId));
    }
    if (filter.subtaskId) {
      whereConditions.push(eq(documentReferences.subtaskId, filter.subtaskId));
    }
    if (filter.quickWinId) {
      whereConditions.push(eq(documentReferences.quickWinId, filter.quickWinId));
    }
    if (filter.roadblockId) {
      whereConditions.push(eq(documentReferences.roadblockId, filter.roadblockId));
    }

    if (whereConditions.length === 0) {
      return [];
    }

    const results = await db
      .select()
      .from(documentReferences)
      .where(or(...whereConditions))
      .orderBy(desc(documentReferences.createdAt));

    return results;
  }

  async createDocumentReference(reference: InsertDocumentReference): Promise<DocumentReference> {
    const [created] = await db
      .insert(documentReferences)
      .values({
        ...reference,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return created;
  }

  async deleteDocumentReference(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(documentReferences)
      .where(and(
        eq(documentReferences.id, id),
        eq(documentReferences.createdBy, userId)
      ));

    return result.rowCount > 0;
  }

  // Calendar Integration Methods
  async getCalendarIntegrations(userId: number): Promise<CalendarIntegration[]> {
    return await db.select()
      .from(calendarIntegrations)
      .where(eq(calendarIntegrations.userId, userId))
      .orderBy(desc(calendarIntegrations.createdAt));
  }

  async getCalendarIntegration(id: number): Promise<CalendarIntegration | undefined> {
    const [integration] = await db.select()
      .from(calendarIntegrations)
      .where(eq(calendarIntegrations.id, id));
    return integration || undefined;
  }

  async createCalendarIntegration(integration: InsertCalendarIntegration & { userId: number }): Promise<CalendarIntegration> {
    const [created] = await db.insert(calendarIntegrations)
      .values({
        ...integration,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return created;
  }

  async updateCalendarIntegration(id: number, updates: Partial<InsertCalendarIntegration>): Promise<CalendarIntegration> {
    const [updated] = await db.update(calendarIntegrations)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(calendarIntegrations.id, id))
      .returning();
    return updated;
  }

  async deleteCalendarIntegration(id: number): Promise<void> {
    await db.delete(calendarIntegrations).where(eq(calendarIntegrations.id, id));
  }

  // Calendar Events Methods
  async getCalendarEvents(integrationId: number, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    let whereConditions = [eq(calendarEvents.integrationId, integrationId)];
    
    if (startDate) {
      whereConditions.push(sql`${calendarEvents.startTime} >= ${startDate.toISOString()}`);
    }
    if (endDate) {
      whereConditions.push(sql`${calendarEvents.endTime} <= ${endDate.toISOString()}`);
    }

    return await db.select()
      .from(calendarEvents)
      .where(and(...whereConditions))
      .orderBy(calendarEvents.startTime);
  }

  async getCalendarEventsByUser(userId: number, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    const userIntegrations = await this.getCalendarIntegrations(userId);
    if (userIntegrations.length === 0) return [];

    const integrationIds = userIntegrations.map(i => i.id);
    let whereConditions = [sql`${calendarEvents.integrationId} = ANY(${integrationIds})`];
    
    if (startDate) {
      whereConditions.push(sql`${calendarEvents.startTime} >= ${startDate.toISOString()}`);
    }
    if (endDate) {
      whereConditions.push(sql`${calendarEvents.endTime} <= ${endDate.toISOString()}`);
    }

    return await db.select()
      .from(calendarEvents)
      .where(and(...whereConditions))
      .orderBy(calendarEvents.startTime);
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [created] = await db.insert(calendarEvents)
      .values({
        ...event,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return created;
  }

  async updateCalendarEvent(id: number, updates: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    const [updated] = await db.update(calendarEvents)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(calendarEvents.id, id))
      .returning();
    return updated;
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  // Deadline Reminders Methods
  async getUpcomingDeadlineReminders(userId: number, daysAhead: number = 7): Promise<DeadlineReminder[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await db.select()
      .from(deadlineReminders)
      .where(
        and(
          eq(deadlineReminders.userId, userId),
          eq(deadlineReminders.sent, false),
          sql`${deadlineReminders.reminderTime} <= ${futureDate.toISOString()}`
        )
      )
      .orderBy(deadlineReminders.reminderTime);
  }

  async createDeadlineReminder(reminder: InsertDeadlineReminder & { userId: number }): Promise<DeadlineReminder> {
    const [created] = await db.insert(deadlineReminders)
      .values({
        ...reminder,
        createdAt: new Date()
      })
      .returning();
    return created;
  }

  async markReminderAsSent(id: number): Promise<void> {
    await db.update(deadlineReminders)
      .set({
        sent: true,
        sentAt: new Date()
      })
      .where(eq(deadlineReminders.id, id));
  }

  async createDeadlineRemindersForActivity(activityId: number, userId: number): Promise<void> {
    const activity = await this.getActivity(activityId);
    if (!activity || !activity.dueDate) return;

    const dueDate = new Date(activity.dueDate);
    const reminders = [
      { days: 7, type: 'email' as const },
      { days: 3, type: 'notification' as const },
      { days: 1, type: 'email' as const },
    ];

    for (const reminder of reminders) {
      const reminderTime = new Date(dueDate);
      reminderTime.setDate(reminderTime.getDate() - reminder.days);
      
      if (reminderTime > new Date()) {
        await this.createDeadlineReminder({
          userId,
          activityId,
          reminderTime,
          reminderType: reminder.type,
          message: `Activity "${activity.title}" is due in ${reminder.days} day${reminder.days > 1 ? 's' : ''}`
        });
      }
    }
  }

  async createDeadlineRemindersForSubtask(subtaskId: number, userId: number): Promise<void> {
    const subtask = await this.getSubtask(subtaskId);
    if (!subtask || !subtask.dueDate) return;

    const dueDate = new Date(subtask.dueDate);
    const reminders = [
      { days: 3, type: 'notification' as const },
      { days: 1, type: 'email' as const },
    ];

    for (const reminder of reminders) {
      const reminderTime = new Date(dueDate);
      reminderTime.setDate(reminderTime.getDate() - reminder.days);
      
      if (reminderTime > new Date()) {
        await this.createDeadlineReminder({
          userId,
          subtaskId,
          reminderTime,
          reminderType: reminder.type,
          message: `Subtask "${subtask.title}" is due in ${reminder.days} day${reminder.days > 1 ? 's' : ''}`
        });
      }
    }
  }
}

export const storage = new DatabaseStorage();
