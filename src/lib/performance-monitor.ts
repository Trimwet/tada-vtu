"use client";

import React from 'react';
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

// Performance metrics interface
interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userAgent: string;
}

// Performance thresholds based on Google's Core Web Vitals
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 }, // INP replaced FID
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private isEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring() {
    // Only monitor in production
    if (process.env.NODE_ENV !== 'production') {
      this.isEnabled = false;
      return;
    }

    // Initialize Core Web Vitals monitoring
    onCLS(this.handleMetric.bind(this));
    onINP(this.handleMetric.bind(this)); // INP replaced FID in web-vitals v4+
    onFCP(this.handleMetric.bind(this));
    onLCP(this.handleMetric.bind(this));
    onTTFB(this.handleMetric.bind(this));

    // Monitor custom metrics
    this.monitorCustomMetrics();

    // Send metrics periodically
    this.startPeriodicReporting();
  }

  private handleMetric(metric: any) {
    if (!this.isEnabled) return;

    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      rating: this.getRating(metric.name, metric.value),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.metrics.push(performanceMetric);
    
    // Log poor performance immediately
    if (performanceMetric.rating === 'poor') {
      console.warn(`Poor ${metric.name} performance:`, performanceMetric);
      this.reportMetric(performanceMetric);
    }
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private monitorCustomMetrics() {
    // Monitor API response times
    this.monitorApiPerformance();
    
    // Monitor component render times
    this.monitorComponentPerformance();
    
    // Monitor resource loading
    this.monitorResourceLoading();
  }

  private monitorApiPerformance() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0] as string;
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Only monitor API calls
        if (url.includes('/api/')) {
          this.recordCustomMetric('API_Response_Time', duration, url);
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordCustomMetric('API_Error_Time', duration, url);
        throw error;
      }
    };
  }

  private monitorComponentPerformance() {
    // Monitor React component render times using Performance Observer
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('React')) {
            this.recordCustomMetric('Component_Render_Time', entry.duration, entry.name);
          }
        }
      });
      
      observer.observe({ entryTypes: ['measure'] });
    }
  }

  private monitorResourceLoading() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Monitor large resources
          if (resourceEntry.transferSize > 100000) { // > 100KB
            this.recordCustomMetric(
              'Large_Resource_Load_Time',
              resourceEntry.duration,
              resourceEntry.name
            );
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  private recordCustomMetric(name: string, value: number, url: string) {
    const metric: PerformanceMetric = {
      name,
      value,
      rating: this.getCustomRating(name, value),
      timestamp: Date.now(),
      url,
      userAgent: navigator.userAgent,
    };

    this.metrics.push(metric);
  }

  private getCustomRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    switch (name) {
      case 'API_Response_Time':
        if (value <= 500) return 'good';
        if (value <= 1000) return 'needs-improvement';
        return 'poor';
      
      case 'Component_Render_Time':
        if (value <= 16) return 'good'; // 60fps
        if (value <= 33) return 'needs-improvement'; // 30fps
        return 'poor';
      
      case 'Large_Resource_Load_Time':
        if (value <= 2000) return 'good';
        if (value <= 4000) return 'needs-improvement';
        return 'poor';
      
      default:
        return 'good';
    }
  }

  private startPeriodicReporting() {
    // Report metrics every 30 seconds
    setInterval(() => {
      if (this.metrics.length > 0) {
        this.reportMetrics();
      }
    }, 30000);

    // Report on page unload
    window.addEventListener('beforeunload', () => {
      this.reportMetrics();
    });
  }

  private async reportMetric(metric: PerformanceMetric) {
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: [metric] }),
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to report performance metric:', error);
    }
  }

  private async reportMetrics() {
    if (this.metrics.length === 0) return;

    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: this.metrics }),
        keepalive: true,
      });

      // Clear reported metrics
      this.metrics = [];
    } catch (error) {
      console.error('Failed to report performance metrics:', error);
    }
  }

  // Public methods for manual performance tracking
  public startTiming(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.recordCustomMetric(name, duration, window.location.href);
    };
  }

  public recordPageLoad() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      this.recordCustomMetric('Page_Load_Time', navigation.loadEventEnd - navigation.fetchStart, window.location.href);
      this.recordCustomMetric('DOM_Content_Loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart, window.location.href);
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getAverageMetric(name: string): number {
    const relevantMetrics = this.metrics.filter(m => m.name === name);
    if (relevantMetrics.length === 0) return 0;
    
    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / relevantMetrics.length;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const startTiming = (operationName: string) => {
    return performanceMonitor.startTiming(`${componentName}_${operationName}`);
  };

  return { startTiming };
}

// Higher-order component for automatic performance monitoring
export function withPerformanceMonitoring<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: T) {
    const { startTiming } = usePerformanceMonitor(componentName);
    
    React.useEffect(() => {
      const endTiming = startTiming('Mount');
      return endTiming;
    }, [startTiming]);

    return React.createElement(Component, props);
  };
}