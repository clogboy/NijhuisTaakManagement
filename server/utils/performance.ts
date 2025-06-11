import { performance } from 'perf_hooks';
import { logger } from './logger';

export interface PerformanceMetrics {
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(operation: string): () => PerformanceMetrics {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    return () => {
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      const metrics: PerformanceMetrics = {
        duration: endTime - startTime,
        memoryUsage: {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
        },
        timestamp: Date.now()
      };

      this.recordMetrics(operation, metrics);
      
      if (metrics.duration > 1000) { // Log slow operations (>1s)
        logger.warn(`Slow operation detected: ${operation}`, {
          duration: `${metrics.duration.toFixed(2)}ms`,
          memoryDelta: `${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`
        });
      }

      return metrics;
    };
  }

  private recordMetrics(operation: string, metrics: PerformanceMetrics): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push(metrics);
    
    // Keep only last 100 measurements per operation
    if (operationMetrics.length > 100) {
      operationMetrics.shift();
    }
  }

  getAverageMetrics(operation: string): PerformanceMetrics | null {
    const operationMetrics = this.metrics.get(operation);
    if (!operationMetrics || operationMetrics.length === 0) {
      return null;
    }

    const avg = operationMetrics.reduce(
      (acc, metric) => ({
        duration: acc.duration + metric.duration,
        memoryUsage: {
          rss: acc.memoryUsage.rss + metric.memoryUsage.rss,
          heapTotal: acc.memoryUsage.heapTotal + metric.memoryUsage.heapTotal,
          heapUsed: acc.memoryUsage.heapUsed + metric.memoryUsage.heapUsed,
          external: acc.memoryUsage.external + metric.memoryUsage.external,
          arrayBuffers: acc.memoryUsage.arrayBuffers + metric.memoryUsage.arrayBuffers
        },
        timestamp: acc.timestamp + metric.timestamp
      }),
      {
        duration: 0,
        memoryUsage: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 },
        timestamp: 0
      }
    );

    const count = operationMetrics.length;
    return {
      duration: avg.duration / count,
      memoryUsage: {
        rss: avg.memoryUsage.rss / count,
        heapTotal: avg.memoryUsage.heapTotal / count,
        heapUsed: avg.memoryUsage.heapUsed / count,
        external: avg.memoryUsage.external / count,
        arrayBuffers: avg.memoryUsage.arrayBuffers / count
      },
      timestamp: avg.timestamp / count
    };
  }

  getAllMetrics(): Record<string, PerformanceMetrics | null> {
    const result: Record<string, PerformanceMetrics | null> = {};
    const operationKeys = Array.from(this.metrics.keys());
    for (const operation of operationKeys) {
      result[operation] = this.getAverageMetrics(operation);
    }
    return result;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Middleware for automatic performance monitoring
export const performanceMiddleware = (operationName?: string) => {
  return (req: any, res: any, next: any) => {
    const operation = operationName || `${req.method} ${req.route?.path || req.path}`;
    const stopTimer = performanceMonitor.startTimer(operation);
    
    res.on('finish', () => {
      stopTimer();
    });
    
    next();
  };
};