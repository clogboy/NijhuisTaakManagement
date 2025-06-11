import { logger } from './logger';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
}

export class Cache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || 5 * 60 * 1000; // Default 5 minutes
    this.maxSize = options.maxSize || 1000; // Default max 1000 items
  }

  set(key: string, value: T, customTtl?: number): void {
    const expires = Date.now() + (customTtl || this.ttl);
    
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { value, expires });
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  // Remove expired items
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, item] of entries) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    this.cleanup();
    
    const entries = Array.from(this.cache.entries());
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need hit/miss tracking
      memoryUsage: JSON.stringify(entries).length
    };
  }
}

// Global cache instances
export const queryCache = new Cache<any>({ ttl: 2 * 60 * 1000 }); // 2 minutes for queries
export const userCache = new Cache<any>({ ttl: 10 * 60 * 1000 }); // 10 minutes for user data
export const configCache = new Cache<any>({ ttl: 60 * 60 * 1000 }); // 1 hour for config

// Cache decorator for methods
export function Cacheable(cacheKey: string, ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `${cacheKey}:${JSON.stringify(args)}`;
      const cached = queryCache.get(key);
      
      if (cached !== undefined) {
        logger.debug(`Cache hit for ${key}`);
        return cached;
      }

      logger.debug(`Cache miss for ${key}`);
      const result = await method.apply(this, args);
      queryCache.set(key, result, ttl);
      
      return result;
    };
  };
}