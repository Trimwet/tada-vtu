import { NextRequest, NextResponse } from 'next/server';
import { giftRoomIntegration } from '@/lib/gift-room-integration';

export async function GET(request: NextRequest) {
  try {
    // Perform comprehensive health check
    const healthCheck = await giftRoomIntegration.runHealthCheck();
    
    // Get system statistics
    const stats = await giftRoomIntegration.getSystemStats();
    
    // Validate configuration
    const config = await giftRoomIntegration.checkPermissions();

    const response = {
      status: healthCheck.overall,
      timestamp: healthCheck.timestamp,
      health_checks: healthCheck.checks,
      system_stats: stats,
      configuration: config,
      version: '1.0.0',
    };

    // Return appropriate HTTP status based on health
    const httpStatus = healthCheck.overall === 'healthy' ? 200 : 
                      healthCheck.overall === 'warning' ? 200 : 503;

    return NextResponse.json(response, { status: httpStatus });

  } catch (error) {
    console.error('Health check endpoint error:', error);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Allow POST for triggering health checks
export async function POST(request: NextRequest) {
  return GET(request);
}