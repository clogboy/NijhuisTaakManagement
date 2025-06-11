import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"), // 'admin' or 'user'
  microsoftId: text("microsoft_id").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  preferences: json("preferences").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const moodEntries = pgTable("mood_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  mood: text("mood").notNull(), // 'energetic', 'focused', 'calm', 'stressed', 'tired', 'creative', 'overwhelmed'
  energy: integer("energy").notNull(), // 1-5 scale
  focus: integer("focus").notNull(), // 1-5 scale
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const moodReminders = pgTable("mood_reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  reminderType: text("reminder_type").notNull(), // 'break', 'hydration', 'stretch', 'mindfulness', 'task_switch'
  triggerMood: text("trigger_mood"), // optional: specific mood that triggers this reminder
  isActive: boolean("is_active").notNull().default(true),
  lastShown: timestamp("last_shown"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("normal"), // 'low', 'normal', 'urgent'
  status: text("status").notNull().default("planned"), // 'planned', 'in_progress', 'completed'
  statusTags: text("status_tags").array(),
  estimatedDuration: integer("estimated_duration"), // in minutes
  dueDate: timestamp("due_date"),
  participants: integer("participants").array(), // array of contact IDs
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => activities.id),
  entry: text("entry").notNull(),
  entryDate: timestamp("entry_date").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quickWins = pgTable("quick_wins", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  impact: text("impact").notNull().default("medium"), // 'low', 'medium', 'high'
  effort: text("effort").notNull().default("medium"), // 'low', 'medium', 'high'
  status: text("status").notNull().default("pending"), // 'pending', 'completed'
  linkedActivityId: integer("linked_activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roadblocks = pgTable("roadblocks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"), // 'low', 'medium', 'high', 'critical'
  status: text("status").notNull().default("open"), // 'open', 'in_progress', 'resolved'
  assignedTo: text("assigned_to"),
  linkedActivityId: integer("linked_activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  reportedDate: timestamp("reported_date").notNull(),
  resolvedDate: timestamp("resolved_date"),
  resolution: text("resolution"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'quick_win', 'roadblock', 'task'
  status: text("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'resolved'
  priority: text("priority").notNull().default("medium"), // 'low', 'medium', 'high'
  dueDate: timestamp("due_date"),
  participants: text("participants").array().notNull().default([]), // array of contact names/emails
  participantTypes: json("participant_types").notNull().default({}), // { "email@domain.com": "task", "other@domain.com": "quick_win" }
  linkedActivityId: integer("linked_activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  completedDate: timestamp("completed_date"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export const insertQuickWinSchema = createInsertSchema(quickWins).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export const insertRoadblockSchema = createInsertSchema(roadblocks).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubtaskSchema = createInsertSchema(subtasks).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.union([z.date(), z.string().transform(str => str ? new Date(str) : null), z.null()]).optional(),
});

export const weeklyEthos = pgTable("weekly_ethos", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  ethos: text("ethos").notNull(),
  description: text("description"),
  focusAreas: text("focus_areas").array(), // Areas of focus for this day
  maxTaskSwitches: integer("max_task_switches").notNull().default(3),
  preferredWorkBlocks: integer("preferred_work_blocks").notNull().default(2), // Number of focused work blocks
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dailyAgendas = pgTable("daily_agendas", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  eisenhowerQuadrant: text("eisenhower_quadrant").notNull(), // urgent_important, important_not_urgent, urgent_not_important, neither
  scheduledActivities: integer("scheduled_activities").array().notNull().default([]),
  aiSuggestions: text("ai_suggestions"),
  taskSwitchCount: integer("task_switch_count").notNull().default(0),
  maxTaskSwitches: integer("max_task_switches").notNull().default(3),
  isGenerated: boolean("is_generated").notNull().default(false),
  generatedAt: timestamp("generated_at"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWeeklyEthosSchema = createInsertSchema(weeklyEthos).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyAgendaSchema = createInsertSchema(dailyAgendas).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;

export type QuickWin = typeof quickWins.$inferSelect;
export type InsertQuickWin = z.infer<typeof insertQuickWinSchema>;

export type Roadblock = typeof roadblocks.$inferSelect;
export type InsertRoadblock = z.infer<typeof insertRoadblockSchema>;

export type Subtask = typeof subtasks.$inferSelect;
export type InsertSubtask = z.infer<typeof insertSubtaskSchema>;

export type WeeklyEthos = typeof weeklyEthos.$inferSelect;
export type InsertWeeklyEthos = z.infer<typeof insertWeeklyEthosSchema>;

export type DailyAgenda = typeof dailyAgendas.$inferSelect;
export type InsertDailyAgenda = z.infer<typeof insertDailyAgendaSchema>;

export const insertMoodEntrySchema = createInsertSchema(moodEntries).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertMoodReminderSchema = createInsertSchema(moodReminders).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type MoodEntry = typeof moodEntries.$inferSelect;
export type InsertMoodEntry = z.infer<typeof insertMoodEntrySchema>;

export type MoodReminder = typeof moodReminders.$inferSelect;
export type InsertMoodReminder = z.infer<typeof insertMoodReminderSchema>;

export const insertWorkspaceInvitationSchema = createInsertSchema(workspaceInvitations).omit({
  id: true,
  inviterId: true,
  inviteToken: true,
  status: true,
  acceptedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkspaceAccessSchema = createInsertSchema(workspaceAccess).omit({
  id: true,
  grantedAt: true,
});

export type WorkspaceInvitation = typeof workspaceInvitations.$inferSelect;
export type InsertWorkspaceInvitation = z.infer<typeof insertWorkspaceInvitationSchema>;

export type WorkspaceAccess = typeof workspaceAccess.$inferSelect;
export type InsertWorkspaceAccess = z.infer<typeof insertWorkspaceAccessSchema>;

export const dailyTaskCompletions = pgTable("daily_task_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  activityId: integer("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  taskDate: timestamp("task_date").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const timeBlocks = pgTable("time_blocks", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  duration: integer("duration").notNull(), // in minutes
  blockType: text("block_type").notNull().default("task"), // 'task', 'break', 'meeting', 'focus'
  isScheduled: boolean("is_scheduled").notNull().default(false),
  isCompleted: boolean("is_completed").notNull().default(false),
  priority: text("priority").notNull().default("normal"), // 'low', 'normal', 'high', 'urgent'
  color: text("color"), // hex color for visual identification
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTimeBlockSchema = createInsertSchema(timeBlocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyTaskCompletionSchema = createInsertSchema(dailyTaskCompletions).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type DailyTaskCompletion = typeof dailyTaskCompletions.$inferSelect;
export type InsertDailyTaskCompletion = z.infer<typeof insertDailyTaskCompletionSchema>;

export type TimeBlock = typeof timeBlocks.$inferSelect;
export type InsertTimeBlock = z.infer<typeof insertTimeBlockSchema>;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
