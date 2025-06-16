import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private requests = new Map<string, RequestRecord>();
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      message: options.message || 'Too many requests, please try again later',
      skipSuccessfulRequests: options.skipSuccessfulRequests || false
    };

    // Clean up expired records every minute
    setInterval(() => this.cleanup(), 60000);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.generateKey(req);
      const now = Date.now();
      const record = this.requests.get(key);

      if (!record || now > record.resetTime) {
        // First request in window or window expired
        this.requests.set(key, {
          count: 1,
          resetTime: now + this.options.windowMs
        });
        return next();
      }

      if (record.count >= this.options.maxRequests) {
        logger.warn(`Rate limit exceeded for ${key}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });

        return res.status(429).json({
          error: this.options.message,
          retryAfter: Math.ceil((record.resetTime - now) / 1000)
        });
      }

      // Track successful requests if not skipping them
      const originalSend = res.send;
      const rateLimiter = this;
      res.send = function(body: any) {
        if (!rateLimiter.options.skipSuccessfulRequests || res.statusCode >= 400) {
          record.count++;
        }
        return originalSend.call(res, body);
      };

      record.count++;
      next();
    };
  }

  private generateKey(req: Request): string {
    // Use IP address as default key, could be enhanced with user ID
    return req.ip || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.requests.entries());
    for (const [key, record] of entries) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  getStats(): { totalKeys: number; activeWindows: number } {
    this.cleanup();
    return {
      totalKeys: this.requests.size,
      activeWindows: this.requests.size
    };
  }

  // Clear all rate limit records (useful for development)
  clearAll(): void {
    this.requests.clear();
  }

  // Clear rate limit for specific key
  clearKey(key: string): void {
    this.requests.delete(key);
  }
}

// Pre-configured rate limiters
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50, // 50 login attempts per 15 minutes (increased for development)
  message: 'Too many authentication attempts, please try again later'
});

export const apiLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500, // 500 requests per 15 minutes (increased for development)
  skipSuccessfulRequests: true
});

export const strictLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50, // 50 requests per minute for task interactions
  message: 'Rate limit exceeded'
});