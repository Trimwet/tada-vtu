import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

/**
 * Cleanup expired gift rooms and process refunds
 * This endpoint should be called by a cron job (Vercel Cron, GitHub Actions, etc.)
 * 
 * Schedule: Daily at midnight UTC (0 0 * * *)
 * 
 * Environmental Requirements:
 * - CRON_SECRET: Secret token to authenticate cron requests
 */
export async function GET(request: Request) {
    try {
        // Verify cron secret for security
        const authHeader = request.headers.get('authorization');
        const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

        if (!process.env.CRON_SECRET) {
            console.error('CRON_SECRET environment variable not set');
            return NextResponse.json(
                { success: false, error: 'Server configuration error' },
                { status: 500 }
            );
        }

        if (authHeader !== expectedAuth) {
            console.warn('Unauthorized cleanup attempt', {
                timestamp: new Date().toISOString(),
                authHeader: authHeader ? 'present' : 'missing'
            });
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Call cleanup function
        const supabase = createAdminClient();
        const { data, error } = await supabase.rpc('cleanup_expired_gift_rooms');

        if (error) {
            console.error('Error during gift room cleanup:', error);
            return NextResponse.json(
                {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                },
                { status: 500 }
            );
        }

        // Log successful cleanup
        console.log('Gift room cleanup completed successfully', {
            timestamp: new Date().toISOString(),
            result: data
        });

        return NextResponse.json({
            success: true,
            data: {
                message: 'Cleanup completed successfully',
                result: data,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Unexpected error during cleanup:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
