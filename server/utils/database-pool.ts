import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from './logger';
import * as schema from "@shared/schema";

export class DatabasePool {
  private static instance: DatabasePool;
  private client!: postgres.Sql;
  private supabaseClient: any;
  private db: any;
  private connectionCount = 0;
  private readonly maxConnections = 20;
  private readonly idleTimeout = 30000;

  private constructor() {
    // Check for Supabase configuration first
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseServiceKey) {
      logger.info('Initializing Supabase database connection');
      this.initializeSupabase(supabaseUrl, supabaseServiceKey);
    } else if (process.env.DATABASE_URL) {
      logger.info('Initializing PostgreSQL database connection');
      this.initializePostgres();
    } else {
      throw new Error("Either SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL must be set");
    }

    this.setupEventHandlers();
  }

  private initializeSupabase(url: string, serviceKey: string) {
    this.supabaseClient = createClient(url, serviceKey);
    
    // Use the direct database URL for postgres.js if available
    const dbUrl = process.env.DATABASE_URL || this.constructSupabaseUrl(url);
    
    this.client = postgres(dbUrl, {
      max: this.maxConnections,
      idle_timeout: this.idleTimeout / 1000,
      connect_timeout: 10,
    });
    
    this.db = drizzle(this.client, { schema });
  }

  private initializePostgres() {
    this.client = postgres(process.env.DATABASE_URL!, {
      max: this.maxConnections,
      idle_timeout: this.idleTimeout / 1000,
      connect_timeout: 10,
    });
    
    this.db = drizzle(this.client, { schema });
  }

  private constructSupabaseUrl(supabaseUrl: string): string {
    // Extract project ref from Supabase URL
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    return `postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`;
  }

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  getPool(): postgres.Sql {
    return this.client;
  }

  getDatabase(): any {
    return this.db;
  }

  getSupabaseClient(): any {
    return this.supabaseClient;
  }

  private setupEventHandlers(): void {
    // postgres.js handles connection events differently
    logger.debug('Database pool initialized');
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (this.supabaseClient) {
        // Use Supabase health check
        const { data, error } = await this.supabaseClient
          .from('users')
          .select('count')
          .limit(1);
        return !error;
      } else {
        // Use direct postgres connection
        await this.client`SELECT 1`;
        return true;
      }
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  getStats(): {
    totalConnections: number;
    idleConnections: number;
    activeConnections: number;
    waitingCount: number;
  } {
    // postgres.js doesn't expose these stats directly
    return {
      totalConnections: this.maxConnections,
      idleConnections: 0,
      activeConnections: this.connectionCount,
      waitingCount: 0
    };
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.end();
    }
    logger.info('Database pool closed');
  }
}

export const databasePool = DatabasePool.getInstance();