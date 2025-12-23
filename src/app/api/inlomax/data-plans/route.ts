import { NextRequest, NextResponse } from 'next/server';
import { getServices, ServiceDataPlan } from '@/lib/api/inlomax';

// Map Inlomax data types to our internal types
function mapDataType(inlomaxType: string): string {
  const typeMap: Record<string, string> = {
    'SME': 'sme',
    'SME SHARE': 'sme',
    'SHARE': 'sme',
    'CORPORATE GIFTING': 'corporate',
    'CORPORATE': 'corporate',
    'CG': 'corporate',
    'GIFTING': 'awoof',
    'AWOOF': 'awoof',
    'AWOOF/GIFTING': 'awoof',
    'DIRECT': 'direct',
    'SOCIAL': 'social',
  };
  return typeMap[inlomaxType.toUpperCase()] || 'sme';
}

// Parse amount string to number (handles "205.00" format)
function parseAmount(amount: string): number {
  return parseFloat(amount.replace(/,/g, '')) || 0;
}

// Transform Inlomax data plan to our format
function transformPlan(plan: ServiceDataPlan, index: number) {
  return {
    id: `${plan.serviceID}-${plan.dataType || 'default'}-${index}`, // Unique ID
    serviceID: plan.serviceID, // Keep original for purchase
    name: plan.dataPlan,
    size: plan.dataPlan,
    price: parseAmount(plan.amount),
    validity: plan.validity || '30 Days',
    type: mapDataType(plan.dataType || 'SME'),
    network: plan.network.toUpperCase(),
    dataType: plan.dataType, // Keep original type for display
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network')?.toUpperCase();

    if (!network) {
      return NextResponse.json(
        { status: 'error', message: 'Network parameter is required' },
        { status: 400 }
      );
    }

    // Normalize network name (handle 9MOBILE/ETISALAT)
    const normalizedNetwork = network === 'ETISALAT' ? '9MOBILE' : network;

    // Fetch real plans from Inlomax API
    try {
      const result = await getServices();
      
      if (result.status === 'success' && result.data?.dataPlans) {
        // Filter plans by network and transform to our format
        const networkPlans = result.data.dataPlans
          .filter((plan) => {
            const planNetwork = plan.network.toUpperCase();
            return planNetwork === normalizedNetwork || 
                   (planNetwork === 'ETISALAT' && normalizedNetwork === '9MOBILE');
          })
          .map((plan, index) => transformPlan(plan, index))
          .filter((plan) => plan.price > 0) // Filter out zero-price plans
          .sort((a, b) => a.price - b.price); // Sort by price

        console.log(`[DATA-PLANS] Found ${networkPlans.length} plans for ${normalizedNetwork}`);
        
        // Get unique types for this network
        const types = [...new Set(networkPlans.map(p => p.type))];
        console.log(`[DATA-PLANS] Types available: ${types.join(', ')}`);

        return NextResponse.json({
          status: 'success',
          data: networkPlans,
          source: 'inlomax',
          network: normalizedNetwork,
          totalPlans: networkPlans.length,
          types,
        }, {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        });
      }
      
      throw new Error('Invalid response from Inlomax');
    } catch (apiError) {
      console.error('Inlomax API error:', apiError);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to fetch plans from provider',
          error: apiError instanceof Error ? apiError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error fetching data plans:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch data plans',
      },
      { status: 500 }
    );
  }
}
