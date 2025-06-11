import { storage } from "./storage";
import { microsoftCalendarService } from "./microsoft-calendar-service";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'deadline' | 'time_block' | 'microsoft' | 'meeting';
  activityId?: number;
  status?: string;
  priority?: string;
  description?: string;
  location?: string;
  participants?: string[];
  isEditable: boolean;
}

export class CalendarService {
  /**
   * Get all calendar events for a user within a date range
   */
  async getCalendarEvents(
    userId: number,
    startDate: Date = new Date(),
    endDate: Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  ): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    try {
      // Get activities with deadlines
      const activities = await storage.getActivities(userId, false);
      const activitiesWithDeadlines = activities.filter(activity => activity.deadline);
      
      for (const activity of activitiesWithDeadlines) {
        if (activity.deadline && activity.deadline >= startDate && activity.deadline <= endDate) {
          events.push({
            id: `deadline-${activity.id}`,
            title: `📅 ${activity.title}`,
            start: activity.deadline,
            end: activity.deadline,
            type: 'deadline',
            activityId: activity.id,
            status: activity.status,
            priority: activity.priority,
            description: activity.description,
            isEditable: true,
          });
        }
      }

      // Get time blocks
      const timeBlocks = await storage.getTimeBlocks(userId, startDate, endDate);
      for (const block of timeBlocks) {
        if (block.startTime >= startDate && block.endTime <= endDate) {
          events.push({
            id: `block-${block.id}`,
            title: `⏰ ${block.title}`,
            start: block.startTime,
            end: block.endTime,
            type: 'time_block',
            activityId: block.activityId,
            status: block.status,
            description: block.description,
            location: block.location,
            isEditable: true,
          });
        }
      }

      // Get Microsoft Calendar events if integration is set up
      try {
        const microsoftEvents = await microsoftCalendarService.getCalendarEvents(userId, startDate, endDate);
        for (const event of microsoftEvents) {
          events.push({
            id: `microsoft-${event.id}`,
            title: `🔗 ${event.subject}`,
            start: new Date(event.start.dateTime),
            end: new Date(event.end.dateTime),
            type: 'microsoft',
            description: event.body?.content,
            location: event.location?.displayName,
            participants: event.attendees?.map(a => a.emailAddress.address) || [],
            isEditable: false,
          });
        }
      } catch (error) {
        console.log('Microsoft Calendar integration not configured or failed:', error.message);
      }

    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }

    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * Create a deadline by updating an activity or creating a new one
   */
  async createDeadline(
    userId: number,
    data: {
      title: string;
      description?: string;
      deadline: Date;
      activityId?: number;
      priority?: string;
    }
  ): Promise<any> {
    if (data.activityId) {
      // Update existing activity with deadline
      return await storage.updateActivity(data.activityId, {
        deadline: data.deadline,
        priority: data.priority || 'medium',
      });
    } else {
      // Create new activity with deadline
      return await storage.createActivity({
        title: data.title,
        description: data.description || '',
        status: 'active',
        priority: data.priority || 'medium',
        deadline: data.deadline,
        createdBy: userId,
      });
    }
  }

  /**
   * Check for conflicts between time blocks and calendar events
   */
  async checkConflicts(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{
    conflicts: Array<{
      timeBlock: any;
      conflictingEvent: CalendarEvent;
      overlapMinutes: number;
    }>;
    suggestions: string[];
  }> {
    const conflicts: any[] = [];
    const suggestions: string[] = [];

    try {
      const allEvents = await this.getCalendarEvents(userId, startDate, endDate);
      const timeBlocks = allEvents.filter(e => e.type === 'time_block');
      const otherEvents = allEvents.filter(e => e.type !== 'time_block');

      for (const timeBlock of timeBlocks) {
        for (const event of otherEvents) {
          const overlap = this.calculateOverlap(timeBlock.start, timeBlock.end, event.start, event.end);
          if (overlap > 0) {
            conflicts.push({
              timeBlock,
              conflictingEvent: event,
              overlapMinutes: overlap,
            });
          }
        }
      }

      if (conflicts.length > 0) {
        suggestions.push(`Found ${conflicts.length} scheduling conflicts`);
        suggestions.push('Consider rescheduling conflicting time blocks');
        suggestions.push('Review Microsoft Calendar for availability');
      }

    } catch (error) {
      console.error('Error checking conflicts:', error);
    }

    return { conflicts, suggestions };
  }

  /**
   * Get available time slots for scheduling
   */
  async getAvailableSlots(
    userId: number,
    date: Date,
    durationMinutes: number = 60,
    workingHours: { start: number; end: number } = { start: 9, end: 17 }
  ): Promise<Array<{ start: Date; end: Date }>> {
    const slots: Array<{ start: Date; end: Date }> = [];

    try {
      const dayStart = new Date(date);
      dayStart.setHours(workingHours.start, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(workingHours.end, 0, 0, 0);

      // Get all events for the day
      const events = await this.getCalendarEvents(userId, dayStart, dayEnd);
      
      // Sort events by start time
      events.sort((a, b) => a.start.getTime() - b.start.getTime());

      let currentTime = dayStart;

      for (const event of events) {
        // Check if there's a gap before this event
        const gapMinutes = (event.start.getTime() - currentTime.getTime()) / (1000 * 60);
        
        if (gapMinutes >= durationMinutes) {
          const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60 * 1000);
          if (slotEnd <= event.start) {
            slots.push({
              start: new Date(currentTime),
              end: slotEnd,
            });
          }
        }

        // Move current time to end of this event
        currentTime = new Date(Math.max(currentTime.getTime(), event.end.getTime()));
      }

      // Check for slot at end of day
      const finalGapMinutes = (dayEnd.getTime() - currentTime.getTime()) / (1000 * 60);
      if (finalGapMinutes >= durationMinutes) {
        slots.push({
          start: new Date(currentTime),
          end: new Date(currentTime.getTime() + durationMinutes * 60 * 1000),
        });
      }

    } catch (error) {
      console.error('Error getting available slots:', error);
    }

    return slots;
  }

  /**
   * Sync calendar data and provide insights
   */
  async syncAndAnalyze(userId: number): Promise<{
    totalEvents: number;
    upcomingDeadlines: number;
    scheduledHours: number;
    conflicts: number;
    suggestions: string[];
  }> {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events = await this.getCalendarEvents(userId, now, weekFromNow);
    const conflictCheck = await this.checkConflicts(userId, now, weekFromNow);

    const upcomingDeadlines = events.filter(e => 
      e.type === 'deadline' && e.start >= now
    ).length;

    const scheduledHours = events
      .filter(e => e.type === 'time_block')
      .reduce((total, event) => {
        const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60);
        return total + duration;
      }, 0);

    const suggestions = [
      `You have ${upcomingDeadlines} upcoming deadlines this week`,
      `${scheduledHours.toFixed(1)} hours of time blocks scheduled`,
      ...conflictCheck.suggestions,
    ];

    return {
      totalEvents: events.length,
      upcomingDeadlines,
      scheduledHours: Math.round(scheduledHours * 10) / 10,
      conflicts: conflictCheck.conflicts.length,
      suggestions,
    };
  }

  /**
   * Calculate overlap between two time periods in minutes
   */
  private calculateOverlap(start1: Date, end1: Date, start2: Date, end2: Date): number {
    const overlapStart = Math.max(start1.getTime(), start2.getTime());
    const overlapEnd = Math.min(end1.getTime(), end2.getTime());
    
    if (overlapStart >= overlapEnd) return 0;
    
    return (overlapEnd - overlapStart) / (1000 * 60);
  }
}

export const calendarService = new CalendarService();