import { Activity, DeepFocusSession } from "@shared/schema";
import { storage } from "./storage";
// Simple AI responses for deep focus recommendations
const generateAIResponse = async (prompt: string): Promise<string> => {
  // Fallback to default recommendations if AI is not available
  return JSON.stringify({
    enteringAdvice: "Zorg voor een rustige werkplek zonder afleiding. Begin met de meest uitdagende taak.",
    exitingAdvice: "Neem een korte pauze om je gedachten te ordenen. Noteer belangrijke inzichten.",
    optimalDuration: 25,
    focusTips: [
      "Zet je telefoon in vliegtuigmodus",
      "Gebruik noise-cancelling koptelefoon als nodig", 
      "Houd een glas water binnen handbereik"
    ]
  });
};

interface DeepFocusRecommendations {
  recommendedTasks: Activity[];
  enteringFocusAdvice: string;
  exitingFocusAdvice: string;
  optimalDuration: number;
  recommendations: string[];
}

class DeepFocusService {
  async getRecommendationsForUser(userId: number, userEmail: string, isAdmin: boolean): Promise<DeepFocusRecommendations> {
    try {
      // Get user's activities
      const activities = await storage.getActivities(userId, userEmail, isAdmin);
      
      // Filter activities suitable for deep focus
      const suitableActivities = activities.filter(activity => 
        activity.status === 'pending' && 
        activity.estimatedDuration && 
        activity.estimatedDuration >= 20 &&
        (activity.priority === 'high' ||
         activity.description?.toLowerCase().includes('focus') ||
         activity.description?.toLowerCase().includes('analysis') ||
         activity.description?.toLowerCase().includes('design') ||
         activity.description?.toLowerCase().includes('review'))
      );

      // Get recent focus sessions for context
      const recentSessions = await storage.getDeepFocusSessions(userId);
      const completedSessions = recentSessions.filter(s => s.status === 'completed').slice(0, 5);

      // Generate AI recommendations
      const recommendations = await this.generateAIRecommendations(
        suitableActivities, 
        completedSessions
      );

      return {
        recommendedTasks: suitableActivities.slice(0, 5),
        enteringFocusAdvice: recommendations.enteringAdvice,
        exitingFocusAdvice: recommendations.exitingAdvice,
        optimalDuration: recommendations.optimalDuration,
        recommendations: recommendations.focusTips
      };
    } catch (error) {
      console.error('Error generating deep focus recommendations:', error);
      
      // Fallback recommendations
      return this.getFallbackRecommendations();
    }
  }

  private async generateAIRecommendations(
    activities: Activity[], 
    recentSessions: DeepFocusSession[]
  ): Promise<{
    enteringAdvice: string;
    exitingAdvice: string;
    optimalDuration: number;
    focusTips: string[];
  }> {
    const prompt = `
Based on the following user data, provide deep focus recommendations:

AVAILABLE TASKS:
${activities.map(a => `- ${a.title}: ${a.description} (Priority: ${a.priority}, Estimated: ${a.estimatedDuration} min)`).join('\n')}

RECENT FOCUS SESSIONS:
${recentSessions.map(s => `- Duration: ${s.actualDuration || s.plannedDuration} min, Success: ${s.completedSuccessfully}, Interruptions: ${s.interruptionCount}`).join('\n')}

Please provide JSON response with:
{
  "enteringAdvice": "Brief advice for entering deep focus based on their task types",
  "exitingAdvice": "Brief advice for transitioning out of deep focus",
  "optimalDuration": "Recommended session length in minutes (15-90)",
  "focusTips": ["tip1", "tip2", "tip3"] - 3 practical tips for maintaining focus
}

Focus on practical, actionable advice in Dutch. Keep it professional and concise.
    `;

    try {
      const response = await generateAIResponse(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('AI recommendation generation failed:', error);
      return this.getDefaultRecommendations();
    }
  }

  private getFallbackRecommendations(): DeepFocusRecommendations {
    return {
      recommendedTasks: [],
      enteringFocusAdvice: "Kies een complexe taak die focus vereist. Zorg voor een rustige omgeving zonder afleiding.",
      exitingFocusAdvice: "Neem een korte pauze en reflecteer op wat je hebt bereikt. Plan je volgende stappen.",
      optimalDuration: 25,
      recommendations: [
        "Schakel notificaties uit tijdens je focus sessie",
        "Gebruik de pomodoro techniek voor optimale concentratie", 
        "Houd water en gezonde snacks binnen handbereik"
      ]
    };
  }

  private getDefaultRecommendations() {
    return {
      enteringAdvice: "Zorg voor een rustige werkplek zonder afleiding. Begin met de meest uitdagende taak.",
      exitingAdvice: "Neem een korte pauze om je gedachten te ordenen. Noteer belangrijke inzichten.",
      optimalDuration: 25,
      focusTips: [
        "Zet je telefoon in vliegtuigmodus",
        "Gebruik noise-cancelling koptelefoon als nodig",
        "Houd een glas water binnen handbereik"
      ]
    };
  }

  async startFocusSession(
    userId: number, 
    taskId: number, 
    duration: number
  ): Promise<DeepFocusSession> {
    // Check if user has an active session
    const activeSession = await storage.getActiveDeepFocusSession(userId);
    if (activeSession) {
      throw new Error('Er is al een actieve focus sessie. Beëindig eerst de huidige sessie.');
    }

    // Generate recommendations for this specific session
    const recommendations = await this.generateSessionRecommendations(taskId, duration);

    const session = await storage.createDeepFocusSession({
      userId,
      taskId,
      plannedDuration: duration,
      startTime: new Date(),
      status: 'active',
      recommendations: recommendations,
      wasInterrupted: false,
      interruptionCount: 0,
      pausedDuration: 0
    });

    return session;
  }

  private async generateSessionRecommendations(taskId: number, duration: number): Promise<string[]> {
    const task = await storage.getActivity(taskId);
    if (!task) return [];

    const baseRecommendations = [
      "Concentreer je volledig op deze ene taak",
      "Vermijd multitasking tijdens deze sessie",
      "Neem korte pauzes als je je concentratie voelt afnemen"
    ];

    // Add task-specific recommendations
    if (task.priority === 'high') {
      baseRecommendations.push("Deze taak heeft hoge prioriteit - geef je beste energie");
    }

    if (duration >= 45) {
      baseRecommendations.push("Lange sessie - plan een korte pauze halverwege");
    }

    if (task.description?.toLowerCase().includes('analyse') || 
        task.description?.toLowerCase().includes('review')) {
      baseRecommendations.push("Analytisch werk - houd pen en papier bij de hand voor notities");
    }

    return baseRecommendations.slice(0, 4);
  }

  async endFocusSession(
    sessionId: number, 
    userId: number, 
    completedSuccessfully: boolean = true
  ): Promise<DeepFocusSession> {
    const session = await storage.getActiveDeepFocusSession(userId);
    if (!session || session.id !== sessionId) {
      throw new Error('Geen actieve focus sessie gevonden');
    }

    // Calculate actual duration
    const startTime = new Date(session.startTime);
    const endTime = new Date();
    const actualDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    return await storage.endDeepFocusSession(sessionId, completedSuccessfully, actualDuration);
  }

  async pauseSession(sessionId: number, userId: number): Promise<DeepFocusSession> {
    return await storage.updateDeepFocusSession(sessionId, {
      status: 'paused'
    });
  }

  async resumeSession(sessionId: number, userId: number): Promise<DeepFocusSession> {
    return await storage.updateDeepFocusSession(sessionId, {
      status: 'active'
    });
  }
}

export const deepFocusService = new DeepFocusService();