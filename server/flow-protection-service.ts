import type { FlowStrategy } from "@shared/schema";

interface PersonalityPreset {
  personalityType: string;
  strategyName: string;
  description: string;
  workingHours: {
    start: string;
    end: string;
    peakStart: string;
    peakEnd: string;
  };
  maxTaskSwitches: number;
  focusBlockDuration: number;
  breakDuration: number;
  preferredTaskTypes: string[];
  energyPattern: {
    morning: number;
    afternoon: number;
    evening: number;
  };
  notificationSettings: {
    allowInterruptions: boolean;
    urgentOnly: boolean;
    quietHours: { start: string; end: string };
  };
}

export class FlowProtectionService {

  /**
   * Get predefined personality-based flow strategies
   */
  getPersonalityPresets(): PersonalityPreset[] {
    return [
      {
        personalityType: "early_bird",
        strategyName: "Vroege Vogel",
        description: "Geoptimaliseerd voor hoge energie en focus in de vroege ochtenduren. Diep werk gepland 7-11 uur met minimale onderbrekingen.",
        workingHours: {
          start: "07:00",
          end: "17:00",
          peakStart: "07:00",
          peakEnd: "11:00"
        },
        maxTaskSwitches: 2,
        focusBlockDuration: 180, // 3 hours
        breakDuration: 15,
        preferredTaskTypes: ["diep werk", "analyse", "planning"],
        energyPattern: {
          morning: 0.95,
          afternoon: 0.65,
          evening: 0.40
        },
        notificationSettings: {
          allowInterruptions: false,
          urgentOnly: true,
          quietHours: { start: "07:00", end: "11:00" }
        }
      },

      {
        personalityType: "night_owl",
        strategyName: "Nachtbraker",
        description: "Piek prestaties in de late middag en avond. Ochtend gereserveerd voor lichtere taken en samenwerking.",
        workingHours: {
          start: "10:00",
          end: "20:00",
          peakStart: "14:00",
          peakEnd: "19:00"
        },
        maxTaskSwitches: 3,
        focusBlockDuration: 150,
        breakDuration: 20,
        preferredTaskTypes: ["diep werk", "creatief", "probleem oplossen"],
        energyPattern: {
          morning: 0.45,
          afternoon: 0.75,
          evening: 0.90
        },
        notificationSettings: {
          allowInterruptions: false,
          urgentOnly: true,
          quietHours: { start: "14:00", end: "19:00" }
        }
      },

      {
        personalityType: "steady_pacer",
        strategyName: "Stabiele Pacer",
        description: "Houdt stabiele energie gedurende de hele dag. Balanceert diep werk met regelmatige samenwerking en administratieve taken.",
        workingHours: {
          start: "08:00",
          end: "18:00",
          peakStart: "09:00",
          peakEnd: "16:00"
        },
        maxTaskSwitches: 4,
        focusBlockDuration: 90,
        breakDuration: 15,
        preferredTaskTypes: ["diep werk", "samenwerking", "administratief"],
        energyPattern: {
          morning: 0.75,
          afternoon: 0.80,
          evening: 0.70
        },
        notificationSettings: {
          allowInterruptions: true,
          urgentOnly: false,
          quietHours: { start: "09:00", end: "12:00" }
        }
      },

      {
        personalityType: "sprint_recover",
        strategyName: "Sprint Herstel",
        description: "Wisselt tussen intense focusperiodes en herstelonderbrekingen. Ideaal voor projectgebaseerd werk met duidelijke deadlines.",
        workingHours: {
          start: "08:00",
          end: "17:00",
          peakStart: "09:00",
          peakEnd: "12:00"
        },
        maxTaskSwitches: 2,
        focusBlockDuration: 120,
        breakDuration: 30,
        preferredTaskTypes: ["diep werk", "project werk", "probleem oplossen"],
        energyPattern: {
          morning: 0.90,
          afternoon: 0.60,
          evening: 0.80
        },
        notificationSettings: {
          allowInterruptions: false,
          urgentOnly: true,
          quietHours: { start: "09:00", end: "12:00" }
        }
      },

      {
        personalityType: "collaborative",
        strategyName: "Team Gerichte Flow",
        description: "Geoptimaliseerd voor teamcoördinatie en communicatie. Balanceert individueel werk met frequente samenwerking.",
        workingHours: {
          start: "08:30",
          end: "17:30",
          peakStart: "10:00",
          peakEnd: "15:00"
        },
        maxTaskSwitches: 5,
        focusBlockDuration: 60,
        breakDuration: 10,
        preferredTaskTypes: ["samenwerking", "communicatie", "coördinatie"],
        energyPattern: {
          morning: 0.70,
          afternoon: 0.85,
          evening: 0.65
        },
        notificationSettings: {
          allowInterruptions: true,
          urgentOnly: false,
          quietHours: { start: "10:00", end: "11:30" }
        }
      },

      {
        personalityType: "adaptive",
        strategyName: "Adaptieve Flexibiliteit",
        description: "Past flow aan op basis van werkdruk en energieniveaus. Bevat lage-stimulus modus voor uitdagende dagen.",
        workingHours: {
          start: "08:00",
          end: "18:00",
          peakStart: "09:00",
          peakEnd: "15:00"
        },
        maxTaskSwitches: 3,
        focusBlockDuration: 90,
        breakDuration: 15,
        preferredTaskTypes: ["adaptief", "gemengd", "responsief"],
        energyPattern: {
          morning: 0.75,
          afternoon: 0.70,
          evening: 0.60
        },
        notificationSettings: {
          allowInterruptions: true,
          urgentOnly: false,
          quietHours: { start: "09:00", end: "11:00" }
        }
      }
    ];
  }

  /**
   * Get flow recommendations based on current time and strategy
   */
  getFlowRecommendations(strategy: FlowStrategy, currentTime: Date = new Date()): {
    shouldFocus: boolean;
    suggestedTaskTypes: string[];
    allowInterruptions: boolean;
    energyLevel: number;
    timeSlotType: 'peak' | 'productive' | 'low-energy';
    recommendation: string;
  } {
    const hour = currentTime.getHours();
    const timeString = `${hour.toString().padStart(2, '0')}:00`;

    const workingHours = strategy.workingHours as any;
    const energyPattern = strategy.energyPattern as any;
    const notificationSettings = strategy.notificationSettings as any;

    // Determine if current time is in peak hours
    const isPeakTime = this.isTimeInRange(timeString, workingHours.peakStart, workingHours.peakEnd);
    const isQuietHours = this.isTimeInRange(timeString, notificationSettings.quietHours.start, notificationSettings.quietHours.end);

    // Calculate energy level based on time of day
    let energyLevel = 0.5;
    if (hour >= 6 && hour < 12) {
      energyLevel = energyPattern.morning;
    } else if (hour >= 12 && hour < 18) {
      energyLevel = energyPattern.afternoon;
    } else if (hour >= 18 && hour < 22) {
      energyLevel = energyPattern.evening;
    }

    // Determine time slot type
    let timeSlotType: 'peak' | 'productive' | 'low-energy';
    if (isPeakTime && energyLevel > 0.8) {
      timeSlotType = 'peak';
    } else if (energyLevel > 0.6) {
      timeSlotType = 'productive';
    } else {
      timeSlotType = 'low-energy';
    }

    // Generate recommendations
    const shouldFocus = isPeakTime || (energyLevel > 0.7);
    const allowInterruptions = !isQuietHours && (notificationSettings.allowInterruptions || !shouldFocus);

    let suggestedTaskTypes = strategy.preferredTaskTypes || [];
    let recommendation = '';

    if (timeSlotType === 'peak') {
      suggestedTaskTypes = ['deep_work', 'analysis', 'planning'];
      recommendation = 'Peak performance time - focus on your most challenging tasks';
    } else if (timeSlotType === 'productive') {
      suggestedTaskTypes = ['collaboration', 'communication', 'admin'];
      recommendation = 'Good energy for collaborative work and communication';
    } else {
      suggestedTaskTypes = ['admin', 'email', 'planning'];
      recommendation = 'Lower energy period - handle lighter administrative tasks';
    }

    return {
      shouldFocus,
      suggestedTaskTypes,
      allowInterruptions,
      energyLevel,
      timeSlotType,
      recommendation
    };
  }

  /**
   * Generate low-stimulus mode settings
   */
  getLowStimulusMode(): Partial<FlowStrategy> {
    return {
      maxTaskSwitches: 1,
      focusBlockDuration: 45, // Shorter blocks
      breakDuration: 10,
      preferredTaskTypes: ['simple', 'routine', 'low-cognitive'],
      notificationSettings: {
        allowInterruptions: false,
        urgentOnly: true,
        quietHours: { start: "09:00", end: "17:00" }
      }
    };
  }

  /**
   * Assess personality type based on work patterns
   */
  assessPersonalityType(workPatterns: {
    preferredStartTime: string;
    mostProductiveHours: string[];
    taskSwitchTolerance: number;
    collaborationPreference: number; // 1-5 scale
    energyFluctuations: 'high' | 'medium' | 'low';
  }): string {
    const startHour = parseInt(workPatterns.preferredStartTime.split(':')[0]);
    const avgProductiveHour = workPatterns.mostProductiveHours
      .map(time => parseInt(time.split(':')[0]))
      .reduce((a, b) => a + b, 0) / workPatterns.mostProductiveHours.length;

    // Early bird detection
    if (startHour <= 7 && avgProductiveHour <= 10) {
      return 'early_bird';
    }

    // Night owl detection
    if (startHour >= 10 && avgProductiveHour >= 14) {
      return 'night_owl';
    }

    // Sprint/recover pattern
    if (workPatterns.energyFluctuations === 'high' && workPatterns.taskSwitchTolerance <= 2) {
      return 'sprint_recover';
    }

    // Collaborative type
    if (workPatterns.collaborationPreference >= 4 && workPatterns.taskSwitchTolerance >= 4) {
      return 'collaborative';
    }

    // Steady pacer (default for balanced patterns)
    if (workPatterns.energyFluctuations === 'low' || workPatterns.energyFluctuations === 'medium') {
      return 'steady_pacer';
    }

    return 'adaptive';
  }

  private isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    if (start <= end) {
      return current >= start && current <= end;
    } else {
      // Handle overnight ranges
      return current >= start || current <= end;
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  async getUserConfig(userId: number) {
    return {
      currentStrategy: "Deep Focus Strategy",
      isActive: true
    };
  }
}

export const flowProtectionService = new FlowProtectionService();

export class TimeBlockingService {
  private timeBlocks: Map<number, any[]> = new Map();

  constructor() {
    this.timeBlocks.set(1, []);
  }

  async createTimeBlock(userId: number, blockData: any): Promise<any> {
    const timeBlock = {
      id: Date.now(),
      userId,
      title: blockData.title,
      description: blockData.description,
      startTime: blockData.startTime,
      endTime: blockData.endTime,
      date: blockData.date,
      activityId: blockData.activityId,
      status: 'scheduled',
      createdAt: new Date(),
    };

    if (!this.timeBlocks.has(userId)) {
      this.timeBlocks.set(userId, []);
    }
    this.timeBlocks.get(userId)!.push(timeBlock);

    return timeBlock;
  }

  async getUserTimeBlocks(userId: number, date?: string): Promise<any[]> {
    const userBlocks = this.timeBlocks.get(userId) || [];

    if (date) {
      return userBlocks.filter(block => block.date === date);
    }

    return userBlocks;
  }

  async updateTimeBlock(blockId: number, updates: any): Promise<any> {
    for (const [userId, blocks] of this.timeBlocks.entries()) {
      const blockIndex = blocks.findIndex(b => b.id === blockId);
      if (blockIndex !== -1) {
        blocks[blockIndex] = { ...blocks[blockIndex], ...updates };
        return blocks[blockIndex];
      }
    }
    throw new Error('Time block not found');
  }

  async deleteTimeBlock(blockId: number): Promise<void> {
    for (const [userId, blocks] of this.timeBlocks.entries()) {
      const blockIndex = blocks.findIndex(b => b.id === blockId);
      if (blockIndex !== -1) {
        blocks.splice(blockIndex, 1);
        return;
      }
    }
    throw new Error('Time block not found');
  }
}

export const timeBlockingService = new TimeBlockingService();