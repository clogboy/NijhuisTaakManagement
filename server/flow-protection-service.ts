import { FlowStrategy } from "@shared/schema";

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
        strategyName: "Morning Peak Performance",
        description: "Optimized for high energy and focus in early morning hours. Deep work scheduled 7-11 AM with minimal interruptions.",
        workingHours: {
          start: "07:00",
          end: "17:00",
          peakStart: "07:00",
          peakEnd: "11:00"
        },
        maxTaskSwitches: 2,
        focusBlockDuration: 180, // 3 hours
        breakDuration: 15,
        preferredTaskTypes: ["deep_work", "analysis", "planning"],
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
        strategyName: "Evening Focus Flow",
        description: "Peak performance in late afternoon and evening. Morning reserved for lighter tasks and collaboration.",
        workingHours: {
          start: "10:00",
          end: "20:00",
          peakStart: "14:00",
          peakEnd: "19:00"
        },
        maxTaskSwitches: 3,
        focusBlockDuration: 150,
        breakDuration: 20,
        preferredTaskTypes: ["deep_work", "creative", "problem_solving"],
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
        strategyName: "Consistent Energy Distribution",
        description: "Maintains steady energy throughout the day. Balances deep work with regular collaboration and administrative tasks.",
        workingHours: {
          start: "08:00",
          end: "18:00",
          peakStart: "09:00",
          peakEnd: "16:00"
        },
        maxTaskSwitches: 4,
        focusBlockDuration: 90,
        breakDuration: 15,
        preferredTaskTypes: ["deep_work", "collaboration", "admin"],
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
        strategyName: "High-Intensity Bursts",
        description: "Alternates between intense focus periods and recovery breaks. Ideal for project-based work with clear deadlines.",
        workingHours: {
          start: "08:00",
          end: "17:00",
          peakStart: "09:00",
          peakEnd: "12:00"
        },
        maxTaskSwitches: 2,
        focusBlockDuration: 120,
        breakDuration: 30,
        preferredTaskTypes: ["deep_work", "project_work", "problem_solving"],
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
        strategyName: "Team-Centric Flow",
        description: "Optimized for team coordination and communication. Balances individual work with frequent collaboration.",
        workingHours: {
          start: "08:30",
          end: "17:30",
          peakStart: "10:00",
          peakEnd: "15:00"
        },
        maxTaskSwitches: 5,
        focusBlockDuration: 60,
        breakDuration: 10,
        preferredTaskTypes: ["collaboration", "communication", "coordination"],
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
        strategyName: "Context-Aware Flexibility",
        description: "Adapts flow based on workload and energy levels. Includes low-stimulus mode for challenging days.",
        workingHours: {
          start: "08:00",
          end: "18:00",
          peakStart: "09:00",
          peakEnd: "15:00"
        },
        maxTaskSwitches: 3,
        focusBlockDuration: 90,
        breakDuration: 15,
        preferredTaskTypes: ["adaptive", "mixed", "responsive"],
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
}

export const flowProtectionService = new FlowProtectionService();