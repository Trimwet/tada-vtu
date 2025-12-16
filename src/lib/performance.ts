// Performance monitoring utilities

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.trackWebVitals();
    }
  }

  private trackWebVitals() {
    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP - Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric({
            name: 'LCP',
            value: lastEntry.startTime,
            timestamp: Date.now(),
            url: window.location.pathname
          });
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) { /* Silently fail */ }

      // FID - First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fidEntry = entry as PerformanceEventTiming;
            this.recordMetric({
              name: 'FID',
              value: fidEntry.processingStart - fidEntry.startTime,
              timestamp: Date.now(),
              url: window.location.pathname
            });
          }
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (e) { /* Silently fail */ }

      // CLS - Cumulative Layout Shift
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
            if (!layoutShift.hadRecentInput) {
              clsValue += layoutShift.value;
              this.recordMetric({
                name: 'CLS',
                value: clsValue,
                timestamp: Date.now(),
                url: window.location.pathname
              });
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) { /* Silently fail */ }
    }
  }

  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${metric.name}: ${metric.value.toFixed(2)}ms`);
    }
  }

  // Measure custom operations
  async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await operation();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric({
        name: `custom_${name}`,
        value: duration,
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.pathname : undefined
      });
    }
  }

  measure<T>(name: string, operation: () => T): T {
    const start = performance.now();
    try {
      return operation();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric({
        name: `custom_${name}`,
        value: duration,
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.pathname : undefined
      });
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getAverageMetric(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    return filtered.reduce((sum, m) => sum + m.value, 0) / filtered.length;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions
export function trackApiCall(endpoint: string, duration: number, success: boolean) {
  performanceMonitor.recordMetric({
    name: `api_${success ? 'success' : 'error'}_${endpoint.replace(/\//g, '_')}`,
    value: duration,
    timestamp: Date.now()
  });
}

// React hook for performance tracking
export function usePerformanceTracking(componentName: string) {
  const trackRender = () => {
    performanceMonitor.recordMetric({
      name: `component_render_${componentName}`,
      value: performance.now(),
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.pathname : undefined
    });
  };

  const trackInteraction = (interactionName: string) => {
    performanceMonitor.recordMetric({
      name: `interaction_${componentName}_${interactionName}`,
      value: performance.now(),
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.pathname : undefined
    });
  };

  return { trackRender, trackInteraction };
}
