import { pgTable, foreignKey, serial, integer, text, timestamp, unique, boolean, json, jsonb, date, varchar } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const activityLogs = pgTable("activity_logs", {
	id: serial().primaryKey().notNull(),
	activityId: integer("activity_id").notNull(),
	entry: text().notNull(),
	entryDate: timestamp("entry_date", { mode: 'string' }).notNull(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.activityId],
			foreignColumns: [activities.id],
			name: "activity_logs_activity_id_activities_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "activity_logs_created_by_users_id_fk"
		}),
]);

export const contacts = pgTable("contacts", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	phone: text(),
	company: text(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "contacts_created_by_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	email: text().notNull(),
	name: text().notNull(),
	role: text().default('user').notNull(),
	microsoftId: text("microsoft_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	department: text(),
	managerId: integer("manager_id"),
	replitId: text("replit_id"),
}, (table) => [
	foreignKey({
			columns: [table.managerId],
			foreignColumns: [table.id],
			name: "users_manager_id_fkey"
		}),
	unique("users_email_unique").on(table.email),
	unique("users_microsoft_id_unique").on(table.microsoftId),
	unique("users_replit_id_key").on(table.replitId),
]);

export const timeBlocks = pgTable("time_blocks", {
	id: serial().primaryKey().notNull(),
	activityId: integer("activity_id"),
	title: text().notNull(),
	description: text(),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }).notNull(),
	duration: integer().notNull(),
	blockType: text("block_type").default('task').notNull(),
	isScheduled: boolean("is_scheduled").default(false).notNull(),
	isCompleted: boolean("is_completed").default(false).notNull(),
	priority: text().default('normal').notNull(),
	color: text(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.activityId],
			foreignColumns: [activities.id],
			name: "time_blocks_activity_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "time_blocks_created_by_fkey"
		}),
]);

export const dailyAgendas = pgTable("daily_agendas", {
	id: serial().primaryKey().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	eisenhowerQuadrant: text("eisenhower_quadrant").notNull(),
	scheduledActivities: integer("scheduled_activities").array().default([]).notNull(),
	aiSuggestions: text("ai_suggestions"),
	taskSwitchCount: integer("task_switch_count").default(0).notNull(),
	maxTaskSwitches: integer("max_task_switches").default(3).notNull(),
	isGenerated: boolean("is_generated").default(false).notNull(),
	generatedAt: timestamp("generated_at", { mode: 'string' }),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "daily_agendas_created_by_users_id_fk"
		}),
]);

export const weeklyEthos = pgTable("weekly_ethos", {
	id: serial().primaryKey().notNull(),
	dayOfWeek: integer("day_of_week").notNull(),
	ethos: text().notNull(),
	description: text(),
	focusAreas: text("focus_areas").array(),
	maxTaskSwitches: integer("max_task_switches").default(3).notNull(),
	preferredWorkBlocks: integer("preferred_work_blocks").default(2).notNull(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "weekly_ethos_created_by_users_id_fk"
		}),
]);

export const quickWins = pgTable("quick_wins", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	linkedActivityId: integer("linked_activity_id"),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	impact: text().default('medium').notNull(),
	effort: text().default('medium').notNull(),
	status: text().default('pending').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.linkedActivityId],
			foreignColumns: [activities.id],
			name: "quick_wins_linked_activity_id_activities_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "quick_wins_created_by_users_id_fk"
		}),
]);

export const userPreferences = pgTable("user_preferences", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	preferences: json().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_preferences_user_id_fkey"
		}),
]);

export const subtasks = pgTable("subtasks", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	type: text().notNull(),
	status: text().default('pending').notNull(),
	priority: text().default('medium').notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	participants: text().array().default([""]).notNull(),
	participantTypes: jsonb("participant_types").default({}).notNull(),
	linkedActivityId: integer("linked_activity_id").notNull(),
	completedDate: timestamp("completed_date", { mode: 'string' }),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	rescueCount: integer("rescue_count").default(0),
	rescuedAt: timestamp("rescued_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.linkedActivityId],
			foreignColumns: [activities.id],
			name: "subtasks_linked_activity_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "subtasks_created_by_fkey"
		}),
]);

export const dailyTaskCompletions = pgTable("daily_task_completions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	activityId: integer("activity_id").notNull(),
	taskDate: date("task_date").notNull(),
	completed: boolean().default(false).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "daily_task_completions_user_id_fkey"
		}),
	foreignKey({
			columns: [table.activityId],
			foreignColumns: [activities.id],
			name: "daily_task_completions_activity_id_fkey"
		}).onDelete("cascade"),
	unique("daily_task_completions_user_id_activity_id_task_date_key").on(table.userId, table.activityId, table.taskDate),
]);

export const taskComments = pgTable("task_comments", {
	id: serial().primaryKey().notNull(),
	activityId: integer("activity_id").notNull(),
	comment: text().notNull(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.activityId],
			foreignColumns: [activities.id],
			name: "task_comments_activity_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "task_comments_created_by_fkey"
		}),
]);

export const activities = pgTable("activities", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	priority: text().default('normal').notNull(),
	status: text().default('planned').notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	createdBy: integer("created_by").notNull(),
	assignedUsers: integer("assigned_users").array(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	statusTags: text("status_tags").array(),
	estimatedDuration: integer("estimated_duration"),
	participants: text().array(),
	isPublic: boolean("is_public").default(false).notNull(),
	collaborators: text().array().default(["RAY"]),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "activities_created_by_users_id_fk"
		}),
]);

export const roadblocks = pgTable("roadblocks", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	severity: text().default('medium').notNull(),
	status: text().default('open').notNull(),
	linkedActivityId: integer("linked_activity_id").notNull(),
	reportedDate: timestamp("reported_date", { mode: 'string' }).notNull(),
	resolvedDate: timestamp("resolved_date", { mode: 'string' }),
	resolution: text(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	assignedTo: text("assigned_to"),
	oorzaakCategory: text("oorzaak_category").default('unclear'),
	oorzaakFactor: text("oorzaak_factor"),
	departmentImpact: text("department_impact").array().default([""]),
	newDeadline: timestamp("new_deadline", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.linkedActivityId],
			foreignColumns: [activities.id],
			name: "roadblocks_linked_activity_id_activities_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "roadblocks_created_by_users_id_fk"
		}),
]);

export const deepFocusBlocks = pgTable("deep_focus_blocks", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	userId: integer("user_id").notNull(),
	scheduledStart: timestamp("scheduled_start", { mode: 'string' }).notNull(),
	scheduledEnd: timestamp("scheduled_end", { mode: 'string' }).notNull(),
	actualStart: timestamp("actual_start", { mode: 'string' }),
	actualEnd: timestamp("actual_end", { mode: 'string' }),
	status: varchar({ length: 50 }).default('scheduled'),
	focusType: varchar("focus_type", { length: 50 }).default('deep'),
	lowStimulusMode: boolean("low_stimulus_mode").default(true),
	selectedActivityId: integer("selected_activity_id"),
	notes: text(),
	productivityRating: integer("productivity_rating"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	distractionCount: integer("distraction_count").default(0),
	completionNotes: text("completion_notes"),
	selectedSubtaskId: integer("selected_subtask_id"),
}, (table) => [
	foreignKey({
			columns: [table.selectedSubtaskId],
			foreignColumns: [subtasks.id],
			name: "deep_focus_blocks_selected_subtask_id_fkey"
		}),
]);
