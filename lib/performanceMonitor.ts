/**
 * Performance monitoring utility for tracking slow queries and endpoint response times
 */

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: number;
  rowCount?: number;
  isSlowQuery: boolean;
}

interface EndpointMetrics {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: number;
  statusCode?: number;
  isSlowEndpoint: boolean;
}

class PerformanceMonitor {
  private queryMetrics: QueryMetrics[] = [];
  private endpointMetrics: EndpointMetrics[] = [];
  private slowQueryThreshold: number; // milliseconds
  private slowEndpointThreshold: number; // milliseconds
  private maxMetricsSize: number;

  constructor(
    slowQueryThreshold: number = 500,
    slowEndpointThreshold: number = 1000,
    maxMetricsSize: number = 1000
  ) {
    this.slowQueryThreshold = slowQueryThreshold;
    this.slowEndpointThreshold = slowEndpointThreshold;
    this.maxMetricsSize = maxMetricsSize;
  }

  /**
   * Track a database query
   */
  trackQuery(query: string, duration: number, rowCount?: number): void {
    const isSlowQuery = duration > this.slowQueryThreshold;

    const metrics: QueryMetrics = {
      query: query.substring(0, 200), // Truncate very long queries
      duration,
      timestamp: Date.now(),
      rowCount,
      isSlowQuery,
    };

    this.queryMetrics.push(metrics);

    // Keep array size limited
    if (this.queryMetrics.length > this.maxMetricsSize) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsSize);
    }

    // Log slow queries
    if (isSlowQuery) {
      console.warn(`[PERF] Slow query detected (${duration}ms): ${query.substring(0, 100)}...`);
    }
  }

  /**
   * Track an endpoint request
   */
  trackEndpoint(
    endpoint: string,
    method: string,
    duration: number,
    statusCode?: number
  ): void {
    const isSlowEndpoint = duration > this.slowEndpointThreshold;

    const metrics: EndpointMetrics = {
      endpoint,
      method,
      duration,
      timestamp: Date.now(),
      statusCode,
      isSlowEndpoint,
    };

    this.endpointMetrics.push(metrics);

    // Keep array size limited
    if (this.endpointMetrics.length > this.maxMetricsSize) {
      this.endpointMetrics = this.endpointMetrics.slice(-this.maxMetricsSize);
    }

    // Log slow endpoints
    if (isSlowEndpoint) {
      console.warn(`[PERF] Slow endpoint detected (${duration}ms): ${method} ${endpoint}`);
    }
  }

  /**
   * Get query statistics
   */
  getQueryStats(): {
    totalQueries: number;
    slowQueries: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
  } {
    if (this.queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
      };
    }

    const slowQueries = this.queryMetrics.filter(m => m.isSlowQuery).length;
    const durations = this.queryMetrics.map(m => m.duration);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    return {
      totalQueries: this.queryMetrics.length,
      slowQueries,
      averageDuration: Math.round(averageDuration),
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
    };
  }

  /**
   * Get endpoint statistics
   */
  getEndpointStats(): {
    totalRequests: number;
    slowRequests: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
  } {
    if (this.endpointMetrics.length === 0) {
      return {
        totalRequests: 0,
        slowRequests: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
      };
    }

    const slowRequests = this.endpointMetrics.filter(m => m.isSlowEndpoint).length;
    const durations = this.endpointMetrics.map(m => m.duration);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    return {
      totalRequests: this.endpointMetrics.length,
      slowRequests,
      averageDuration: Math.round(averageDuration),
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
    };
  }

  /**
   * Get slowest queries
   */
  getSlowestQueries(limit: number = 5): QueryMetrics[] {
    return [...this.queryMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get slowest endpoints
   */
  getSlowestEndpoints(limit: number = 5): EndpointMetrics[] {
    return [...this.endpointMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get all metrics summary
   */
  getSummary() {
    return {
      queries: this.getQueryStats(),
      endpoints: this.getEndpointStats(),
      slowestQueries: this.getSlowestQueries(3),
      slowestEndpoints: this.getSlowestEndpoints(3),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.queryMetrics = [];
    this.endpointMetrics = [];
  }

  /**
   * Set thresholds
   */
  setThresholds(slowQueryThreshold: number, slowEndpointThreshold: number): void {
    this.slowQueryThreshold = slowQueryThreshold;
    this.slowEndpointThreshold = slowEndpointThreshold;
  }
}

// Create global monitor instance
const performanceMonitor = new PerformanceMonitor(500, 1000, 1000);

export default performanceMonitor;

/**
 * Middleware to track endpoint performance
 */
export function createPerformanceMiddleware() {
  return (request: Request, response: any, next?: () => void) => {
    const startTime = Date.now();
    const method = request.method;
    const url = new URL(request.url);
    const endpoint = url.pathname;

    // For Next.js middleware, we need to wrap response handling
    if (next) {
      next();
    }

    const duration = Date.now() - startTime;
    performanceMonitor.trackEndpoint(endpoint, method, duration);
  };
}

/**
 * Helper to wrap query execution with performance tracking
 */
export function withPerformanceTracking(
  originalQuery: Function,
  queryName: string = 'query'
) {
  return async function trackedQuery(...args: any[]) {
    const startTime = Date.now();
    try {
      const result = await originalQuery(...args);
      const duration = Date.now() - startTime;

      // Log query with parameters if available
      const query = args[0] || '';
      performanceMonitor.trackQuery(query, duration, result?.rowCount);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      performanceMonitor.trackQuery(args[0] || '', duration);
      throw error;
    }
  };
}





