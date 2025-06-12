import { logger } from './utils/logger';

interface DigiOfficeConfig {
  baseUrl?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
}

interface DigiOfficeDocument {
  id: string;
  name: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  modifiedBy: string;
  isCheckedOut: boolean;
  checkedOutBy?: string;
  checkedOutAt?: string;
  path: string;
  url: string;
  downloadUrl: string;
  previewUrl?: string;
  tags: string[];
  metadata: Record<string, any>;
}

interface DigiOfficeFolder {
  id: string;
  name: string;
  description?: string;
  path: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  documentsCount: number;
  subFoldersCount: number;
}

interface DigiOfficeSearchResult {
  documents: DigiOfficeDocument[];
  folders: DigiOfficeFolder[];
  totalCount: number;
  hasMore: boolean;
  nextPageToken?: string;
}

interface DigiOfficeUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  department?: string;
  role: string;
  isActive: boolean;
}

interface DocumentCheckoutResult {
  success: boolean;
  document?: DigiOfficeDocument;
  error?: string;
  lockExpires?: Date;
}

interface DocumentUploadResult {
  success: boolean;
  document?: DigiOfficeDocument;
  error?: string;
}

export class DigiOfficeService {
  private config: DigiOfficeConfig = {};
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor() {
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    this.config = {
      baseUrl: process.env.DIGIOFFICE_BASE_URL,
      apiKey: process.env.DIGIOFFICE_API_KEY,
      clientId: process.env.DIGIOFFICE_CLIENT_ID,
      clientSecret: process.env.DIGIOFFICE_CLIENT_SECRET,
      username: process.env.DIGIOFFICE_USERNAME,
      password: process.env.DIGIOFFICE_PASSWORD
    };
  }

  /**
   * Check if DigiOffice is configured
   */
  isConfigured(): boolean {
    return !!(this.config.baseUrl && 
             (this.config.apiKey || 
              (this.config.clientId && this.config.clientSecret) ||
              (this.config.username && this.config.password)));
  }

  /**
   * Get integration status
   */
  async getIntegrationStatus(userId: number): Promise<{
    configured: boolean;
    connected: boolean;
    lastSync?: Date;
    documentsCount?: number;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        connected: false,
        error: 'DigiOffice credentials not configured'
      };
    }

    try {
      const isConnected = await this.testConnection();
      return {
        configured: true,
        connected: isConnected,
        lastSync: new Date(),
        documentsCount: 0
      };
    } catch (error) {
      return {
        configured: true,
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Test connection to DigiOffice
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('DigiOffice not configured');
    }

    try {
      await this.ensureAuthenticated();
      // Test with a simple API call
      const response = await this.makeRequest('GET', '/api/v1/user/profile');
      return response.ok;
    } catch (error) {
      logger.error('DigiOffice connection test failed:', error);
      return false;
    }
  }

  /**
   * Authenticate with DigiOffice
   */
  private async ensureAuthenticated(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }

    if (this.config.apiKey) {
      this.accessToken = this.config.apiKey;
      this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    } else if (this.config.clientId && this.config.clientSecret) {
      await this.authenticateWithOAuth();
    } else if (this.config.username && this.config.password) {
      await this.authenticateWithCredentials();
    } else {
      throw new Error('No valid authentication method configured');
    }
  }

  private async authenticateWithOAuth(): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId!,
        client_secret: this.config.clientSecret!,
        scope: 'documents:read documents:write folders:read'
      })
    });

    if (!response.ok) {
      throw new Error(`OAuth authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
  }

  private async authenticateWithCredentials(): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: this.config.username,
        password: this.config.password
      })
    });

    if (!response.ok) {
      throw new Error(`Credential authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.token;
    this.tokenExpiry = new Date(Date.now() + (data.expiresIn * 1000));
  }

  /**
   * Make authenticated request to DigiOffice API
   */
  private async makeRequest(method: string, endpoint: string, body?: any): Promise<Response> {
    await this.ensureAuthenticated();

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'NijFlow/1.0'
    };

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (response.status === 401) {
      // Token expired, try to re-authenticate
      this.accessToken = undefined;
      this.tokenExpiry = undefined;
      await this.ensureAuthenticated();
      
      return fetch(`${this.config.baseUrl}${endpoint}`, {
        method,
        headers: {
          ...headers,
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: body ? JSON.stringify(body) : undefined
      });
    }

    return response;
  }

  /**
   * Search for documents in DigiOffice
   */
  async searchDocuments(
    userId: number,
    query: string,
    folderId?: string,
    pageSize: number = 50,
    pageToken?: string
  ): Promise<DigiOfficeSearchResult> {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: pageSize.toString(),
        ...(folderId && { folderId }),
        ...(pageToken && { pageToken })
      });

      const response = await this.makeRequest('GET', `/api/v1/documents/search?${params}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        documents: data.documents || [],
        folders: data.folders || [],
        totalCount: data.totalCount || 0,
        hasMore: data.hasMore || false,
        nextPageToken: data.nextPageToken
      };
    } catch (error) {
      logger.error('DigiOffice document search failed:', error);
      return {
        documents: [],
        folders: [],
        totalCount: 0,
        hasMore: false
      };
    }
  }

  /**
   * Get document details by ID
   */
  async getDocument(userId: number, documentId: string): Promise<DigiOfficeDocument | null> {
    try {
      const response = await this.makeRequest('GET', `/api/v1/documents/${documentId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get document: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get DigiOffice document:', error);
      return null;
    }
  }

  /**
   * Get documents in a folder
   */
  async getFolderDocuments(
    userId: number,
    folderId: string,
    pageSize: number = 50,
    pageToken?: string
  ): Promise<DigiOfficeSearchResult> {
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        ...(pageToken && { pageToken })
      });

      const response = await this.makeRequest('GET', `/api/v1/folders/${folderId}/documents?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get folder documents: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        documents: data.documents || [],
        folders: [],
        totalCount: data.totalCount || 0,
        hasMore: data.hasMore || false,
        nextPageToken: data.nextPageToken
      };
    } catch (error) {
      logger.error('Failed to get DigiOffice folder documents:', error);
      return {
        documents: [],
        folders: [],
        totalCount: 0,
        hasMore: false
      };
    }
  }

  /**
   * Get folder structure
   */
  async getFolders(userId: number, parentFolderId?: string): Promise<DigiOfficeFolder[]> {
    try {
      const endpoint = parentFolderId 
        ? `/api/v1/folders/${parentFolderId}/subfolders`
        : '/api/v1/folders';
      
      const response = await this.makeRequest('GET', endpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to get folders: ${response.statusText}`);
      }

      const data = await response.json();
      return data.folders || [];
    } catch (error) {
      logger.error('Failed to get DigiOffice folders:', error);
      return [];
    }
  }

  /**
   * Check out a document for editing
   */
  async checkOutDocument(userId: number, documentId: string): Promise<DocumentCheckoutResult> {
    try {
      const response = await this.makeRequest('POST', `/api/v1/documents/${documentId}/checkout`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        return {
          success: false,
          error: errorData.message || 'Checkout failed'
        };
      }

      const document = await response.json();
      return {
        success: true,
        document,
        lockExpires: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };
    } catch (error) {
      logger.error('DigiOffice document checkout failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Checkout failed'
      };
    }
  }

  /**
   * Check in a document after editing
   */
  async checkInDocument(
    userId: number, 
    documentId: string, 
    comment?: string,
    fileBuffer?: Buffer,
    fileName?: string
  ): Promise<DocumentUploadResult> {
    try {
      const formData = new FormData();
      
      if (fileBuffer && fileName) {
        formData.append('file', new Blob([fileBuffer]), fileName);
      }
      
      if (comment) {
        formData.append('comment', comment);
      }

      const response = await fetch(`${this.config.baseUrl}/api/v1/documents/${documentId}/checkin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        return {
          success: false,
          error: errorData.message || 'Check-in failed'
        };
      }

      const document = await response.json();
      return {
        success: true,
        document
      };
    } catch (error) {
      logger.error('DigiOffice document check-in failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Check-in failed'
      };
    }
  }

  /**
   * Get document download URL
   */
  async getDocumentDownloadUrl(userId: number, documentId: string): Promise<string | null> {
    try {
      const response = await this.makeRequest('GET', `/api/v1/documents/${documentId}/download-url`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.downloadUrl || null;
    } catch (error) {
      logger.error('Failed to get DigiOffice download URL:', error);
      return null;
    }
  }

  /**
   * Create a document reference for an activity
   */
  async createDocumentReference(
    activityId: number,
    documentId: string,
    userId: number,
    description?: string
  ): Promise<boolean> {
    try {
      // Get document details to store reference info
      const document = await this.getDocument(userId, documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      // Store reference in database (would be implemented with actual storage)
      logger.info(`Creating document reference: Activity ${activityId} -> DigiOffice Document ${documentId} (${document.name})`);
      
      return true;
    } catch (error) {
      logger.error('Failed to create document reference:', error);
      return false;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId: number): Promise<DigiOfficeUser | null> {
    try {
      const response = await this.makeRequest('GET', '/api/v1/user/profile');
      
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get DigiOffice user info:', error);
      return null;
    }
  }
}

export const digiOfficeService = new DigiOfficeService();