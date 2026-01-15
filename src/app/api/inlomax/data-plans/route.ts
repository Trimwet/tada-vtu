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

  // Fallback: use lowercased original type if not matched
  return type.toLowerCase().replace(/\s+/g, '_');
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
    description: plan.dataPlan, // Pass full name as description for now
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

    // Fetch real plans from Inlomax API with timeout
    try {
      // Create a promise that rejects after 8 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Inlomax API timeout')), 8000)
      );

      const result = await Promise.race([
        getServices(),
        timeoutPromise
      ]) as Awaited<ReturnType<typeof getServices>>;

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
