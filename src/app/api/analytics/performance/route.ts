import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userAgent: string;
}

export async function POST(request: NextRequest) {
  try {
    const { metrics }: { metrics: PerformanceMetric[] } = await request.json();

    if (!metrics || !Array.isArray(metrics)) {
      return NextResponse.json(
        { error: "Invalid metrics data" },
        { status: 400 }
      );
    }

    // For now, just log the metrics (you can implement database storage later)
    console.log('Performance metrics received:', {
      count: metrics.length,
      types: [...new Set(metrics.map(m => m.name))],
      poorMetrics: metrics.filter(m => m.rating === 'poor').length
    });

    // Check for performance issues and alert if necessary
    const poorMetrics = metrics.filter(m => m.rating === 'poor');
    if (poorMetrics.length > 0) {
      await alertPerformanceIssues(poorMetrics);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Performance analytics error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const timeframe = searchParams.get('timeframe') || '24h';
    const metric = searchParams.get('metric');
    
    // For now, return mock data (you can implement database queries later)
    const mockMetrics = [
      {
        name: 'LCP',
        value: 2100,
        rating: 'good',
        timestamp: new Date().toISOString(),
        url: '/dashboard',
        userAgent: 'Mock User Agent',
        user_id: null,
        created_at: new Date().toISOString(),
      }
    ];
    
    const stats = calculatePerformanceStats(mockMetrics);
    
    return NextResponse.json({
      metrics: mockMetrics,
      stats,
      timeframe,
    });

  } catch (error) {
    console.error('Performance analytics fetch error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function alertPerformanceIssues(poorMetrics: PerformanceMetric[]) {
  // Group by metric type
  const groupedMetrics = poorMetrics.reduce((acc, metric) => {
    if (!acc[metric.name]) {
      acc[metric.name] = [];
    }
    acc[metric.name].push(metric);
    return acc;
  }, {} as Record<string, PerformanceMetric[]>);

  // Send alerts for critical performance issues
  for (const [metricName, metrics] of Object.entries(groupedMetrics)) {
    if (metrics.length >= 3) { // Alert if 3+ poor metrics of same type
      console.warn(`Performance Alert: ${metricName} has ${metrics.length} poor ratings`);
      
      // Here you could integrate with alerting services like:
      // - Slack webhook
      // - Email notification
      // - Discord webhook
      // - PagerDuty
      
      // Example: Send to monitoring service
      try {
        await fetch(process.env.MONITORING_WEBHOOK_URL || '', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert: 'Performance Issue',
            metric: metricName,
            count: metrics.length,
            averageValue: metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length,
            urls: [...new Set(metrics.map(m => m.url))],
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.error('Failed to send performance alert:', error);
      }
    }
  }
}

function calculatePerformanceStats(metrics: any[]) {
  if (metrics.length === 0) {
    return {
      totalMetrics: 0,
      averagesByMetric: {},
      ratingDistribution: { good: 0, 'needs-improvement': 0, poor: 0 },
      topIssues: [],
    };
  }

  // Group by metric name
  const metricGroups = metrics.reduce((acc: Record<string, any[]>, metric) => {
    if (!acc[metric.name]) {
      acc[metric.name] = [];
    }
    acc[metric.name].push(metric);
    return acc;
  }, {});

  // Calculate averages
  const averagesByMetric = Object.entries(metricGroups).reduce((acc: Record<string, any>, [name, values]) => {
    const sum = values.reduce((s, v) => s + v.value, 0);
    acc[name] = {
      average: sum / values.length,
      count: values.length,
      min: Math.min(...values.map(v => v.value)),
      max: Math.max(...values.map(v => v.value)),
    };
    return acc;
  }, {});

  // Rating distribution
  const ratingDistribution = metrics.reduce((acc: Record<string, number>, metric) => {
    acc[metric.rating] = (acc[metric.rating] || 0) + 1;
    return acc;
  }, { good: 0, 'needs-improvement': 0, poor: 0 });

  // Top performance issues
  const poorMetrics = metrics.filter(m => m.rating === 'poor');
  const issueGroups = poorMetrics.reduce((acc: Record<string, any>, metric) => {
    const key = `${metric.name}:${metric.url}`;
    if (!acc[key]) {
      acc[key] = { name: metric.name, url: metric.url, count: 0, totalValue: 0 };
    }
    acc[key].count++;
    acc[key].totalValue += metric.value;
    return acc;
  }, {});

  const topIssues = Object.values(issueGroups)
    .map((issue: any) => ({
      ...issue,
      averageValue: issue.totalValue / issue.count,
    }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);

  return {
    totalMetrics: metrics.length,
    averagesByMetric,
    ratingDistribution,
    topIssues,
  };
}