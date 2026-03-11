import { NextRequest, NextResponse } from 'next/server';
import { getServices, ServiceDataPlan } from '@/lib/api/inlomax';

// Map Inlomax data types to our internal types
function mapDataType(inlomaxType: string): string {
  const type = inlomaxType.toUpperCase();

  if (type.includes('SME') && type.includes('SHARE')) return 'sme_share';
  if (type === 'SME') return 'sme';

  if (type.includes('CORPORATE') && type.includes('GIFTING')) return 'corporate_gifting';
  if (type === 'CG') return 'corporate_gifting';
  if (type === 'CORPORATE') return 'corporate';

  if (type === 'GIFTING') return 'gifting';
  if (type === 'AWOOF') return 'awoof';
  if (type === 'AWOOF/GIFTING') return 'gifting';

  if (type === 'DIRECT') return 'direct';
  if (type === 'SOCIAL') return 'social';

  return type.toLowerCase().replace(/\s+/g, '_');
}

// Parse amount string to number
function parseAmount(amount: string): number {
  return parseFloat(amount.replace(/,/g, '')) || 0;
}

// Transform Inlomax data plan to our format
function transformPlan(plan: ServiceDataPlan, index: number) {
  return {
    id: `${plan.serviceID}-${plan.dataType || 'default'}-${index}`,
    serviceID: plan.serviceID,
    name: plan.dataPlan,
    description: plan.dataPlan,
    size: plan.dataPlan,
    price: parseAmount(plan.amount),
    validity: plan.validity || '30 Days',
    type: mapDataType(plan.dataType || 'SME'),
    network: plan.network.toUpperCase(),
    dataType: plan.dataType,
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

    const normalizedNetwork = network === 'ETISALAT' ? '9MOBILE' : network;

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Provider API timeout')), 8000)
      );

      const result = await Promise.race([
        getServices(),
        timeoutPromise
      ]) as Awaited<ReturnType<typeof getServices>>;

      if (result.status === 'success' && result.data?.dataPlans) {
        const networkPlans = result.data.dataPlans
          .filter((plan) => {
            const planNetwork = plan.network.toUpperCase();
            return planNetwork === normalizedNetwork ||
              (planNetwork === 'ETISALAT' && normalizedNetwork === '9MOBILE');
          })
          .map((plan, index) => transformPlan(plan, index))
          .filter((plan) => plan.price > 0)
          .sort((a, b) => a.price - b.price);

        const types = [...new Set(networkPlans.map(p => p.type))];

        return NextResponse.json({
          status: 'success',
          data: networkPlans,
          source: 'tada',
          network: normalizedNetwork,
          totalPlans: networkPlans.length,
          types,
        }, {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        });
      }

      throw new Error('Invalid response from provider');
    } catch (apiError) {
      console.error('[DATA-PLANS] Provider API error:', apiError);
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
    console.error('[DATA-PLANS] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch data plans',
      },
      { status: 500 }
    );
  }
}
