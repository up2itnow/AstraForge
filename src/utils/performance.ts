/**
 * Performance monitoring utilities
 * Tracks operation timing and resource usage
 */

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private completedMetrics: PerformanceMetrics[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  startTimer(operationId: string, operation: string, metadata?: Record<string, unknown>): void {
    this.metrics.set(operationId, {
      operation,
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End timing an operation
   */
  endTimer(operationId: string): PerformanceMetrics | null {
    const metric = this.metrics.get(operationId);
    if (!metric) {
      return null;
    }

    const endTime = performance.now();
    const completedMetric: PerformanceMetrics = {
      ...metric,
      endTime,
      duration: endTime - metric.startTime
    };

    this.completedMetrics.push(completedMetric);
    this.metrics.delete(operationId);

    return completedMetric;
  }

  /**
   * Time an async operation
   */
  async timeAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const operationId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.startTimer(operationId, operation, metadata);
    
    try {
      const result = await fn();
      const metrics = this.endTimer(operationId)!;
      return { result, metrics };
    } catch (error) {
      // End timer even if operation failed
      const metrics = this.endTimer(operationId)!;
      throw error;
    }
  }

  /**
   * Time a synchronous operation
   */
  timeSync<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): { result: T; metrics: PerformanceMetrics } {
    const operationId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.startTimer(operationId, operation, metadata);
    
    try {
      const result = fn();
      const metrics = this.endTimer(operationId)!;
      return { result, metrics };
    } catch (error) {
      // End timer even if operation failed
      const metrics = this.endTimer(operationId)!;
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalOperations: number;
    averageDuration: number;
    operationBreakdown: Record<string, { count: number; averageDuration: number; totalDuration: number }>;
  } {
    const breakdown: Record<string, { count: number; totalDuration: number; durations: number[] }> = {};
    
    for (const metric of this.completedMetrics) {
      if (!metric.duration) continue;
      
      if (!breakdown[metric.operation]) {
        breakdown[metric.operation] = { count: 0, totalDuration: 0, durations: [] };
      }
      
      breakdown[metric.operation].count++;
      breakdown[metric.operation].totalDuration += metric.duration;
      breakdown[metric.operation].durations.push(metric.duration);
    }

    const operationBreakdown: Record<string, { count: number; averageDuration: number; totalDuration: number }> = {};
    for (const [operation, data] of Object.entries(breakdown)) {
      operationBreakdown[operation] = {
        count: data.count,
        totalDuration: data.totalDuration,
        averageDuration: data.totalDuration / data.count
      };
    }

    const totalDuration = this.completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageDuration = totalDuration / Math.max(this.completedMetrics.length, 1);

    return {
      totalOperations: this.completedMetrics.length,
      averageDuration,
      operationBreakdown
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit = 10): PerformanceMetrics[] {
    return this.completedMetrics.slice(-limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.completedMetrics = [];
  }

  /**
   * Get slow operations (above threshold)
   */
  getSlowOperations(thresholdMs = 1000): PerformanceMetrics[] {
    return this.completedMetrics.filter(m => (m.duration || 0) > thresholdMs);
  }
}

/**
 * Decorator for timing method calls
 */
export function timed(operationName?: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operation = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function(...args: any[]) {
      const monitor = PerformanceMonitor.getInstance();
      
      if (originalMethod.constructor.name === 'AsyncFunction') {
        const { result } = await monitor.timeAsync(operation, () => originalMethod.apply(this, args));
        return result;
      } else {
        const { result } = monitor.timeSync(operation, () => originalMethod.apply(this, args));
        return result;
      }
    };

    return descriptor;
  };
}

// Global performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();