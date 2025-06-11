export const ACTIVITY_STATUSES = {
  PLANNED: "planned",
  IN_PROGRESS: "in_progress", 
  COMPLETED: "completed",
  ON_HOLD: "on_hold",
  CANCELLED: "cancelled"
} as const;

export const ACTIVITY_PRIORITIES = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent"
} as const;

export const USER_ROLES = {
  USER: "user",
  ADMIN: "admin"
} as const;

export const SUBTASK_TYPES = {
  TASK: "task",
  QUICK_WIN: "quick_win",
  ROADBLOCK: "roadblock"
} as const;

export const SUBTASK_STATUSES = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  RESOLVED: "resolved"
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100
} as const;