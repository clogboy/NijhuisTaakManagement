import { pgTable, text, serial, integer, boolean, timestamp, json, date, unique, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Core user management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"), // 'admin', 'manager', 'user'
  department: text("department"),
  managerId: integer("manager_id"),
  replitId: text("replit_id").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Contact management
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Core activity management
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("normal"), // 'low', 'normal', 'high', 'urgent'
  status: text("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'archived'
  dueDate: timestamp("due_date"),
  estimatedDuration: integer("estimated_duration"), // in minutes
  participants: text("participants").array().default([]),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subtasks linked to activities
export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("task"), // 'task', 'quick_win', 'roadblock'
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  dueDate: timestamp("due_date"),
  participants: text("participants").array().default([]),
  linkedActivityId: integer("linked_activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  completedDate: timestamp("completed_date"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Quick wins (escalated from subtasks)
export const quickWins = pgTable("quick_wins", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  impact: text("impact").notNull().default("medium"), // 'low', 'medium', 'high'
  effort: text("effort").notNull().default("medium"), // 'low', 'medium', 'high'
  status: text("status").notNull().default("pending"),
  linkedActivityId: integer("linked_activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  linkedSubtaskId: integer("linked_subtask_id").references(() => subtasks.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Roadblocks (escalated from subtasks)
export const roadblocks = pgTable("roadblocks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"), // 'low', 'medium', 'high', 'critical'
  status: text("status").notNull().default("open"), // 'open', 'in_progress', 'resolved'
  linkedActivityId: integer("linked_activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  linkedSubtaskId: integer("linked_subtask_id").references(() => subtasks.id),
  reportedDate: timestamp("reported_date").notNull(),
  resolvedDate: timestamp("resolved_date"),
  resolution: text("resolution"),
  newDeadline: timestamp("new_deadline"), // For rescue workflow
  oorzaakCategory: text("oorzaak_category"), // Root cause category
  oorzaakFactor: text("oorzaak_factor"), // Specific root cause factor
  departmentImpact: text("department_impact").array().default([]), // Affected departments
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comments/logs for activities
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id, { onDelete: "cascade" }),
  user_id: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(), // 'created', 'updated', 'completed', etc.
  changes: json("changes"), // Store what changed
  timestamp: timestamp("timestamp").defaultNow(),
});

export const flowStrategies = pgTable('flow_strategies', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  strategy_name: varchar('strategy_name', { length: 100 }).notNull(),
  personality_type: varchar('personality_type', { length: 50 }).notNull(),
  description: text('description'),
  working_hours: json('working_hours'),
  max_task_switches: integer('max_task_switches'),
  focus_block_duration: integer('focus_block_duration'),
  break_duration: integer('break_duration'),
  preferred_task_types: json('preferred_task_types'),
  energy_pattern: json('energy_pattern'),
  notification_settings: json('notification_settings'),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Insert schemas
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
});

export const insertSubtaskSchema = createInsertSchema(subtasks).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
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

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Subtask = typeof subtasks.$inferSelect;
export type InsertSubtask = z.infer<typeof insertSubtaskSchema>;

export type QuickWin = typeof quickWins.$inferSelect;
export type InsertQuickWin = z.infer<typeof insertQuickWinSchema>;

export type Roadblock = typeof roadblocks.$inferSelect;
export type InsertRoadblock = z.infer<typeof insertRoadblockSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type FlowStrategy = typeof flowStrategies.$inferSelect;
export type InsertFlowStrategy = typeof flowStrategies.$inferInsert;

// Oorzaak Analysis Constants
export const OORZAAK_CATEGORIES = {
  PROCESS: "process",
  RESOURCES: "resources", 
  COMMUNICATION: "communication",
  EXTERNAL: "external",
  TECHNICAL: "technical",
  PLANNING: "planning",
  SKILLS: "skills",
  UNCLEAR: "unclear"
} as const;

export const OORZAAK_FACTORS = {
  process: {
    WORKFLOW_UNCLEAR: "Workflow Unclear",
    APPROVAL_DELAYS: "Approval Delays",
    DOCUMENTATION_MISSING: "Documentation Missing",
    STANDARDS_INCONSISTENT: "Standards Inconsistent"
  },
  resources: {
    BUDGET_INSUFFICIENT: "Budget Insufficient",
    TOOLS_UNAVAILABLE: "Tools Unavailable",
    TIME_CONSTRAINTS: "Time Constraints",
    PERSONNEL_SHORTAGE: "Personnel Shortage"
  },
  communication: {
    UNCLEAR_REQUIREMENTS: "Unclear Requirements",
    STAKEHOLDER_UNAVAILABLE: "Stakeholder Unavailable",
    FEEDBACK_DELAYED: "Feedback Delayed",
    LANGUAGE_BARRIERS: "Language Barriers"
  },
  external: {
    VENDOR_DELAYS: "Vendor Delays",
    CLIENT_CHANGES: "Client Changes",
    REGULATORY_CHANGES: "Regulatory Changes",
    THIRD_PARTY_ISSUES: "Third Party Issues"
  },
  technical: {
    SYSTEM_LIMITATIONS: "System Limitations",
    INTEGRATION_ISSUES: "Integration Issues",
    PERFORMANCE_PROBLEMS: "Performance Problems",
    COMPATIBILITY_ISSUES: "Compatibility Issues"
  },
  planning: {
    UNREALISTIC_DEADLINES: "Unrealistic Deadlines",
    SCOPE_CREEP: "Scope Creep",
    DEPENDENCIES_UNCLEAR: "Dependencies Unclear",
    RISK_UNDERESTIMATED: "Risk Underestimated"
  },
  skills: {
    TRAINING_NEEDED: "Training Needed",
    EXPERTISE_MISSING: "Expertise Missing",
    KNOWLEDGE_TRANSFER: "Knowledge Transfer",
    LEARNING_CURVE: "Learning Curve"
  },
  unclear: {}
} as const;