import { storage } from './storage';
import { timeBlockingService } from './time-blocking-service';
import { categorizeActivitiesWithEisenhower, generateDailyAgenda } from './ai-service';

export class DailyScheduler {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the daily scheduler - runs at midnight
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Daily scheduler started - will run at midnight');
    
    // Calculate time until next midnight
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // Next midnight
    
    const timeUntilMidnight = midnight.getTime() - now.getTime();
    
    // Set initial timeout to midnight, then run every 24 hours
    setTimeout(() => {
      this.runDailySync();
      
      // Set up daily interval
      this.intervalId = setInterval(() => {
        this.runDailySync();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, timeUntilMidnight);
  }

  /**
   * Stop the daily scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Daily scheduler stopped');
  }

  /**
   * Manually trigger daily sync for testing
   */
  async triggerSync(userId?: number) {
    console.log('Manually triggering daily sync...');
    await this.runDailySync(userId);
  }

  /**
   * Run the daily synchronization process
   */
  private async runDailySync(specificUserId?: number) {
    try {
      console.log(`Starting daily sync at ${new Date().toISOString()}`);
      
      // Get all users or specific user
      const users = specificUserId 
        ? [await storage.getUser(specificUserId)].filter(Boolean)
        : await this.getAllActiveUsers();

      for (const user of users) {
        if (!user) continue;
        
        try {
          await this.syncUserSchedule(user.id);
          console.log(`Synced schedule for user ${user.email}`);
        } catch (error) {
          console.error(`Failed to sync user ${user.email}:`, error);
        }
      }
      
      console.log('Daily sync completed');
    } catch (error) {
      console.error('Daily sync failed:', error);
    }
  }

  /**
   * Sync schedule for a specific user
   */
  private async syncUserSchedule(userId: number) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get activities that need scheduling
    const activities = await storage.getActivities(userId, false);
    const unscheduledActivities = activities.filter(
      activity => activity.status !== 'completed' && 
      activity.status !== 'cancelled'
    );

    if (unscheduledActivities.length === 0) {
      console.log(`No activities to schedule for user ${userId}`);
      return;
    }

    // Check if there's already an agenda for tomorrow
    const existingAgenda = await storage.getDailyAgenda(userId, tomorrow);
    
    if (!existingAgenda) {
      try {
        // Generate AI-powered agenda for tomorrow
        const weeklyEthos = await storage.getWeeklyEthosByDay(userId, tomorrow.getDay());
        // Use fallback agenda generation for now
        const agenda = {
          scheduledActivities: unscheduledActivities.slice(0, 5).map(a => a.id),
          suggestions: 'Daily agenda generated automatically at midnight',
          eisenhowerMatrix: {
            urgentImportant: unscheduledActivities.filter(a => a.priority === 'urgent').slice(0, 2),
            importantNotUrgent: unscheduledActivities.filter(a => a.priority === 'normal').slice(0, 3),
            urgentNotImportant: [],
            neitherUrgentNorImportant: unscheduledActivities.filter(a => a.priority === 'low')
          }
        };
        
        // Save the generated agenda
        await storage.createDailyAgenda({
          date: tomorrow,
          eisenhowerQuadrant: 'mixed',
          scheduledActivities: agenda.scheduledActivities || [],
          aiSuggestions: agenda.suggestions,
          isGenerated: true,
          generatedAt: new Date(),
          createdBy: userId
        });
        
        console.log(`Generated agenda for user ${userId} for ${tomorrow.toDateString()}`);
      } catch (error) {
        console.log(`AI agenda generation failed for user ${userId}, using fallback`);
        
        // Fallback: Create basic agenda
        await storage.createDailyAgenda({
          date: tomorrow,
          eisenhowerQuadrant: 'mixed',
          scheduledActivities: unscheduledActivities.slice(0, 5).map(a => a.id),
          aiSuggestions: 'Review your activities and prioritize tasks for tomorrow',
          isGenerated: true,
          generatedAt: new Date(),
          createdBy: userId
        });
      }
    }

    // Auto-schedule high priority activities
    const urgentActivities = unscheduledActivities
      .filter(activity => activity.priority === 'urgent')
      .slice(0, 3); // Limit to 3 urgent tasks per day

    if (urgentActivities.length > 0) {
      try {
        await timeBlockingService.autoScheduleActivities(
          userId,
          tomorrow,
          urgentActivities.map(a => a.id),
          {
            workingHours: { start: '09:00', end: '17:00' },
            breakDuration: 15,
            minimumBlockSize: 30,
            focusTimePreferred: true,
            maxTasksPerDay: 6
          }
        );
        
        console.log(`Auto-scheduled ${urgentActivities.length} urgent activities for user ${userId}`);
      } catch (error) {
        console.error(`Auto-scheduling failed for user ${userId}:`, error);
      }
    }
  }

  /**
   * Get all active users (placeholder - implement based on your user model)
   */
  private async getAllActiveUsers(): Promise<Array<{ id: number; email: string }>> {
    // This is a simplified implementation
    // In a real system, you'd query for active users from the database
    try {
      // For now, we'll return an empty array since we don't have a way to get all users
      // In production, you'd implement: SELECT id, email FROM users WHERE active = true
      return [];
    } catch (error) {
      console.error('Failed to get active users:', error);
      return [];
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextMidnight: this.getNextMidnight(),
      currentTime: new Date().toISOString()
    };
  }

  private getNextMidnight(): string {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return midnight.toISOString();
  }
}

export const dailyScheduler = new DailyScheduler();