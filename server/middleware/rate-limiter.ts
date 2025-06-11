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
      res.send = function(body) {
        if (!this.options.skipSuccessfulRequests || res.statusCode >= 400) {
          record.count++;
        }
        return originalSend.call(res, body);
      }.bind(this);

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
    for (const [key, record] of this.requests.entries()) {
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
}

// Pre-configured rate limiters
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later'
});

export const apiLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  skipSuccessfulRequests: true
});

export const strictLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  message: 'Rate limit exceeded'
});