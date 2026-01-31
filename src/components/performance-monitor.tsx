"use client";

import { useEffect } from 'react';

/**
 * Lightweight performance monitoring for TADA VTU
 * Tracks Core Web Vitals and reports to analytics
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV !== 'production') return;

    // Track Core Web Vitals with correct API
    const trackWebVitals = async () => {
      try {
        const { onCLS, onFID, onFCP, onLCP, onTTFB } = await import('web-vitals');
        
        // Track each metric with proper types
        onCLS((metric) => {
          // Report to analytics
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'web_vitals', {
              event_category: 'Performance',
              event_label: 'CLS',
              value: Math.round(metric.value * 1000),
              custom_map: { metric_id: 'cls' }
            });
          }
        });

        onFID((metric) => {
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'web_vitals', {
              event_category: 'Performance',
              event_label: 'FID',
              value: Math.round(metric.value),
              custom_map: { metric_id: 'fid' }
            });
          }
        });

        onFCP((metric) => {
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'web_vitals', {
              event_category: 'Performance',
              event_label: 'FCP',
              value: Math.round(metric.value),
              custom_map: { metric_id: 'fcp' }
            });
          }
        });

        onLCP((metric) => {
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'web_vitals', {
              event_category: 'Performance',
              event_label: 'LCP',
              value: Math.round(metric.value),
              custom_map: { metric_id: 'lcp' }
            });
          }
        });

        onTTFB((metric) => {
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'web_vitals', {
              event_category: 'Performance',
              event_label: 'TTFB',
              value: Math.round(metric.value),
              custom_map: { metric_id: 'ttfb' }
            });
          }
        });

      } catch (error) {
        // Silently fail if web-vitals is not available
        console.warn('Web Vitals tracking failed:', error);
      }
    };

    // Track performance metrics
    trackWebVitals();

    // Track bundle loading performance
    const trackBundlePerformance = () => {
      if (typeof window !== 'undefined' && window.performance) {
        const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const metrics = {
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp: navigation.connectEnd - navigation.connectStart,
            request: navigation.responseStart - navigation.requestStart,
            response: navigation.responseEnd - navigation.responseStart,
            dom: navigation.domContentLoadedEventEnd - navigation.responseEnd,
            load: navigation.loadEventEnd - navigation.loadEventStart,
          };

          // Report bundle performance
          if (window.gtag) {
            Object.entries(metrics).forEach(([key, value]) => {
              if (window.gtag) {
                window.gtag('event', 'bundle_performance', {
                  event_category: 'Performance',
                  event_label: key,
                  value: Math.round(value),
                });
              }
            });
          }
        }
      }
    };

    // Track after page load
    if (document.readyState === 'complete') {
      trackBundlePerformance();
    } else {
      const handleLoad = () => {
        trackBundlePerformance();
      };
      window.addEventListener('load', handleLoad);
      
      // Cleanup
      return () => {
        window.removeEventListener('load', handleLoad);
      };
    }
  }, []);

  // This component renders nothing
  return null;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}