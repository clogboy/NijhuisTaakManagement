import { storage } from "./storage";

interface MicrosoftCalendarEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  body?: {
    content: string;
  };
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  attendees?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
    status: {
      response: string;
    };
  }>;
  isAllDay: boolean;
}

interface CalendarSyncResult {
  events: MicrosoftCalendarEvent[];
  conflicts: string[];
  suggestions: string[];
}

export class MicrosoftCalendarService {
  private readonly graphBaseUrl = 'https://graph.microsoft.com/v1.0';

  /**
   * Get Microsoft access token for calendar access
   */
  private async getMicrosoftToken(userId: number): Promise<string | null> {
    const user = await storage.getUser(userId);
    if (!user?.microsoftId) {
      return null;
    }

    // In a real implementation, you would:
    // 1. Store refresh tokens in the database
    // 2. Use MSAL Node to get fresh access tokens
    // 3. Handle token refresh automatically
    
    // For now, we'll return null to indicate no token available
    // This would trigger the user to re-authenticate with Microsoft
    return null;
  }

  /**
   * Fetch calendar events from Microsoft Graph API
   */
  async getCalendarEvents(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<MicrosoftCalendarEvent[]> {
    const token = await this.getMicrosoftToken(userId);
    if (!token) {
      // Return empty array if no token - user needs to authenticate
      return [];
    }

    try {
      const startDateTime = startDate.toISOString();
      const endDateTime = endDate.toISOString();

      const response = await fetch(
        `${this.graphBaseUrl}/me/calendar/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.status}`);
      }

      const data = await response.json();
      return data.value || [];
    } catch (error) {
      console.error('Error fetching Microsoft calendar events:', error);
      return [];
    }
  }

  /**
   * Create a calendar event in Microsoft Calendar
   */
  async createCalendarEvent(
    userId: number,
    event: {
      title: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      location?: string;
    }
  ): Promise<MicrosoftCalendarEvent | null> {
    const token = await this.getMicrosoftToken(userId);
    if (!token) {
      return null;
    }

    try {
      const eventData = {
        subject: event.title,
        body: {
          contentType: 'text',
          content: event.description || '',
        },
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: 'UTC',
        },
        location: event.location ? {
          displayName: event.location,
        } : undefined,
      };

      const response = await fetch(`${this.graphBaseUrl}/me/calendar/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Microsoft calendar event:', error);
      return null;
    }
  }

  /**
   * Sync time blocks with Microsoft Calendar
   */
  async syncTimeBlocksToCalendar(
    userId: number,
    timeBlockIds: number[]
  ): Promise<CalendarSyncResult> {
    const conflicts: string[] = [];
    const suggestions: string[] = [];
    const events: MicrosoftCalendarEvent[] = [];

    const token = await this.getMicrosoftToken(userId);
    if (!token) {
      conflicts.push('Microsoft Calendar authentication required');
      suggestions.push('Please reconnect your Microsoft account to sync with calendar');
      return { events, conflicts, suggestions };
    }

    try {
      // Get time blocks to sync
      const timeBlocks = [];
      for (const id of timeBlockIds) {
        const block = await storage.getTimeBlock(id);
        if (block && block.blockType === 'task') {
          timeBlocks.push(block);
        }
      }

      // Create calendar events for each time block
      for (const block of timeBlocks) {
        const event = await this.createCalendarEvent(userId, {
          title: `[Time Block] ${block.title}`,
          description: block.description || `Scheduled task: ${block.title}`,
          startTime: new Date(block.startTime),
          endTime: new Date(block.endTime),
        });

        if (event) {
          events.push(event);
          suggestions.push(`Created calendar event for "${block.title}"`);
        } else {
          conflicts.push(`Failed to create calendar event for "${block.title}"`);
        }
      }

      return { events, conflicts, suggestions };
    } catch (error) {
      console.error('Error syncing to Microsoft Calendar:', error);
      conflicts.push('Error syncing with Microsoft Calendar');
      return { events, conflicts, suggestions };
    }
  }

  /**
   * Check for conflicts between time blocks and existing calendar events
   */
  async checkCalendarConflicts(
    userId: number,
    proposedTimeBlocks: Array<{
      startTime: Date;
      endTime: Date;
      title: string;
    }>
  ): Promise<{
    conflicts: Array<{
      timeBlock: string;
      conflictingEvent: string;
      conflictTime: string;
    }>;
    suggestions: string[];
  }> {
    const conflicts: Array<{
      timeBlock: string;
      conflictingEvent: string;
      conflictTime: string;
    }> = [];
    const suggestions: string[] = [];

    if (proposedTimeBlocks.length === 0) {
      return { conflicts, suggestions };
    }

    // Get date range for all proposed blocks
    const startDate = new Date(Math.min(...proposedTimeBlocks.map(b => b.startTime.getTime())));
    const endDate = new Date(Math.max(...proposedTimeBlocks.map(b => b.endTime.getTime())));

    // Fetch existing calendar events
    const calendarEvents = await this.getCalendarEvents(userId, startDate, endDate);

    // Check each proposed time block against calendar events
    for (const timeBlock of proposedTimeBlocks) {
      const blockStart = timeBlock.startTime.getTime();
      const blockEnd = timeBlock.endTime.getTime();

      for (const event of calendarEvents) {
        const eventStart = new Date(event.start.dateTime).getTime();
        const eventEnd = new Date(event.end.dateTime).getTime();

        // Check for overlap
        if (blockStart < eventEnd && blockEnd > eventStart) {
          conflicts.push({
            timeBlock: timeBlock.title,
            conflictingEvent: event.subject,
            conflictTime: `${this.formatTime(new Date(event.start.dateTime))} - ${this.formatTime(new Date(event.end.dateTime))}`,
          });
        }
      }
    }

    // Generate suggestions based on conflicts
    if (conflicts.length > 0) {
      suggestions.push(`Found ${conflicts.length} calendar conflicts - consider rescheduling these activities`);
      suggestions.push('Review your Microsoft Calendar for existing appointments');
    } else {
      suggestions.push('No calendar conflicts detected - safe to proceed with scheduling');
    }

    return { conflicts, suggestions };
  }

  /**
   * Get available time slots considering Microsoft Calendar events
   */
  async getAvailableSlots(
    userId: number,
    date: Date,
    workingHours: { start: string; end: string }
  ): Promise<Array<{
    start: Date;
    end: Date;
    duration: number;
  }>> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get calendar events for the day
    const calendarEvents = await this.getCalendarEvents(userId, startOfDay, endOfDay);
    
    // Get existing time blocks
    const timeBlocks = await storage.getTimeBlocks(userId, startOfDay, endOfDay);

    // Combine calendar events and time blocks into busy periods
    const busyPeriods = [
      ...calendarEvents.map(event => ({
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
      })),
      ...timeBlocks.map(block => ({
        start: new Date(block.startTime),
        end: new Date(block.endTime),
      })),
    ].sort((a, b) => a.start.getTime() - b.start.getTime());

    // Calculate available slots
    const availableSlots = [];
    const workStart = this.parseTime(date, workingHours.start);
    const workEnd = this.parseTime(date, workingHours.end);

    let currentTime = workStart;

    for (const busyPeriod of busyPeriods) {
      if (currentTime < busyPeriod.start) {
        const duration = Math.floor((busyPeriod.start.getTime() - currentTime.getTime()) / (1000 * 60));
        if (duration >= 15) { // Minimum 15-minute slots
          availableSlots.push({
            start: new Date(currentTime),
            end: new Date(busyPeriod.start),
            duration,
          });
        }
      }
      currentTime = new Date(Math.max(currentTime.getTime(), busyPeriod.end.getTime()));
    }

    // Add final slot if there's time remaining
    if (currentTime < workEnd) {
      const duration = Math.floor((workEnd.getTime() - currentTime.getTime()) / (1000 * 60));
      if (duration >= 15) {
        availableSlots.push({
          start: new Date(currentTime),
          end: new Date(workEnd),
          duration,
        });
      }
    }

    return availableSlots;
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private parseTime(date: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

export const microsoftCalendarService = new MicrosoftCalendarService();