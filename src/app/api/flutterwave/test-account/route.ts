import { NextRequest, NextResponse } from 'next/server';

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

// Test Flutterwave account configuration
export async function GET(request: NextRequest) {
  try {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    
    if (!secretKey) {
      return NextResponse.json({
        status: 'error',
        message: 'FLUTTERWAVE_SECRET_KEY not configured'
      }, { status: 500 });
    }

    // Test 1: Check if we can authenticate
    console.log('[FLW-TEST] Testing authentication...');
    const authResponse = await fetch(`${FLW_BASE_URL}/banks/NG`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const authResult = await authResponse.json();
    
    if (authResult.status !== 'success') {
      return NextResponse.json({
        status: 'error',
        message: 'Authentication failed',
        details: authResult
      }, { status: 401 });
    }

    // Test 2: Check merchant balance
    console.log('[FLW-TEST] Checking merchant balance...');
    const balanceResponse = await fetch(`${FLW_BASE_URL}/balances`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const balanceResult = await balanceResponse.json();

    // Test 3: Try to get transfer fee (this will show if transfers are enabled)
    console.log('[FLW-TEST] Testing transfer fee endpoint...');
    const feeResponse = await fetch(`${FLW_BASE_URL}/transfers/fee?amount=1000&currency=NGN`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const feeResult = await feeResponse.json();

    // Test 4: Check merchant profile/settings
    console.log('[FLW-TEST] Checking merchant profile...');
    const profileResponse = await fetch(`${FLW_BASE_URL}/merchant/profile`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const profileResult = await profileResponse.json();

    return NextResponse.json({
      status: 'success',
      message: 'Flutterwave account test completed',
      tests: {
        authentication: {
          status: authResult.status,
          message: authResult.message || 'OK'
        },
        balance: {
          status: balanceResult.status,
          data: balanceResult.data,
          message: balanceResult.message
        },
        transfer_fee: {
          status: feeResult.status,
          data: feeResult.data,
          message: feeResult.message
        },
        profile: {
          status: profileResult.status,
          data: profileResult.data ? {
            business_name: profileResult.data.business_name,
            business_email: profileResult.data.business_email,
            account_status: profileResult.data.account_status,
            kyc_status: profileResult.data.kyc_status
          } : null,
          message: profileResult.message
        }
      },
      recommendations: generateRecommendations(balanceResult, feeResult, profileResult)
    });

  } catch (error) {
    console.error('[FLW-TEST] Error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateRecommendations(balanceResult: any, feeResult: any, profileResult: any): string[] {
  const recommendations: string[] = [];

  if (balanceResult.status !== 'success') {
    recommendations.push('❌ Cannot access balance - check API permissions');
  }

  if (feeResult.status !== 'success') {
    recommendations.push('❌ Transfer fee check failed - transfers may not be enabled');
    recommendations.push('💡 Contact Flutterwave to enable transfer/payout functionality');
  }

  if (profileResult.status === 'success' && profileResult.data) {
    const profile = profileResult.data;
    
    if (profile.account_status !== 'active') {
      recommendations.push(`❌ Account status: ${profile.account_status} - needs to be active`);
    }
    
    if (profile.kyc_status !== 'approved') {
      recommendations.push(`❌ KYC status: ${profile.kyc_status} - complete KYC verification`);
    }
  }

  if (balanceResult.status === 'success' && balanceResult.data) {
    const ngnBalance = balanceResult.data.find((b: any) => b.currency === 'NGN');
    if (ngnBalance && ngnBalance.available_balance < 1000) {
      recommendations.push('⚠️ Low NGN balance - fund your Flutterwave account for transfers');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Account looks good - transfers should work');
  }

  return recommendations;
}