import { Activity } from "@shared/schema";

interface PriorityFactors {
  urgency: number;      // 0-1 based on due date proximity
  importance: number;   // 0-1 based on impact and dependencies
  effort: number;       // 0-1 based on estimated duration (inverted for quick wins)
  context: number;      // 0-1 based on current time/energy context
  collaboration: number; // 0-1 based on team dependencies
}

interface SmartPriorityScore {
  score: number;
  factors: PriorityFactors;
  reasoning: string;
  suggestedTimeSlot: 'morning' | 'afternoon' | 'evening' | 'flexible';
}

export class SmartPrioritizationService {
  
  /**
   * Calculate intelligent priority score for an activity
   */
  calculateSmartPriority(activity: Activity, currentTime: Date = new Date()): SmartPriorityScore {
    const factors = this.analyzePriorityFactors(activity, currentTime);
    const score = this.calculateWeightedScore(factors);
    const reasoning = this.generateReasoning(factors, activity);
    const suggestedTimeSlot = this.suggestOptimalTimeSlot(activity, factors);

    return {
      score,
      factors,
      reasoning,
      suggestedTimeSlot
    };
  }

  /**
   * Analyze various factors that influence priority
   */
  private analyzePriorityFactors(activity: Activity, currentTime: Date): PriorityFactors {
    return {
      urgency: this.calculateUrgencyFactor(activity, currentTime),
      importance: this.calculateImportanceFactor(activity),
      effort: this.calculateEffortFactor(activity),
      context: this.calculateContextFactor(activity, currentTime),
      collaboration: this.calculateCollaborationFactor(activity)
    };
  }

  /**
   * Calculate urgency based on due date and current time
   */
  private calculateUrgencyFactor(activity: Activity, currentTime: Date): number {
    if (!activity.dueDate) return 0.3; // No due date = moderate urgency

    const dueDate = new Date(activity.dueDate);
    const timeDiff = dueDate.getTime() - currentTime.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

    if (daysDiff < 0) return 1.0; // Overdue
    if (daysDiff < 1) return 0.9; // Due today
    if (daysDiff < 3) return 0.7; // Due within 3 days
    if (daysDiff < 7) return 0.5; // Due this week
    if (daysDiff < 14) return 0.3; // Due next week
    return 0.2; // Due later
  }

  /**
   * Calculate importance based on priority and impact
   */
  private calculateImportanceFactor(activity: Activity): number {
    const priorityMap = {
      'urgent': 1.0,
      'high': 0.8,
      'normal': 0.5,
      'low': 0.3
    };

    const basePriority = priorityMap[activity.priority as keyof typeof priorityMap] || 0.5;
    
    // Boost importance for activities with many collaborators
    const collaboratorBoost = activity.collaborators && activity.collaborators.length > 0 ? 0.1 : 0;
    
    return Math.min(1.0, basePriority + collaboratorBoost);
  }

  /**
   * Calculate effort factor (lower effort = higher score for quick wins)
   */
  private calculateEffortFactor(activity: Activity): number {
    if (!activity.estimatedDuration) return 0.5;

    // Favor shorter tasks during busy periods
    if (activity.estimatedDuration <= 30) return 0.9; // Quick wins
    if (activity.estimatedDuration <= 60) return 0.7; // 1 hour tasks
    if (activity.estimatedDuration <= 120) return 0.5; // 2 hour tasks
    if (activity.estimatedDuration <= 240) return 0.3; // 4 hour tasks
    return 0.2; // Long tasks
  }

  /**
   * Calculate context factor based on time of day and activity type
   */
  private calculateContextFactor(activity: Activity, currentTime: Date): number {
    const hour = currentTime.getHours();
    const description = activity.description?.toLowerCase() || '';
    const title = activity.title?.toLowerCase() || '';
    const content = `${title} ${description}`;

    // Morning context (8-11 AM) - best for deep work
    if (hour >= 8 && hour < 11) {
      if (content.includes('planning') || content.includes('strategy') || content.includes('analysis')) {
        return 0.9;
      }
      return 0.7;
    }

    // Afternoon context (1-4 PM) - good for collaboration
    if (hour >= 13 && hour < 16) {
      if (content.includes('meeting') || content.includes('call') || content.includes('review')) {
        return 0.9;
      }
      if (activity.collaborators && activity.collaborators.length > 0) {
        return 0.8;
      }
      return 0.6;
    }

    // Evening context (4-6 PM) - good for admin tasks
    if (hour >= 16 && hour < 18) {
      if (content.includes('email') || content.includes('admin') || content.includes('update')) {
        return 0.8;
      }
      return 0.5;
    }

    return 0.5; // Default context
  }

  /**
   * Calculate collaboration factor
   */
  private calculateCollaborationFactor(activity: Activity): number {
    if (!activity.collaborators || activity.collaborators.length === 0) {
      return 0.3; // Solo work
    }

    // More collaborators = higher priority for coordination
    const collaboratorCount = activity.collaborators.length;
    if (collaboratorCount >= 3) return 0.9;
    if (collaboratorCount === 2) return 0.7;
    return 0.6; // 1 collaborator
  }

  /**
   * Calculate weighted score from all factors
   */
  private calculateWeightedScore(factors: PriorityFactors): number {
    const weights = {
      urgency: 0.3,
      importance: 0.25,
      effort: 0.2,
      context: 0.15,
      collaboration: 0.1
    };

    return (
      factors.urgency * weights.urgency +
      factors.importance * weights.importance +
      factors.effort * weights.effort +
      factors.context * weights.context +
      factors.collaboration * weights.collaboration
    );
  }

  /**
   * Generate human-readable reasoning for the priority score
   */
  private generateReasoning(factors: PriorityFactors, activity: Activity): string {
    const reasons = [];

    if (factors.urgency > 0.8) {
      reasons.push("zeer urgent vanwege deadline");
    } else if (factors.urgency > 0.6) {
      reasons.push("naderende deadline");
    }

    if (factors.importance > 0.8) {
      reasons.push("hoge impact");
    }

    if (factors.effort > 0.8) {
      reasons.push("snelle win mogelijk");
    }

    if (factors.collaboration > 0.7) {
      reasons.push("team afhankelijkheid");
    }

    if (factors.context > 0.8) {
      reasons.push("optimaal tijdstip");
    }

    if (reasons.length === 0) {
      return "Standaard prioritering";
    }

    return `Hoge prioriteit door: ${reasons.join(', ')}`;
  }

  /**
   * Suggest optimal time slot for the activity
   */
  private suggestOptimalTimeSlot(activity: Activity, factors: PriorityFactors): 'morning' | 'afternoon' | 'evening' | 'flexible' {
    const content = `${activity.title} ${activity.description || ''}`.toLowerCase();

    // Deep work in the morning
    if (content.includes('planning') || content.includes('strategy') || content.includes('analysis') || content.includes('writing')) {
      return 'morning';
    }

    // Collaborative work in the afternoon
    if (content.includes('meeting') || content.includes('call') || content.includes('review') || 
        (activity.collaborators && activity.collaborators.length > 0)) {
      return 'afternoon';
    }

    // Admin work in the evening
    if (content.includes('email') || content.includes('admin') || content.includes('update') || content.includes('filing')) {
      return 'evening';
    }

    return 'flexible';
  }

  /**
   * Batch prioritize multiple activities
   */
  prioritizeActivities(activities: Activity[]): Array<Activity & { smartPriority: SmartPriorityScore }> {
    return activities
      .map(activity => ({
        ...activity,
        smartPriority: this.calculateSmartPriority(activity)
      }))
      .sort((a, b) => b.smartPriority.score - a.smartPriority.score);
  }

  /**
   * Get personalized recommendations based on current context
   */
  getPersonalizedRecommendations(activities: Activity[], currentTime: Date = new Date()): {
    topPriority: Activity[];
    quickWins: Activity[];
    timeSlotSuggestions: {
      morning: Activity[];
      afternoon: Activity[];
      evening: Activity[];
    };
  } {
    const prioritizedActivities = this.prioritizeActivities(activities);
    
    return {
      topPriority: prioritizedActivities.slice(0, 3),
      quickWins: prioritizedActivities.filter(a => a.smartPriority.factors.effort > 0.8).slice(0, 5),
      timeSlotSuggestions: {
        morning: prioritizedActivities.filter(a => a.smartPriority.suggestedTimeSlot === 'morning').slice(0, 3),
        afternoon: prioritizedActivities.filter(a => a.smartPriority.suggestedTimeSlot === 'afternoon').slice(0, 3),
        evening: prioritizedActivities.filter(a => a.smartPriority.suggestedTimeSlot === 'evening').slice(0, 3),
      }
    };
  }
}

export const smartPrioritizationService = new SmartPrioritizationService();