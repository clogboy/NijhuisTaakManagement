
import { pgTable, text, serial, integer, boolean, timestamp, json, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Core tables only
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  settings: json("settings").default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  settings: json("settings").default({}), // All user preferences in JSON
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

// Consolidated activities table
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("task"), // 'task', 'quick_win', 'roadblock'
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("pending"),
  dueDate: timestamp("due_date"),
  parentId: integer("parent_id").references((): any => activities.id), // For subtasks
  participants: text("participants").array().default([]),
  metadata: json("metadata").default({}), // Flexible data for different types
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Consolidated entries (logs, comments, notes)
export const activity_entries = pgTable("activity_entries", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => activities.id),
  type: text("type").notNull(), // 'log', 'comment', 'note'
  content: text("content").notNull(),
  metadata: json("metadata").default({}),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Simplified calendar/time management
export const time_blocks = pgTable("time_blocks", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id),
  title: text("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  type: text("type").notNull().default("work"), // 'work', 'break', 'focus'
  metadata: json("metadata").default({}),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User tracking/analytics
export const user_metrics = pgTable("user_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  metricType: text("metric_type").notNull(), // 'mood', 'productivity', 'focus'
  value: json("value").notNull(), // Flexible metric data
  recordedAt: timestamp("recorded_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Types
export type Activity = typeof activities.$inferSelect;
export type ActivityEntry = typeof activity_entries.$inferSelect;
export type TimeBlock = typeof time_blocks.$inferSelect;
export type UserMetric = typeof user_metrics.$inferSelect;

// Insert schemas
export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityEntrySchema = createInsertSchema(activity_entries).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export const insertTimeBlockSchema = createInsertSchema(time_blocks).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export const insertUserMetricSchema = createInsertSchema(user_metrics).omit({
  id: true,
  userId: true,
  createdAt: true,
});
