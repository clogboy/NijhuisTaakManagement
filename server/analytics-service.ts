import { storage } from "./storage";
import { db } from "./db";
import { activities, subtasks, dailyTaskCompletions } from "@shared/schema";
import { sql, and, gte, lte, eq, desc } from "drizzle-orm";

interface ProductivityMetrics {
  completionRate: number;
  averageTimeToComplete: number;
  totalActivitiesCompleted: number;
  urgentTasksResolved: number;
  collaborationActivity: number;
  trendData: {
    date: string;
    completed: number;
    created: number;
  }[];
}

interface TeamMetrics {
  totalUsers: number;
  activeUsers: number;
  totalActivities: number;
  completedActivities: number;
  overdueActivities: number;
  collaborativeActivities: number;
}

class AnalyticsService {
  async getUserProductivityMetrics(userId: number, days: number = 30): Promise<ProductivityMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user's activities
    const user = await storage.getUser(userId);
    if (!user) throw new Error("User not found");

    const userActivities = await storage.getActivities(userId, user.email, false);
    
    // Calculate completion rate
    const totalActivities = userActivities.length;
    const completedActivities = userActivities.filter(a => a.status === 'completed').length;
    const completionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

    // Calculate average time to complete
    const completedWithDates = userActivities.filter(a => 
      a.status === 'completed' && a.createdAt && a.updatedAt
    );
    const averageTimeToComplete = completedWithDates.length > 0 
      ? completedWithDates.reduce((acc, activity) => {
          const timeDiff = activity.updatedAt.getTime() - activity.createdAt.getTime();
          return acc + (timeDiff / (1000 * 60 * 60 * 24)); // Convert to days
        }, 0) / completedWithDates.length
      : 0;

    // Count urgent tasks resolved
    const urgentTasksResolved = userActivities.filter(a => 
      a.status === 'completed' && a.priority === 'urgent'
    ).length;

    // Count collaborative activities
    const collaborationActivity = userActivities.filter(a => 
      a.participants && a.participants.length > 1
    ).length;

    // Generate trend data for the last 14 days
    const trendData = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const created = userActivities.filter(a => 
        a.createdAt.toISOString().split('T')[0] === dateStr
      ).length;
      
      const completed = userActivities.filter(a => 
        a.status === 'completed' && 
        a.updatedAt.toISOString().split('T')[0] === dateStr
      ).length;

      trendData.push({ date: dateStr, created, completed });
    }

    return {
      completionRate: Math.round(completionRate * 100) / 100,
      averageTimeToComplete: Math.round(averageTimeToComplete * 100) / 100,
      totalActivitiesCompleted: completedActivities,
      urgentTasksResolved,
      collaborationActivity,
      trendData
    };
  }

  async getTeamMetrics(): Promise<TeamMetrics> {
    // Get all users
    const allUsers = await storage.getAllUsers();
    const totalUsers = allUsers.length;

    // Get active users (users who have created activities in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivities = await db.select()
      .from(activities)
      .where(gte(activities.createdAt, thirtyDaysAgo));

    const activeUserIds = new Set(recentActivities.map(a => a.createdBy));
    const activeUsers = activeUserIds.size;

    // Get activity statistics
    const allActivities = await db.select().from(activities);
    const totalActivities = allActivities.length;
    const completedActivities = allActivities.filter(a => a.status === 'completed').length;
    
    // Calculate overdue activities
    const now = new Date();
    const overdueActivities = allActivities.filter(a => 
      a.dueDate && a.dueDate < now && a.status !== 'completed'
    ).length;

    // Count collaborative activities (activities with multiple participants)
    const collaborativeActivities = allActivities.filter(a => 
      a.participants && a.participants.length > 1
    ).length;

    return {
      totalUsers,
      activeUsers,
      totalActivities,
      completedActivities,
      overdueActivities,
      collaborativeActivities
    };
  }

  async getROIMetrics(): Promise<{
    timesSaved: number;
    efficiencyGain: number;
    collaborationImprovement: number;
    deadlineCompliance: number;
  }> {
    const allActivities = await db.select().from(activities);
    
    // Calculate estimated times saved through AI suggestions and automation
    const activitiesWithEstimatedDuration = allActivities.filter(a => a.estimatedDuration);
    const totalEstimatedTime = activitiesWithEstimatedDuration.reduce((sum, a) => sum + (a.estimatedDuration || 0), 0);
    
    // Assume 15% time savings through smart scheduling and prioritization
    const timesSaved = Math.round(totalEstimatedTime * 0.15 / 60); // Convert to hours

    // Calculate efficiency gain based on completion rates
    const completedOnTime = allActivities.filter(a => 
      a.status === 'completed' && 
      (!a.dueDate || a.updatedAt <= a.dueDate)
    ).length;
    const totalWithDeadlines = allActivities.filter(a => a.dueDate).length;
    const deadlineCompliance = totalWithDeadlines > 0 ? (completedOnTime / totalWithDeadlines) * 100 : 100;

    // Collaboration improvement based on multi-participant activities
    const collaborativeActivities = allActivities.filter(a => 
      a.participants && a.participants.length > 1
    ).length;
    const collaborationImprovement = allActivities.length > 0 ? (collaborativeActivities / allActivities.length) * 100 : 0;

    // Overall efficiency gain estimation
    const efficiencyGain = Math.min(25, (deadlineCompliance / 100) * 25); // Cap at 25%

    return {
      timesSaved,
      efficiencyGain: Math.round(efficiencyGain * 100) / 100,
      collaborationImprovement: Math.round(collaborationImprovement * 100) / 100,
      deadlineCompliance: Math.round(deadlineCompliance * 100) / 100
    };
  }
}

export const analyticsService = new AnalyticsService();