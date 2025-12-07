import { NextRequest, NextResponse } from 'next/server';
import { getServices, ServiceDataPlan } from '@/lib/api/inlomax';
import { DATA_PLANS } from '@/lib/constants';

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
function transformPlan(plan: ServiceDataPlan) {
  return {
    id: plan.serviceID,
    name: plan.dataPlan,
    size: plan.dataPlan,
    price: parseAmount(plan.amount),
    validity: plan.validity,
    type: mapDataType(plan.dataType),
    network: plan.network,
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

    const useSandbox = process.env.INLOMAX_SANDBOX !== 'false';


    // In sandbox mode, return static plans
    if (useSandbox) {
      const networkKey = network as keyof typeof DATA_PLANS;
      const plans = DATA_PLANS[networkKey] || [];
      
      return NextResponse.json({
        status: 'success',
        data: plans,
        source: 'static',
      });
    }

    // Fetch real plans from Inlomax API
    try {
      const result = await getServices();
      
      if (result.status === 'success' && result.data?.dataPlans) {
        // Filter plans by network and transform to our format
        const networkPlans = result.data.dataPlans
          .filter((plan) => plan.network.toUpperCase() === network)
          .map(transformPlan)
          .sort((a, b) => a.price - b.price); // Sort by price

        return NextResponse.json({
          status: 'success',
          data: networkPlans,
          source: 'inlomax',
        });
      }
    } catch (apiError) {
      console.error('Inlomax API error, falling back to static plans:', apiError);
    }

    // Fallback to static plans if API fails
    const networkKey = network as keyof typeof DATA_PLANS;
    const plans = DATA_PLANS[networkKey] || [];

    return NextResponse.json({
      status: 'success',
      data: plans,
      source: 'static',
      message: 'Using cached plans',
    });

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
