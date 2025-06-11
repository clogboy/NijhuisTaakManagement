import { storage } from "./storage";
import { TeamsBoard, TeamsCard, InsertTeamsBoard, InsertTeamsCard } from "@shared/schema";

interface TeamsTask {
  id: string;
  planId: string;
  bucketId: string;
  title: string;
  assignments: {
    [userId: string]: {
      assignedBy: string;
      assignedDateTime: string;
      orderHint: string;
    };
  };
  priority: number;
  startDateTime?: string;
  dueDateTime?: string;
  percentComplete: number;
  conversationThreadId?: string;
  details?: {
    description: string;
    references: any[];
    checklist: any[];
  };
  createdDateTime: string;
  createdBy: {
    user: {
      displayName: string;
      id: string;
    };
  };
}

interface TeamsBoard {
  id: string;
  title: string;
  owner: string;
  createdDateTime: string;
  buckets: Array<{
    id: string;
    name: string;
    orderHint: string;
  }>;
}

export class TeamsService {
  private readonly graphBaseUrl = 'https://graph.microsoft.com/v1.0';

  /**
   * Get Microsoft access token for Teams/Planner access
   */
  private async getTeamsToken(userId: number): Promise<string | null> {
    // This will be implemented when API keys are available
    // For now, return null to use fallback data
    console.log(`Teams token requested for user ${userId} - API keys not configured yet`);
    return null;
  }

  /**
   * Fetch Teams boards (Planner plans) for a user
   */
  async getTeamsBoards(userId: number): Promise<TeamsBoard[]> {
    const token = await this.getTeamsToken(userId);
    
    if (!token) {
      console.log('Teams API not configured - using local data only');
      return await storage.getTeamsBoards(userId);
    }

    try {
      // This will make actual API calls when token is available
      const response = await fetch(`${this.graphBaseUrl}/me/planner/plans`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Teams API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Sync boards to local storage
      for (const board of data.value) {
        await this.syncBoardToStorage(board, userId);
      }

      return await storage.getTeamsBoards(userId);
    } catch (error) {
      console.error('Failed to fetch Teams boards:', error);
      // Fallback to local storage
      return await storage.getTeamsBoards(userId);
    }
  }

  /**
   * Fetch Teams tasks (Planner tasks) from a specific board
   */
  async getTeamsTasks(boardId: string, userId: number): Promise<TeamsCard[]> {
    const token = await this.getTeamsToken(userId);
    
    if (!token) {
      console.log('Teams API not configured - using local data only');
      return await storage.getTeamsCards(boardId);
    }

    try {
      const response = await fetch(`${this.graphBaseUrl}/planner/plans/${boardId}/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Teams API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Sync tasks to local storage
      for (const task of data.value) {
        await this.syncTaskToStorage(task, boardId, userId);
      }

      return await storage.getTeamsCards(boardId);
    } catch (error) {
      console.error('Failed to fetch Teams tasks:', error);
      // Fallback to local storage
      return await storage.getTeamsCards(boardId);
    }
  }

  /**
   * Create a Teams task
   */
  async createTeamsTask(
    boardId: string, 
    task: {
      title: string;
      description?: string;
      assignedTo?: string[];
      dueDate?: Date;
      priority?: string;
    },
    userId: number
  ): Promise<TeamsCard | null> {
    const token = await this.getTeamsToken(userId);
    
    if (!token) {
      console.log('Teams API not configured - creating local task only');
      // Create local task when API is not available
      const localTask: InsertTeamsCard = {
        cardId: `local_${Date.now()}`,
        boardId: parseInt(boardId),
        title: task.title,
        description: task.description,
        assignedTo: task.assignedTo || [],
        priority: task.priority || 'normal',
        status: 'not_started',
        dueDate: task.dueDate?.toISOString().split('T')[0],
        labels: [],
        bucketName: 'To Do',
        lastSyncAt: new Date(),
      };
      
      return await storage.createTeamsCard(localTask);
    }

    try {
      const response = await fetch(`${this.graphBaseUrl}/planner/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId: boardId,
          title: task.title,
          dueDateTime: task.dueDate?.toISOString(),
          priority: this.mapPriorityToTeams(task.priority || 'normal'),
        })
      });

      if (!response.ok) {
        throw new Error(`Teams API error: ${response.status}`);
      }

      const createdTask = await response.json();
      return await this.syncTaskToStorage(createdTask, boardId, userId);
    } catch (error) {
      console.error('Failed to create Teams task:', error);
      return null;
    }
  }

  /**
   * Update Teams task status
   */
  async updateTeamsTaskStatus(
    taskId: string, 
    status: string,
    userId: number
  ): Promise<boolean> {
    const token = await this.getTeamsToken(userId);
    
    if (!token) {
      console.log('Teams API not configured - updating local task only');
      // Update local task when API is not available
      await storage.updateTeamsCard(taskId, { status });
      return true;
    }

    try {
      const response = await fetch(`${this.graphBaseUrl}/planner/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'If-Match': '*' // Required for Planner API updates
        },
        body: JSON.stringify({
          percentComplete: status === 'completed' ? 100 : 0
        })
      });

      if (!response.ok) {
        throw new Error(`Teams API error: ${response.status}`);
      }

      // Update local storage
      await storage.updateTeamsCard(taskId, { status });
      return true;
    } catch (error) {
      console.error('Failed to update Teams task:', error);
      return false;
    }
  }

  /**
   * Sync Teams board to local storage
   */
  private async syncBoardToStorage(board: any, userId: number): Promise<void> {
    const existingBoard = await storage.getTeamsBoardByBoardId(board.id);
    
    if (existingBoard) {
      await storage.updateTeamsBoard(existingBoard.id, {
        title: board.title,
        lastSyncAt: new Date(),
      });
    } else {
      await storage.createTeamsBoard({
        boardId: board.id,
        title: board.title,
        description: '',
        teamId: board.owner || '',
        lastSyncAt: new Date(),
        createdBy: userId,
      });
    }
  }

  /**
   * Sync Teams task to local storage
   */
  private async syncTaskToStorage(task: any, boardId: string, userId: number): Promise<TeamsCard> {
    const existingTask = await storage.getTeamsCardByCardId(task.id);
    const localBoardId = await storage.getTeamsBoardByBoardId(boardId);
    
    const taskData: InsertTeamsCard = {
      cardId: task.id,
      boardId: localBoardId?.id || parseInt(boardId),
      title: task.title,
      description: task.details?.description || '',
      assignedTo: Object.keys(task.assignments || {}),
      priority: this.mapPriorityFromTeams(task.priority),
      status: task.percentComplete === 100 ? 'completed' : 
              task.percentComplete > 0 ? 'in_progress' : 'not_started',
      dueDate: task.dueDateTime ? new Date(task.dueDateTime).toISOString().split('T')[0] : undefined,
      labels: [],
      bucketName: 'To Do', // This would come from bucket API
      lastSyncAt: new Date(),
    };

    if (existingTask) {
      await storage.updateTeamsCard(existingTask.id, taskData);
      return { ...existingTask, ...taskData };
    } else {
      return await storage.createTeamsCard(taskData);
    }
  }

  /**
   * Map priority from our system to Teams
   */
  private mapPriorityToTeams(priority: string): number {
    switch (priority) {
      case 'high': return 1;
      case 'normal': return 5;
      case 'low': return 9;
      default: return 5;
    }
  }

  /**
   * Map priority from Teams to our system
   */
  private mapPriorityFromTeams(priority: number): string {
    if (priority <= 3) return 'high';
    if (priority <= 6) return 'normal';
    return 'low';
  }

  /**
   * Get integration status
   */
  async getIntegrationStatus(userId: number): Promise<{
    isConfigured: boolean;
    lastSync?: Date;
    boardCount: number;
    taskCount: number;
  }> {
    const settings = await storage.getIntegrationSettings(userId, 'teams');
    const boards = await storage.getTeamsBoards(userId);
    const taskCount = await storage.getTeamsCardCount(userId);

    return {
      isConfigured: !!settings && settings.isEnabled,
      lastSync: settings?.lastSyncAt || undefined,
      boardCount: boards.length,
      taskCount,
    };
  }
}

export const teamsService = new TeamsService();