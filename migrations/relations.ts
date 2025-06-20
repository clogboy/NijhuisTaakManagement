import { relations } from "drizzle-orm/relations";
import { activities, activityLogs, users, contacts, timeBlocks, dailyAgendas, weeklyEthos, quickWins, userPreferences, subtasks, dailyTaskCompletions, taskComments, roadblocks, deepFocusBlocks } from "./schema";

export const activityLogsRelations = relations(activityLogs, ({one}) => ({
	activity: one(activities, {
		fields: [activityLogs.activityId],
		references: [activities.id]
	}),
	user: one(users, {
		fields: [activityLogs.createdBy],
		references: [users.id]
	}),
}));

export const activitiesRelations = relations(activities, ({one, many}) => ({
	activityLogs: many(activityLogs),
	timeBlocks: many(timeBlocks),
	quickWins: many(quickWins),
	subtasks: many(subtasks),
	dailyTaskCompletions: many(dailyTaskCompletions),
	taskComments: many(taskComments),
	user: one(users, {
		fields: [activities.createdBy],
		references: [users.id]
	}),
	roadblocks: many(roadblocks),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	activityLogs: many(activityLogs),
	contacts: many(contacts),
	user: one(users, {
		fields: [users.managerId],
		references: [users.id],
		relationName: "users_managerId_users_id"
	}),
	users: many(users, {
		relationName: "users_managerId_users_id"
	}),
	timeBlocks: many(timeBlocks),
	dailyAgendas: many(dailyAgendas),
	weeklyEthos: many(weeklyEthos),
	quickWins: many(quickWins),
	userPreferences: many(userPreferences),
	subtasks: many(subtasks),
	dailyTaskCompletions: many(dailyTaskCompletions),
	taskComments: many(taskComments),
	activities: many(activities),
	roadblocks: many(roadblocks),
}));

export const contactsRelations = relations(contacts, ({one}) => ({
	user: one(users, {
		fields: [contacts.createdBy],
		references: [users.id]
	}),
}));

export const timeBlocksRelations = relations(timeBlocks, ({one}) => ({
	activity: one(activities, {
		fields: [timeBlocks.activityId],
		references: [activities.id]
	}),
	user: one(users, {
		fields: [timeBlocks.createdBy],
		references: [users.id]
	}),
}));

export const dailyAgendasRelations = relations(dailyAgendas, ({one}) => ({
	user: one(users, {
		fields: [dailyAgendas.createdBy],
		references: [users.id]
	}),
}));

export const weeklyEthosRelations = relations(weeklyEthos, ({one}) => ({
	user: one(users, {
		fields: [weeklyEthos.createdBy],
		references: [users.id]
	}),
}));

export const quickWinsRelations = relations(quickWins, ({one}) => ({
	activity: one(activities, {
		fields: [quickWins.linkedActivityId],
		references: [activities.id]
	}),
	user: one(users, {
		fields: [quickWins.createdBy],
		references: [users.id]
	}),
}));

export const userPreferencesRelations = relations(userPreferences, ({one}) => ({
	user: one(users, {
		fields: [userPreferences.userId],
		references: [users.id]
	}),
}));

export const subtasksRelations = relations(subtasks, ({one, many}) => ({
	activity: one(activities, {
		fields: [subtasks.linkedActivityId],
		references: [activities.id]
	}),
	user: one(users, {
		fields: [subtasks.createdBy],
		references: [users.id]
	}),
	deepFocusBlocks: many(deepFocusBlocks),
}));

export const dailyTaskCompletionsRelations = relations(dailyTaskCompletions, ({one}) => ({
	user: one(users, {
		fields: [dailyTaskCompletions.userId],
		references: [users.id]
	}),
	activity: one(activities, {
		fields: [dailyTaskCompletions.activityId],
		references: [activities.id]
	}),
}));

export const taskCommentsRelations = relations(taskComments, ({one}) => ({
	activity: one(activities, {
		fields: [taskComments.activityId],
		references: [activities.id]
	}),
	user: one(users, {
		fields: [taskComments.createdBy],
		references: [users.id]
	}),
}));

export const roadblocksRelations = relations(roadblocks, ({one}) => ({
	activity: one(activities, {
		fields: [roadblocks.linkedActivityId],
		references: [activities.id]
	}),
	user: one(users, {
		fields: [roadblocks.createdBy],
		references: [users.id]
	}),
}));

export const deepFocusBlocksRelations = relations(deepFocusBlocks, ({one}) => ({
	subtask: one(subtasks, {
		fields: [deepFocusBlocks.selectedSubtaskId],
		references: [subtasks.id]
	}),
}));