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
        cable: ['DSTV', 'GOTV', 'Startimes'],
        electricity: ['IKEDC', 'EKEDC', 'AEDC', 'KEDCO', 'PHED', 'JED', 'IBEDC', 'KAEDCO', 'BEDC'],
      };
      return NextResponse.json({ status: 'success', data: services });
    }

    // Fetch real services from Inlomax API
    const result = await getServices();
    
    if (result.status === 'success' && result.data) {
      return NextResponse.json({
        status: 'success',
        data: result.data
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
