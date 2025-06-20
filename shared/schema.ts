import { pgTable, text, serial, integer, boolean, timestamp, json, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { culturalDateSchema } from "./validation/date-utils";

// Oorzaak (root cause) categorization for roadblock analysis
export const OORZAAK_CATEGORIES = {
  PROCESS: "process", // Workflow, procedure, or policy issues
  RESOURCES: "resources", // Lack of tools, budget, personnel
  COMMUNICATION: "communication", // Unclear requirements, poor coordination
  EXTERNAL: "external", // Third-party dependencies, client delays
  TECHNICAL: "technical", // System limitations, technical debt
  PLANNING: "planning", // Unrealistic timelines, scope creep
  SKILLS: "skills", // Training needs, knowledge gaps
  UNCLEAR: "unclear" // Root cause not yet identified
} as const;

export const OORZAAK_FACTORS = {
  PROCESS: [
    "outdated_procedures",
    "missing_approval_process", 
    "unclear_workflow",
    "conflicting_policies",
    "bottleneck_in_chain"
  ],
  RESOURCES: [
    "insufficient_budget",
    "understaffed_team",
    "missing_tools",
    "hardware_limitations",
    "software_licensing"
  ],
  COMMUNICATION: [
    "unclear_requirements",
    "missing_stakeholder_input",
    "poor_documentation",
    "language_barriers",
    "timezone_coordination"
  ],
  EXTERNAL: [
    "vendor_delays",
    "client_feedback_delay",
    "regulatory_approval",
    "third_party_integration",
    "market_conditions"
  ],
  TECHNICAL: [
    "legacy_system_limitations",
    "integration_complexity",
    "performance_bottlenecks",
    "security_constraints",
    "technical_debt"
  ],
  PLANNING: [
    "unrealistic_timeline",
    "scope_creep",
    "missing_dependencies",
    "resource_allocation",
    "priority_conflicts"
  ],
  SKILLS: [
    "training_needed",
    "knowledge_transfer",
    "expertise_gap",
    "learning_curve",
    "certification_required"
  ],
  UNCLEAR: [
    "investigation_needed",
    "multiple_factors",
    "root_cause_unknown"
  ]
} as const;

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier
  domain: text("domain"), // Optional: company domain for automatic tenant detection
  settings: json("settings").default({}), // Tenant-specific configuration
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id), // Multi-tenant isolation
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"), // 'admin' | 'manager' | 'user'
  department: text("department"), // e.g., 'Engineering', 'Sales', 'Operations'
  managerId: integer("manager_id").references((): any => users.id), // Self-referencing for hierarchy
  microsoftId: text("microsoft_id"), // Keep for future Microsoft migration
  replitId: text("replit_id"), // Add Replit ID field for auth
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

export const workspaceInvitations = pgTable("workspace_invitations", {
  id: serial("id").primaryKey(),
  inviterId: integer("inviter_id").notNull().references(() => users.id),
  inviteeEmail: text("invitee_email").notNull(),
  inviteeName: text("invitee_name"),
  accessLevel: text("access_level").notNull().default("read_only"), // "read_only", "collaborator", "admin"
  status: text("status").notNull().default("pending"), // "pending", "accepted", "declined", "expired"
  inviteToken: text("invite_token").notNull().unique(),
  message: text("message"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceAccess = pgTable("workspace_access", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  guestId: integer("guest_id").notNull().references(() => users.id),
  accessLevel: text("access_level").notNull().default("read_only"),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  invitationId: integer("invitation_id").references(() => workspaceInvitations.id),
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
  status: text("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'archived'
  statusTags: text("status_tags").array(),
  estimatedDuration: integer("estimated_duration"), // in minutes
  dueDate: timestamp("due_date"),
  participants: text("participants").array(), // array of contact emails
  isPublic: boolean("is_public").notNull().default(false), // whether non-authors can see this activity
  collaborators: text("collaborators").array().default([]), // emails of users who can view/edit
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
  oorzaakCategory: text("oorzaak_category").notNull().default("unclear"), // Root cause categorization for management analysis
  oorzaakFactor: text("oorzaak_factor"), // Specific factor within the category
  departmentImpact: text("department_impact").array().default([]), // Which departments are affected
  linkedActivityId: integer("linked_activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  reportedDate: timestamp("reported_date").notNull(),
  resolvedDate: timestamp("resolved_date"),
  resolution: text("resolution"),
  newDeadline: timestamp("new_deadline"), // For rescue mode: new deadline when converting to subtask
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
  rescueCount: integer("rescue_count").default(0),
  rescuedAt: timestamp("rescued_at"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Add unique constraint on email+tenantId instead of just email
export const userEmailTenantConstraint = pgTable("users", {
  email: text("email").notNull(),
  tenantId: integer("tenant_id").notNull(),
}, (table) => ({
  emailTenantUnique: unique().on(table.email, table.tenantId),
}));

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: culturalDateSchema,
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
}).extend({
  oorzaakCategory: z.enum([
    OORZAAK_CATEGORIES.PROCESS,
    OORZAAK_CATEGORIES.RESOURCES,
    OORZAAK_CATEGORIES.COMMUNICATION,
    OORZAAK_CATEGORIES.EXTERNAL,
    OORZAAK_CATEGORIES.TECHNICAL,
    OORZAAK_CATEGORIES.PLANNING,
    OORZAAK_CATEGORIES.SKILLS,
    OORZAAK_CATEGORIES.UNCLEAR
  ]).default(OORZAAK_CATEGORIES.UNCLEAR),
});

// Deep Focus Blocks
export const deepFocusBlocks = pgTable("deep_focus_blocks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  actualStart: timestamp("actual_start"),
  actualEnd: timestamp("actual_end"),
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'active', 'completed', 'cancelled'
  selectedActivityId: integer("selected_activity_id").references(() => activities.id),
  selectedSubtaskId: integer("selected_subtask_id").references(() => subtasks.id),
  focusType: text("focus_type").notNull().default("deep"), // 'deep', 'shallow', 'creative'
  lowStimulusMode: boolean("low_stimulus_mode").notNull().default(true),
  distractionCount: integer("distraction_count").default(0),
  completionNotes: text("completion_notes"),
  productivityRating: integer("productivity_rating"), // 1-5 scale
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubtaskSchema = createInsertSchema(subtasks).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: culturalDateSchema,
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

export const insertDeepFocusBlockSchema = createInsertSchema(deepFocusBlocks).omit({
  id: true,
  userId: true,
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
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = {
  id?: string;
  tenantId: number;
  email: string;
  name: string;
  role?: string;
  microsoftId?: string;
  replitId?: string;
};

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

export type DeepFocusBlock = typeof deepFocusBlocks.$inferSelect;
export type InsertDeepFocusBlock = z.infer<typeof insertDeepFocusBlockSchema>;

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

// Teams Integration Tables
export const teamsBoards = pgTable("teams_boards", {
  id: serial("id").primaryKey(),
  boardId: text("board_id").notNull().unique(), // Teams/Planner board ID
  title: text("title").notNull(),
  description: text("description"),
  teamId: text("team_id").notNull(), // Teams team ID
  channelId: text("channel_id"), // Teams channel ID
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const teamsCards = pgTable("teams_cards", {
  id: serial("id").primaryKey(),
  cardId: text("card_id").notNull().unique(), // Teams/Planner task ID
  boardId: integer("board_id").references(() => teamsBoards.id),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: text("assigned_to").array(), // Array of user emails
  priority: text("priority").default("normal"), // low, normal, high
  status: text("status").default("not_started"), // not_started, in_progress, completed
  dueDate: text("due_date"), // Using text for date storage
  labels: text("labels").array(),
  bucketName: text("bucket_name"), // Planner bucket name
  linkedActivityId: integer("linked_activity_id").references(() => activities.id),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// BimCollab Integration Tables
export const bimcollabProjects = pgTable("bimcollab_projects", {
  id: serial("id").primaryKey(),
  projectId: text("project_id").notNull().unique(), // BimCollab project ID
  name: text("name").notNull(),
  description: text("description"),
  serverUrl: text("server_url").notNull(), // BimCollab server URL
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const bimcollabIssues = pgTable("bimcollab_issues", {
  id: serial("id").primaryKey(),
  issueId: text("issue_id").notNull().unique(), // BimCollab issue ID
  projectId: integer("project_id").references(() => bimcollabProjects.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("open"), // open, in_progress, resolved, closed
  priority: text("priority").default("normal"), // low, normal, high, critical
  issueType: text("issue_type"), // clash, design, coordination, etc.
  assignedTo: text("assigned_to").array(), // Array of user emails
  reporter: text("reporter"), // Who reported the issue
  dueDate: text("due_date"), // Using text for date storage
  modelElement: text("model_element"), // Reference to BIM element
  coordinates: json("coordinates"), // 3D coordinates in model
  screenshots: text("screenshots").array(), // URLs to issue screenshots
  linkedRoadblockId: integer("linked_roadblock_id").references(() => roadblocks.id),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Integration Settings
export const integrationSettings = pgTable("integration_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  integrationType: text("integration_type").notNull(), // "teams", "bimcollab"
  settings: json("settings").notNull(), // JSON blob for integration-specific settings
  isEnabled: boolean("is_enabled").default(true),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Schema exports for Teams
export const insertTeamsBoardSchema = createInsertSchema(teamsBoards);
export type InsertTeamsBoard = z.infer<typeof insertTeamsBoardSchema>;
export type TeamsBoard = typeof teamsBoards.$inferSelect;

export const insertTeamsCardSchema = createInsertSchema(teamsCards);
export type InsertTeamsCard = z.infer<typeof insertTeamsCardSchema>;
export type TeamsCard = typeof teamsCards.$inferSelect;

// Schema exports for BimCollab
export const insertBimcollabProjectSchema = createInsertSchema(bimcollabProjects);
export type InsertBimcollabProject = z.infer<typeof insertBimcollabProjectSchema>;
export type BimcollabProject = typeof bimcollabProjects.$inferSelect;

export const insertBimcollabIssueSchema = createInsertSchema(bimcollabIssues);
export type InsertBimcollabIssue = z.infer<typeof insertBimcollabIssueSchema>;
export type BimcollabIssue = typeof bimcollabIssues.$inferSelect;

// Schema exports for Integration Settings
export const insertIntegrationSettingsSchema = createInsertSchema(integrationSettings);
export type InsertIntegrationSettings = z.infer<typeof insertIntegrationSettingsSchema>;
export type IntegrationSettings = typeof integrationSettings.$inferSelect;

// Flow Protection Strategies
export const flowStrategies = pgTable("flow_strategies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  personalityType: text("personality_type").notNull(), // "early_bird", "night_owl", "steady_pacer", "sprint_recover"
  strategyName: text("strategy_name").notNull(),
  description: text("description"),
  workingHours: json("working_hours"), // { start: "07:00", end: "19:00", peakStart: "09:00", peakEnd: "11:00" }
  maxTaskSwitches: integer("max_task_switches").default(3),
  focusBlockDuration: integer("focus_block_duration").default(120), // minutes
  breakDuration: integer("break_duration").default(15), // minutes
  preferredTaskTypes: text("preferred_task_types").array(), // ["deep_work", "collaboration", "admin"]
  energyPattern: json("energy_pattern"), // { morning: 0.9, afternoon: 0.7, evening: 0.4 }
  notificationSettings: json("notification_settings"), // { allowInterruptions: false, urgentOnly: true }
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertFlowStrategySchema = createInsertSchema(flowStrategies);
export type InsertFlowStrategy = z.infer<typeof insertFlowStrategySchema>;
export type FlowStrategy = typeof flowStrategies.$inferSelect;

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

export const calendarIntegrations = pgTable("calendar_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull(), // 'google', 'outlook', 'ical'
  accountId: text("account_id").notNull(),
  accountEmail: text("account_email").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  isActive: boolean("is_active").notNull().default(true),
  syncEnabled: boolean("sync_enabled").notNull().default(true),
  lastSync: timestamp("last_sync"),
  settings: json("settings").default({}), // sync preferences, calendar selections
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull().references(() => calendarIntegrations.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(), // calendar provider's event ID
  activityId: integer("activity_id").references(() => activities.id),
  subtaskId: integer("subtask_id").references(() => subtasks.id),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isAllDay: boolean("is_all_day").notNull().default(false),
  location: text("location"),
  attendees: json("attendees").default([]), // array of email addresses
  reminderMinutes: integer("reminder_minutes").default(15),
  eventType: text("event_type").notNull().default("deadline"), // 'deadline', 'meeting', 'reminder', 'block'
  status: text("status").notNull().default("confirmed"), // 'confirmed', 'tentative', 'cancelled'
  lastModified: timestamp("last_modified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deadlineReminders = pgTable("deadline_reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  activityId: integer("activity_id").references(() => activities.id),
  subtaskId: integer("subtask_id").references(() => subtasks.id),
  reminderTime: timestamp("reminder_time").notNull(),
  reminderType: text("reminder_type").notNull(), // 'email', 'notification', 'calendar'
  message: text("message").notNull(),
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const insertCalendarIntegrationSchema = createInsertSchema(calendarIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeadlineReminderSchema = createInsertSchema(deadlineReminders).omit({
  id: true,
  userId: true,
  sent: true,
  sentAt: true,
  createdAt: true,
});

export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type InsertCalendarIntegration = z.infer<typeof insertCalendarIntegrationSchema>;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

export type DeadlineReminder = typeof deadlineReminders.$inferSelect;
export type InsertDeadlineReminder = z.infer<typeof insertDeadlineReminderSchema>;

export const documentReferences = pgTable("document_references", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id, { onDelete: "cascade" }),
  subtaskId: integer("subtask_id").references(() => subtasks.id, { onDelete: "cascade" }),
  quickWinId: integer("quick_win_id").references(() => quickWins.id, { onDelete: "cascade" }),
  roadblockId: integer("roadblock_id").references(() => roadblocks.id, { onDelete: "cascade" }),
  documentId: text("document_id").notNull(), // DigiOffice document ID
  documentName: text("document_name").notNull(),
  documentPath: text("document_path"),
  documentUrl: text("document_url"),
  documentType: text("document_type"), // file extension or mime type
  fileSize: integer("file_size"), // in bytes
  version: text("version"),
  description: text("description"),
  isCheckedOut: boolean("is_checked_out").notNull().default(false),
  checkedOutBy: integer("checked_out_by").references(() => users.id),
  checkedOutAt: timestamp("checked_out_at"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDocumentReferenceSchema = createInsertSchema(documentReferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DocumentReference = typeof documentReferences.$inferSelect;
export type InsertDocumentReference = z.infer<typeof insertDocumentReferenceSchema>;
