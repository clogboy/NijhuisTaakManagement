import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from './logger';
import * as schema from "@shared/schema";

export class DatabasePool {
  private static instance: DatabasePool;
  private client!: postgres.Sql;
  private db: any;
  private connectionCount = 0;
  private readonly maxConnections = 20;
  private readonly idleTimeout = 30000;

  private constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }
    
    logger.info('Initializing PostgreSQL database connection');
    this.initializePostgres();
    this.setupEventHandlers();
  }

  private initializePostgres() {
    this.client = postgres(process.env.DATABASE_URL!, {
      max: this.maxConnections,
      idle_timeout: this.idleTimeout / 1000,
      connect_timeout: 10,
      prepare: false,
      types: {
        bigint: postgres.BigInt,
      },
    });
    
    this.db = drizzle(this.client, { schema });
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



  private setupEventHandlers(): void {
    // postgres.js handles connection events differently
    logger.debug('Database pool initialized');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client`SELECT 1`;
      return true;
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