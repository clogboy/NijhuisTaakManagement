import { storage } from "./storage";
import { BimcollabProject, BimcollabIssue, InsertBimcollabProject, InsertBimcollabIssue } from "@shared/schema";

interface BimcollabApiIssue {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  issueType: string;
  assignedTo?: string[];
  reporter?: string;
  dueDate?: string;
  modelElement?: string;
  coordinates?: {
    x: number;
    y: number;
    z: number;
  };
  screenshots?: string[];
  createdAt: string;
  updatedAt: string;
}

interface BimcollabApiProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export class BimcollabService {
  private baseUrl: string = '';
  private apiKey: string = '';

  /**
   * Get BimCollab API credentials
   */
  private async getBimcollabCredentials(userId: number): Promise<{ url: string; apiKey: string } | null> {
    // This will be implemented when API keys are available
    // For now, return null to use fallback data
    console.log(`BimCollab credentials requested for user ${userId} - API keys not configured yet`);
    return null;
  }

  /**
   * Fetch BimCollab projects for a user
   */
  async getBimcollabProjects(userId: number): Promise<BimcollabProject[]> {
    const credentials = await this.getBimcollabCredentials(userId);
    
    if (!credentials) {
      console.log('BimCollab API not configured - using local data only');
      return await storage.getBimcollabProjects(userId);
    }

    try {
      // This will make actual API calls when credentials are available
      const response = await fetch(`${credentials.url}/api/v1/projects`, {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`BimCollab API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Sync projects to local storage
      for (const project of data.projects || []) {
        await this.syncProjectToStorage(project, credentials.url, userId);
      }

      return await storage.getBimcollabProjects(userId);
    } catch (error) {
      console.error('Failed to fetch BimCollab projects:', error);
      // Fallback to local storage
      return await storage.getBimcollabProjects(userId);
    }
  }

  /**
   * Fetch BimCollab issues from a specific project
   */
  async getBimcollabIssues(projectId: string, userId: number): Promise<BimcollabIssue[]> {
    const credentials = await this.getBimcollabCredentials(userId);
    
    if (!credentials) {
      console.log('BimCollab API not configured - using local data only');
      return await storage.getBimcollabIssues(projectId);
    }

    try {
      const response = await fetch(`${credentials.url}/api/v1/projects/${projectId}/issues`, {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`BimCollab API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Sync issues to local storage
      for (const issue of data.issues || []) {
        await this.syncIssueToStorage(issue, projectId, userId);
      }

      return await storage.getBimcollabIssues(projectId);
    } catch (error) {
      console.error('Failed to fetch BimCollab issues:', error);
      // Fallback to local storage
      return await storage.getBimcollabIssues(projectId);
    }
  }

  /**
   * Create a BimCollab issue
   */
  async createBimcollabIssue(
    projectId: string,
    issue: {
      title: string;
      description: string;
      issueType: string;
      priority?: string;
      assignedTo?: string[];
      dueDate?: Date;
      modelElement?: string;
      coordinates?: { x: number; y: number; z: number };
    },
    userId: number
  ): Promise<BimcollabIssue | null> {
    const credentials = await this.getBimcollabCredentials(userId);
    
    if (!credentials) {
      console.log('BimCollab API not configured - creating local issue only');
      // Create local issue when API is not available
      const localIssue: InsertBimcollabIssue = {
        issueId: `local_${Date.now()}`,
        projectId: parseInt(projectId),
        title: issue.title,
        description: issue.description,
        status: 'open',
        priority: issue.priority || 'normal',
        issueType: issue.issueType,
        assignedTo: issue.assignedTo || [],
        dueDate: issue.dueDate?.toISOString().split('T')[0],
        modelElement: issue.modelElement,
        coordinates: issue.coordinates,
        screenshots: [],
        lastSyncAt: new Date(),
      };
      
      return await storage.createBimcollabIssue(localIssue);
    }

    try {
      const response = await fetch(`${credentials.url}/api/v1/projects/${projectId}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: issue.title,
          description: issue.description,
          issueType: issue.issueType,
          priority: issue.priority || 'normal',
          assignedTo: issue.assignedTo,
          dueDate: issue.dueDate?.toISOString(),
          modelElement: issue.modelElement,
          coordinates: issue.coordinates,
        })
      });

      if (!response.ok) {
        throw new Error(`BimCollab API error: ${response.status}`);
      }

      const createdIssue = await response.json();
      return await this.syncIssueToStorage(createdIssue, projectId, userId);
    } catch (error) {
      console.error('Failed to create BimCollab issue:', error);
      return null;
    }
  }

  /**
   * Update BimCollab issue status
   */
  async updateBimcollabIssueStatus(
    issueId: string,
    status: string,
    userId: number
  ): Promise<boolean> {
    const credentials = await this.getBimcollabCredentials(userId);
    
    if (!credentials) {
      console.log('BimCollab API not configured - updating local issue only');
      // Update local issue when API is not available
      await storage.updateBimcollabIssue(issueId, { status });
      return true;
    }

    try {
      const response = await fetch(`${credentials.url}/api/v1/issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: status
        })
      });

      if (!response.ok) {
        throw new Error(`BimCollab API error: ${response.status}`);
      }

      // Update local storage
      await storage.updateBimcollabIssue(issueId, { status });
      return true;
    } catch (error) {
      console.error('Failed to update BimCollab issue:', error);
      return false;
    }
  }

  /**
   * Convert BimCollab issue to roadblock
   */
  async convertIssueToRoadblock(issueId: string, userId: number): Promise<boolean> {
    try {
      const issue = await storage.getBimcollabIssueByIssueId(issueId);
      if (!issue) {
        throw new Error('Issue not found');
      }

      // Create roadblock from issue
      const roadblock = await storage.createRoadblock({
        title: `[BimCollab] ${issue.title}`,
        description: `${issue.description}\n\nBimCollab Issue Type: ${issue.issueType}\nModel Element: ${issue.modelElement || 'N/A'}`,
        priority: issue.priority || 'normal',
        status: 'active',
        participants: issue.assignedTo || [],
        createdBy: userId,
      });

      // Link the roadblock to the issue
      await storage.updateBimcollabIssue(issue.id, {
        linkedRoadblockId: roadblock.id
      });

      return true;
    } catch (error) {
      console.error('Failed to convert issue to roadblock:', error);
      return false;
    }
  }

  /**
   * Sync BimCollab project to local storage
   */
  private async syncProjectToStorage(project: any, serverUrl: string, userId: number): Promise<void> {
    const existingProject = await storage.getBimcollabProjectByProjectId(project.id);
    
    if (existingProject) {
      await storage.updateBimcollabProject(existingProject.id, {
        name: project.name,
        description: project.description,
        lastSyncAt: new Date(),
      });
    } else {
      await storage.createBimcollabProject({
        projectId: project.id,
        name: project.name,
        description: project.description || '',
        serverUrl,
        lastSyncAt: new Date(),
        createdBy: userId,
      });
    }
  }

  /**
   * Sync BimCollab issue to local storage
   */
  private async syncIssueToStorage(issue: any, projectId: string, userId: number): Promise<BimcollabIssue> {
    const existingIssue = await storage.getBimcollabIssueByIssueId(issue.id);
    const localProjectId = await storage.getBimcollabProjectByProjectId(projectId);
    
    const issueData: InsertBimcollabIssue = {
      issueId: issue.id,
      projectId: localProjectId?.id || parseInt(projectId),
      title: issue.title,
      description: issue.description || '',
      status: issue.status || 'open',
      priority: issue.priority || 'normal',
      issueType: issue.issueType || 'general',
      assignedTo: issue.assignedTo || [],
      reporter: issue.reporter,
      dueDate: issue.dueDate ? new Date(issue.dueDate).toISOString().split('T')[0] : undefined,
      modelElement: issue.modelElement,
      coordinates: issue.coordinates,
      screenshots: issue.screenshots || [],
      lastSyncAt: new Date(),
    };

    if (existingIssue) {
      await storage.updateBimcollabIssue(existingIssue.id, issueData);
      return { ...existingIssue, ...issueData };
    } else {
      return await storage.createBimcollabIssue(issueData);
    }
  }

  /**
   * Get integration status
   */
  async getIntegrationStatus(userId: number): Promise<{
    isConfigured: boolean;
    lastSync?: Date;
    projectCount: number;
    issueCount: number;
    openIssues: number;
  }> {
    const settings = await storage.getIntegrationSettings(userId, 'bimcollab');
    const projects = await storage.getBimcollabProjects(userId);
    const allIssues = await Promise.all(
      projects.map(p => storage.getBimcollabIssues(p.id.toString()))
    );
    const issues = allIssues.flat();
    const openIssues = issues.filter(i => i.status === 'open').length;

    return {
      isConfigured: !!settings && settings.isEnabled,
      lastSync: settings?.lastSyncAt || undefined,
      projectCount: projects.length,
      issueCount: issues.length,
      openIssues,
    };
  }
}

export const bimcollabService = new BimcollabService();