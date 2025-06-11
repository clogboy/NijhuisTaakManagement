import { Pool } from '@neondatabase/serverless';
import { logger } from './logger';

export class DatabasePool {
  private static instance: DatabasePool;
  private pool: Pool;
  private connectionCount = 0;
  private readonly maxConnections = 20;
  private readonly idleTimeout = 30000;

  private constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: this.maxConnections,
      idleTimeoutMillis: this.idleTimeout,
      connectionTimeoutMillis: 10000
    });

    this.setupEventHandlers();
  }

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  getPool(): Pool {
    return this.pool;
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', () => {
      this.connectionCount++;
      logger.debug(`Database connection established. Active connections: ${this.connectionCount}`);
    });

    this.pool.on('remove', () => {
      this.connectionCount--;
      logger.debug(`Database connection closed. Active connections: ${this.connectionCount}`);
    });

    this.pool.on('error', (err) => {
      logger.error('Database pool error:', err);
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
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
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database pool closed');
  }
}

export const databasePool = DatabasePool.getInstance();