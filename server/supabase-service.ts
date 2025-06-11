import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Contact, InsertContact } from '@shared/schema';

interface SupabaseConnectionConfig {
  url: string;
  serviceRoleKey: string;
  timeout?: number;
}

interface DatabaseError {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

interface ConnectionStatus {
  connected: boolean;
  error?: DatabaseError;
  latency?: number;
  timestamp: Date;
}

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private connectionStatus: ConnectionStatus = {
    connected: false,
    timestamp: new Date()
  };
  private readonly timeout: number;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(config?: SupabaseConnectionConfig) {
    this.timeout = config?.timeout || 10000; // 10 second default timeout
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[SUPABASE] Missing required environment variables');
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }

    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      console.log('[SUPABASE] Initializing client connection...');
      
      this.client = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          },
          db: {
            schema: 'public'
          }
        }
      );

      console.log('[SUPABASE] Client initialized successfully');
    } catch (error) {
      const dbError: DatabaseError = {
        message: error instanceof Error ? error.message : 'Unknown initialization error',
        details: 'Failed to initialize Supabase client'
      };
      
      this.connectionStatus = {
        connected: false,
        error: dbError,
        timestamp: new Date()
      };
      
      console.error('[SUPABASE] Client initialization failed:', dbError);
      throw error;
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private async retry<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        console.warn(`[SUPABASE] Operation failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retry(operation, retries - 1);
      }
      throw error;
    }
  }

  async testConnection(): Promise<ConnectionStatus> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    console.log('[SUPABASE] Testing database connection...');
    const startTime = Date.now();

    try {
      // Test connection with a simple query
      const { error } = await this.withTimeout(
        this.client.from('contacts').select('count', { count: 'exact', head: true }),
        this.timeout
      );

      const latency = Date.now() - startTime;

      if (error) {
        const dbError: DatabaseError = {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        };

        this.connectionStatus = {
          connected: false,
          error: dbError,
          latency,
          timestamp: new Date()
        };

        console.error('[SUPABASE] Connection test failed:', dbError);
      } else {
        this.connectionStatus = {
          connected: true,
          latency,
          timestamp: new Date()
        };

        console.log(`[SUPABASE] Connection test successful (${latency}ms)`);
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      const dbError: DatabaseError = {
        message: error instanceof Error ? error.message : 'Unknown connection error',
        details: 'Connection test timeout or network error'
      };

      this.connectionStatus = {
        connected: false,
        error: dbError,
        latency,
        timestamp: new Date()
      };

      console.error('[SUPABASE] Connection test error:', dbError);
    }

    return this.connectionStatus;
  }

  async loadContacts(): Promise<Contact[]> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    console.log('[SUPABASE] Loading contacts from database...');
    const startTime = Date.now();

    try {
      const operation = async () => {
        const { data, error } = await this.client!
          .from('contacts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          const dbError: DatabaseError = {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          };
          
          console.error('[SUPABASE] Error loading contacts:', dbError);
          throw new Error(`Database error: ${error.message}`);
        }

        console.log(`[SUPABASE] Successfully loaded ${data?.length || 0} contacts (${Date.now() - startTime}ms)`);
        return data || [];
      };

      return await this.withTimeout(
        this.retry(operation),
        this.timeout
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading contacts';
      console.error('[SUPABASE] Failed to load contacts:', errorMessage);
      
      // Check if it's a timeout or connection issue
      if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        throw new Error(`Connection timeout: Unable to load contacts within ${this.timeout}ms`);
      }
      
      throw new Error(`Failed to load contacts: ${errorMessage}`);
    }
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    console.log('[SUPABASE] Creating new contact...');
    const startTime = Date.now();

    try {
      const operation = async () => {
        const { data, error } = await this.client!
          .from('contacts')
          .insert(contact)
          .select()
          .single();

        if (error) {
          const dbError: DatabaseError = {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          };
          
          console.error('[SUPABASE] Error creating contact:', dbError);
          throw new Error(`Database error: ${error.message}`);
        }

        console.log(`[SUPABASE] Successfully created contact (${Date.now() - startTime}ms)`);
        return data;
      };

      return await this.withTimeout(
        this.retry(operation),
        this.timeout
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error creating contact';
      console.error('[SUPABASE] Failed to create contact:', errorMessage);
      throw new Error(`Failed to create contact: ${errorMessage}`);
    }
  }

  async updateContact(id: number, updates: Partial<InsertContact>): Promise<Contact> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    console.log(`[SUPABASE] Updating contact ${id}...`);
    const startTime = Date.now();

    try {
      const operation = async () => {
        const { data, error } = await this.client!
          .from('contacts')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          const dbError: DatabaseError = {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          };
          
          console.error('[SUPABASE] Error updating contact:', dbError);
          throw new Error(`Database error: ${error.message}`);
        }

        console.log(`[SUPABASE] Successfully updated contact (${Date.now() - startTime}ms)`);
        return data;
      };

      return await this.withTimeout(
        this.retry(operation),
        this.timeout
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error updating contact';
      console.error('[SUPABASE] Failed to update contact:', errorMessage);
      throw new Error(`Failed to update contact: ${errorMessage}`);
    }
  }

  async deleteContact(id: number): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    console.log(`[SUPABASE] Deleting contact ${id}...`);
    const startTime = Date.now();

    try {
      const operation = async () => {
        const { error } = await this.client!
          .from('contacts')
          .delete()
          .eq('id', id);

        if (error) {
          const dbError: DatabaseError = {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          };
          
          console.error('[SUPABASE] Error deleting contact:', dbError);
          throw new Error(`Database error: ${error.message}`);
        }

        console.log(`[SUPABASE] Successfully deleted contact (${Date.now() - startTime}ms)`);
      };

      await this.withTimeout(
        this.retry(operation),
        this.timeout
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting contact';
      console.error('[SUPABASE] Failed to delete contact:', errorMessage);
      throw new Error(`Failed to delete contact: ${errorMessage}`);
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: ConnectionStatus;
    suggestions?: string[];
  }> {
    const connectionTest = await this.testConnection();
    
    if (connectionTest.connected) {
      return {
        status: connectionTest.latency! > 2000 ? 'degraded' : 'healthy',
        details: connectionTest,
        suggestions: connectionTest.latency! > 2000 ? [
          'Database response time is slow',
          'Consider checking network connectivity',
          'Monitor Supabase project status'
        ] : undefined
      };
    }

    const suggestions: string[] = [];
    
    if (connectionTest.error?.message.includes('timeout')) {
      suggestions.push('Connection timed out - check network connectivity');
    }
    
    if (connectionTest.error?.code === '42P01') {
      suggestions.push('Table "contacts" does not exist - check database schema');
    }
    
    if (connectionTest.error?.message.includes('authentication')) {
      suggestions.push('Invalid API key - verify SUPABASE_SERVICE_ROLE_KEY');
    }

    return {
      status: 'unhealthy',
      details: connectionTest,
      suggestions
    };
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();