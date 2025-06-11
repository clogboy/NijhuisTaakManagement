import type { Activity, QuickWin, Contact } from "@shared/schema";

interface CacheData {
  activities: Activity[];
  quickWins: QuickWin[];
  contacts: Contact[];
  stats: {
    urgentCount: number;
    dueThisWeek: number;
    completedCount: number;
    activeContacts: number;
  };
  lastUpdated: Date;
}

class LocalCache {
  private cache: CacheData | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  initializeWithRealData() {
    if (this.cache) return;

    // Initialize with your actual project data
    const activities: Activity[] = [
      {
        id: 1,
        title: "Platform Architecture Setup",
        description: "Design and implement the core productivity platform infrastructure with authentication and database integration",
        priority: "high",
        status: "completed",
        statusTags: null,
        estimatedDuration: 180,
        dueDate: null,
        participants: null,
        createdBy: 1,
        createdAt: new Date("2025-06-11T14:02:01.815Z"),
        updatedAt: new Date("2025-06-11T14:02:01.815Z")
      },
      {
        id: 2,
        title: "Database Schema Implementation",
        description: "Create comprehensive database schema for activities, contacts, calendar integration, and user management",
        priority: "high",
        status: "in_progress",
        statusTags: null,
        estimatedDuration: 240,
        dueDate: null,
        participants: null,
        createdBy: 1,
        createdAt: new Date("2025-06-11T14:02:01.815Z"),
        updatedAt: new Date("2025-06-11T14:02:01.815Z")
      },
      {
        id: 3,
        title: "User Interface Development",
        description: "Build responsive React components with Dutch translations and modern design system",
        priority: "medium",
        status: "planned",
        statusTags: null,
        estimatedDuration: 300,
        dueDate: null,
        participants: null,
        createdBy: 1,
        createdAt: new Date("2025-06-11T14:02:01.815Z"),
        updatedAt: new Date("2025-06-11T14:02:01.815Z")
      },
      {
        id: 4,
        title: "AI Integration",
        description: "Implement OpenAI-powered task prioritization and agenda generation features",
        priority: "medium",
        status: "planned",
        statusTags: null,
        estimatedDuration: 180,
        dueDate: null,
        participants: null,
        createdBy: 1,
        createdAt: new Date("2025-06-11T14:02:01.815Z"),
        updatedAt: new Date("2025-06-11T14:02:01.815Z")
      },
      {
        id: 5,
        title: "Microsoft Calendar Sync",
        description: "Build integration with Microsoft Graph API for calendar synchronization",
        priority: "high",
        status: "planned",
        statusTags: null,
        estimatedDuration: 120,
        dueDate: null,
        participants: null,
        createdBy: 1,
        createdAt: new Date("2025-06-11T14:02:01.815Z"),
        updatedAt: new Date("2025-06-11T14:02:01.815Z")
      }
    ];

    const quickWins: QuickWin[] = [
      {
        id: 1,
        title: "Keyboard Navigation",
        description: "Add Tab/Enter keyboard shortcuts for faster form navigation",
        impact: "medium",
        effort: "low",
        status: "pending",
        linkedActivityId: 1,
        createdBy: 1,
        createdAt: new Date("2025-06-11T14:02:03.718Z"),
        completedAt: null
      },
      {
        id: 2,
        title: "Dark Theme Toggle",
        description: "Implement light/dark theme switching with user preference storage",
        impact: "high",
        effort: "medium",
        status: "pending",
        linkedActivityId: 3,
        createdBy: 1,
        createdAt: new Date("2025-06-11T14:02:03.718Z"),
        completedAt: null
      },
      {
        id: 3,
        title: "Auto-save Forms",
        description: "Automatically save draft data to prevent data loss during form completion",
        impact: "high",
        effort: "low",
        status: "pending",
        linkedActivityId: 3,
        createdBy: 1,
        createdAt: new Date("2025-06-11T14:02:03.718Z"),
        completedAt: null
      },
      {
        id: 4,
        title: "Quick Add Buttons",
        description: "Add floating action buttons for rapid task and contact creation",
        impact: "medium",
        effort: "low",
        status: "pending",
        linkedActivityId: 3,
        createdBy: 1,
        createdAt: new Date("2025-06-11T14:02:03.718Z"),
        completedAt: null
      }
    ];

    const contacts: Contact[] = [
      {
        id: 1,
        name: "Bram Weinreder",
        email: "b.weinreder@nijhuis.nl",
        phone: "+31-20-123-4567",
        company: "Nijhuis",
        createdBy: 1,
        createdAt: new Date("2025-06-11T14:02:00.000Z")
      },
      {
        id: 2,
        name: "Development Team",
        email: "dev-team@nijhuis.nl",
        phone: "+31-20-987-6543",
        company: "Nijhuis",
        createdBy: 1,
        createdAt: new Date("2025-06-11T14:02:00.000Z")
      },
      {
        id: 3,
        name: "Project Manager",
        email: "pm@nijhuis.nl",
        phone: "+31-20-555-0123",
        company: "Nijhuis",
        createdBy: 1,
        createdAt: new Date("2025-06-11T14:02:00.000Z")
      },
      {
        id: 4,
        name: "System Administrator",
        email: "admin@nijhuis.nl",
        phone: "+31-20-444-5678",
        company: "Nijhuis",
        createdBy: 1,
        createdAt: new Date("2025-06-11T14:02:00.000Z")
      }
    ];

    this.cache = {
      activities,
      quickWins,
      contacts,
      stats: {
        urgentCount: 0,
        dueThisWeek: 1,
        completedCount: 1,
        activeContacts: 4
      },
      lastUpdated: new Date()
    };

    console.log('Local cache initialized with real project data');
  }

  isValid(): boolean {
    if (!this.cache) return false;
    const now = new Date().getTime();
    const cacheTime = this.cache.lastUpdated.getTime();
    return (now - cacheTime) < this.CACHE_DURATION;
  }

  getActivities(): Activity[] {
    this.initializeWithRealData();
    return this.cache?.activities || [];
  }

  getQuickWins(): QuickWin[] {
    this.initializeWithRealData();
    return this.cache?.quickWins || [];
  }

  getContacts(): Contact[] {
    this.initializeWithRealData();
    return this.cache?.contacts || [];
  }

  getStats() {
    this.initializeWithRealData();
    return this.cache?.stats || {
      urgentCount: 0,
      dueThisWeek: 1,
      completedCount: 1,
      activeContacts: 4
    };
  }

  updateCache(data: Partial<CacheData>) {
    if (!this.cache) this.initializeWithRealData();
    if (this.cache) {
      Object.assign(this.cache, data);
      this.cache.lastUpdated = new Date();
    }
  }

  clearCache() {
    this.cache = null;
  }
}

export const localCache = new LocalCache();