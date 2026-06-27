import { NextResponse } from 'next/server';
import { getServices } from '@/lib/api/inlomax';

export async function GET() {
  try {
    const useSandbox = process.env.INLOMAX_SANDBOX !== 'false';

    if (useSandbox) {
      // Return static service types in sandbox mode
      const services = {
        airtime: ['MTN', 'Airtel', 'Glo', '9mobile'],
        data: ['MTN', 'Airtel', 'Glo', '9mobile'],
      };
      return NextResponse.json({ status: 'success', data: services });
    }

    // Fetch real services from Inlomax API
    const result = await getServices();
    
    if (result.status === 'success' && result.data) {
      const data = result.data as {
        airtime?: unknown[];
        data?: unknown[];
      };
      return NextResponse.json({
        status: 'success',
        data: {
          airtime: data.airtime ?? [],
          data: data.data ?? [],
        }
      });
    }

    return NextResponse.json({
      status: 'error',
      message: result.message || 'Failed to fetch services'
    }, { status: 500 });

  } catch (error) {
    console.error('Error fetching Inlomax services:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to fetch services' 
      },
      { status: 500 }
    );
  }
}
