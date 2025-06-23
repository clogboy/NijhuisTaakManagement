import { storage } from "./storage";
import { Activity, TimeBlock, InsertTimeBlock } from "@shared/schema";

export interface TimeSlot {
  start: Date;
  end: Date;
  duration: number; // in minutes
  isAvailable: boolean;
}

export interface SmartScheduleOptions {
  workingHours: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
  breakDuration: number; // in minutes
  minimumBlockSize: number; // in minutes
  focusTimePreferred: boolean;
  maxTasksPerDay: number;
  energyOptimized: boolean; // Schedule high-energy tasks during peak hours
  contextSwitchingMinimized: boolean; // Group similar tasks together
  deadlineAware: boolean; // Prioritize tasks with approaching deadlines
  bufferTime: number; // Buffer time between tasks in minutes
  preferredFocusBlocks: number; // Number of deep work blocks per day
}

export interface ScheduleResult {
  scheduledBlocks: TimeBlock[];
  unscheduledActivities: Activity[];
  conflicts: string[];
  suggestions: string[];
}

export class TimeBlockingService {
  private defaultOptions: SmartScheduleOptions = {
    workingHours: { start: "09:00", end: "17:00" },
    breakDuration: 15,
    minimumBlockSize: 30,
    focusTimePreferred: true,
    maxTasksPerDay: 8,
    energyOptimized: true,
    contextSwitchingMinimized: true,
    deadlineAware: true,
    bufferTime: 5,
    preferredFocusBlocks: 3
  };

  /**
   * Generate smart time blocks for activities on a given date
   */
  async generateSmartSchedule(
    userId: number, 
    date: Date, 
    activities: Activity[], 
    options?: Partial<SmartScheduleOptions>
  ): Promise<ScheduleResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Get existing time blocks for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingBlocks = await storage.getTimeBlocks(userId, startOfDay, endOfDay);
    
    // Generate available time slots
    const availableSlots = this.generateAvailableSlots(date, existingBlocks, opts);
    
    // Sort activities by priority and deadline
    const prioritizedActivities = this.prioritizeActivities(activities, opts);
    
    // Schedule activities into available slots (preview mode)
    const result = this.scheduleActivities(prioritizedActivities, availableSlots, opts, userId, false);
    
    return result;
  }

  /**
   * Generate available time slots for the day
   */
  private generateAvailableSlots(
    date: Date, 
    existingBlocks: TimeBlock[], 
    options: SmartScheduleOptions
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const workStart = this.parseTime(date, options.workingHours.start);
    const workEnd = this.parseTime(date, options.workingHours.end);
    
    // Sort existing blocks by start time
    const sortedBlocks = existingBlocks.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    
    let currentTime = workStart;
    
    for (const block of sortedBlocks) {
      const blockStart = new Date(block.startTime);
      const blockEnd = new Date(block.endTime);
      
      // Add slot before this block if there's enough time
      if (currentTime < blockStart) {
        const duration = Math.floor((blockStart.getTime() - currentTime.getTime()) / (1000 * 60));
        if (duration >= options.minimumBlockSize) {
          slots.push({
            start: new Date(currentTime),
            end: new Date(blockStart),
            duration,
            isAvailable: true
          });
        }
      }
      
      currentTime = new Date(Math.max(currentTime.getTime(), blockEnd.getTime()));
    }
    
    // Add final slot if there's time remaining
    if (currentTime < workEnd) {
      const duration = Math.floor((workEnd.getTime() - currentTime.getTime()) / (1000 * 60));
      if (duration >= options.minimumBlockSize) {
        slots.push({
          start: new Date(currentTime),
          end: new Date(workEnd),
          duration,
          isAvailable: true
        });
      }
    }
    
    return slots;
  }

  /**
   * Prioritize activities based on urgency, importance, deadlines, and smart scheduling options
   */
  private prioritizeActivities(activities: Activity[], options: SmartScheduleOptions): Activity[] {
    return activities
      .filter(activity => activity.status !== 'completed')
      .sort((a, b) => {
        // Calculate priority scores with weights
        const scoreA = this.calculateActivityScore(a, options);
        const scoreB = this.calculateActivityScore(b, options);
        
        return scoreB - scoreA; // Higher scores first
      });
  }

  /**
   * Calculate priority score for an activity based on multiple factors
   */
  private calculateActivityScore(activity: Activity, options: SmartScheduleOptions): number {
    let score = 0;
    
    // Base priority weight (40% of total score)
    const priorityWeights = { urgent: 40, normal: 20, low: 10 };
    score += priorityWeights[activity.priority as keyof typeof priorityWeights] || 10;
    
    // Deadline urgency (30% of total score)
    if (options.deadlineAware && activity.dueDate) {
      const daysUntilDue = Math.ceil((new Date(activity.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 1) score += 30; // Due today/overdue
      else if (daysUntilDue <= 3) score += 20; // Due within 3 days
      else if (daysUntilDue <= 7) score += 10; // Due within a week
    }
    
    // Estimated duration factor (20% of total score) - shorter tasks get slight boost for momentum
    const duration = activity.estimatedDuration || this.estimateDuration(activity);
    if (duration <= 30) score += 20; // Quick wins
    else if (duration <= 60) score += 15;
    else if (duration <= 120) score += 10;
    
    // Context switching penalty (10% of total score)
    if (options.contextSwitchingMinimized) {
      // This would be enhanced with ML to detect similar task types
      // For now, use simple category-based grouping
      const category = this.getTaskCategory(activity);
      // Implementation would group similar categories together
    }
    
    return score;
  }

  /**
   * Get task category for context switching optimization
   */
  private getTaskCategory(activity: Activity): string {
    const title = activity.title.toLowerCase();
    const description = activity.description?.toLowerCase() || '';
    
    if (title.includes('meeting') || title.includes('call') || title.includes('vergadering')) {
      return 'communication';
    } else if (title.includes('email') || title.includes('mail') || title.includes('contact')) {
      return 'communication';
    } else if (title.includes('document') || title.includes('report') || title.includes('write')) {
      return 'documentation';
    } else if (title.includes('review') || title.includes('check') || title.includes('analyze')) {
      return 'analysis';
    } else if (title.includes('code') || title.includes('develop') || title.includes('build')) {
      return 'development';
    } else if (title.includes('plan') || title.includes('strategy') || title.includes('design')) {
      return 'planning';
    }
    
    return 'general';
  }

  /**
   * Schedule activities into available time slots
   */
  private scheduleActivities(
    activities: Activity[], 
    availableSlots: TimeSlot[], 
    options: SmartScheduleOptions,
    userId: number,
    saveToDatabase: boolean = true
  ): ScheduleResult {
    const scheduledBlocks: TimeBlock[] = [];
    const unscheduledActivities: Activity[] = [];
    const conflicts: string[] = [];
    const suggestions: string[] = [];
    
    let remainingSlots = [...availableSlots];
    let tasksScheduledToday = 0;
    
    for (const activity of activities) {
      if (tasksScheduledToday >= options.maxTasksPerDay) {
        unscheduledActivities.push(activity);
        suggestions.push(`Consider scheduling "${activity.title}" for tomorrow to avoid overloading today`);
        continue;
      }
      
      const estimatedDuration = activity.estimatedDuration || this.estimateDuration(activity);
      const requiredDuration = estimatedDuration + (options.focusTimePreferred ? options.breakDuration : 0);
      
      // Find a suitable slot
      const suitableSlotIndex = remainingSlots.findIndex(slot => 
        slot.duration >= requiredDuration && slot.isAvailable
      );
      
      if (suitableSlotIndex === -1) {
        unscheduledActivities.push(activity);
        if (estimatedDuration > Math.max(...remainingSlots.map(s => s.duration))) {
          conflicts.push(`"${activity.title}" (${estimatedDuration}min) doesn't fit in any available slot`);
        }
        continue;
      }
      
      const slot = remainingSlots[suitableSlotIndex];
      
      // Create time block
      const endTime = new Date(slot.start.getTime() + estimatedDuration * 60 * 1000);
      const color = this.getColorForPriority(activity.priority);
      
      const timeBlock: Omit<TimeBlock, 'id' | 'createdAt' | 'updatedAt'> = {
        activityId: activity.id,
        title: activity.title,
        description: activity.description,
        startTime: slot.start,
        endTime: endTime,
        duration: estimatedDuration,
        blockType: 'task',
        isScheduled: true,
        isCompleted: false,
        priority: activity.priority,
        color: color,
        createdBy: userId
      };
      
      scheduledBlocks.push(timeBlock as TimeBlock);
      tasksScheduledToday++;
      
      // Update remaining slots
      if (slot.duration === requiredDuration) {
        // Remove the slot entirely
        remainingSlots.splice(suitableSlotIndex, 1);
      } else {
        // Split the slot
        const newStart = new Date(slot.start.getTime() + requiredDuration * 60 * 1000);
        const newDuration = slot.duration - requiredDuration;
        
        remainingSlots[suitableSlotIndex] = {
          start: newStart,
          end: slot.end,
          duration: newDuration,
          isAvailable: true
        };
      }
      
      // Add break block if focus time is preferred
      if (options.focusTimePreferred && options.breakDuration > 0) {
        const breakStart = new Date(endTime);
        const breakEnd = new Date(endTime.getTime() + options.breakDuration * 60 * 1000);
        
        const breakBlock: Omit<TimeBlock, 'id' | 'createdAt' | 'updatedAt'> = {
          activityId: null,
          title: "Break",
          description: "Scheduled break for focus and productivity",
          startTime: breakStart,
          endTime: breakEnd,
          duration: options.breakDuration,
          blockType: 'break',
          isScheduled: true,
          isCompleted: false,
          priority: 'normal',
          color: '#e5e7eb',
          createdBy: userId
        };
        
        scheduledBlocks.push(breakBlock as TimeBlock);
      }
    }
    
    // Generate productivity suggestions
    if (scheduledBlocks.length > 0) {
      suggestions.push(`Scheduled ${scheduledBlocks.filter(b => b.blockType === 'task').length} tasks with optimal spacing`);
    }
    
    if (unscheduledActivities.length > 0) {
      suggestions.push(`${unscheduledActivities.length} tasks need rescheduling - consider extending work hours or moving to another day`);
    }
    
    return {
      scheduledBlocks,
      unscheduledActivities,
      conflicts,
      suggestions
    };
  }

  /**
   * Estimate duration for activities without explicit duration
   */
  private estimateDuration(activity: Activity): number {
    // Default estimation based on priority and complexity
    const baseDuration = 60; // 1 hour default
    
    switch (activity.priority) {
      case 'urgent':
        return Math.min(baseDuration * 1.5, 120); // Max 2 hours for urgent tasks
      case 'normal':
        return baseDuration;
      case 'low':
        return baseDuration * 0.5; // 30 minutes for low priority
      default:
        return baseDuration;
    }
  }

  /**
   * Get color coding for priority levels
   */
  private getColorForPriority(priority: string): string {
    const colors = {
      urgent: '#dc2626',   // red-600
      normal: '#2563eb',   // blue-600
      low: '#16a34a'       // green-600
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  }

  /**
   * Parse time string into Date object for given date
   */
  private parseTime(date: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Auto-schedule activities with AI optimization
   */
  async autoScheduleActivities(
    userId: number,
    date: Date,
    activityIds: number[],
    options?: Partial<SmartScheduleOptions>
  ): Promise<ScheduleResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Get activities by IDs
    const allActivities = await storage.getActivities(userId, false);
    const activities = allActivities.filter(activity => activityIds.includes(activity.id));
    
    // Get existing time blocks for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingBlocks = await storage.getTimeBlocks(userId, startOfDay, endOfDay);
    
    // Generate available time slots
    const availableSlots = this.generateAvailableSlots(date, existingBlocks, opts);
    
    // Sort activities by priority and deadline
    const prioritizedActivities = this.prioritizeActivities(activities, opts);
    
    // Schedule activities into available slots and save to database
    const result = this.scheduleActivities(prioritizedActivities, availableSlots, opts, userId, true);
    
    // Save scheduled blocks to database
    for (const block of result.scheduledBlocks) {
      await storage.createTimeBlock({
        title: block.title,
        description: block.description,
        activityId: block.activityId,
        startTime: block.startTime,
        endTime: block.endTime,
        duration: block.duration,
        blockType: block.blockType,
        isScheduled: block.isScheduled,
        isCompleted: block.isCompleted,
        priority: block.priority,
        color: block.color,
        createdBy: userId
      });
    }

    return result;
  }
}

export const timeBlockingService = new TimeBlockingService();