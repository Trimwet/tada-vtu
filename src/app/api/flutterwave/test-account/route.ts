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

    const results: any = {
      authentication: null,
      balance: null,
      transfer_fee: null,
      profile: null
    };

    // Test 1: Check if we can authenticate (using banks endpoint as it's always available)
    console.log('[FLW-TEST] Testing authentication...');
    try {
      const authResponse = await fetch(`${FLW_BASE_URL}/banks/NG`, {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const authText = await authResponse.text();
      let authResult;
      
      try {
        authResult = JSON.parse(authText);
      } catch {
        authResult = { status: 'error', message: 'Invalid response format', raw: authText.substring(0, 100) };
      }

      results.authentication = {
        status: authResult.status || 'error',
        message: authResult.message || 'Authentication test completed'
      };
    } catch (error) {
      results.authentication = {
        status: 'error',
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`
      };
    }

    // Test 2: Check merchant balance (may not be available for all accounts)
    console.log('[FLW-TEST] Checking merchant balance...');
    try {
      const balanceResponse = await fetch(`${FLW_BASE_URL}/balances`, {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const balanceText = await balanceResponse.text();
      let balanceResult;
      
      try {
        balanceResult = JSON.parse(balanceText);
      } catch {
        balanceResult = { status: 'error', message: 'Balance endpoint not accessible', raw: balanceText.substring(0, 100) };
      }

      results.balance = {
        status: balanceResult.status || 'error',
        data: balanceResult.data || null,
        message: balanceResult.message || 'Balance check completed'
      };
    } catch (error) {
      results.balance = {
        status: 'error',
        message: `Balance check failed: ${error instanceof Error ? error.message : 'Unknown'}`
      };
    }

    // Test 3: Try to get transfer fee
    console.log('[FLW-TEST] Testing transfer fee endpoint...');
    try {
      const feeResponse = await fetch(`${FLW_BASE_URL}/transfers/fee?amount=1000&currency=NGN`, {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const feeText = await feeResponse.text();
      let feeResult;
      
      try {
        feeResult = JSON.parse(feeText);
      } catch {
        feeResult = { status: 'error', message: 'Transfer fee endpoint not accessible', raw: feeText.substring(0, 100) };
      }

      results.transfer_fee = {
        status: feeResult.status || 'error',
        data: feeResult.data || null,
        message: feeResult.message || 'Transfer fee check completed'
      };
    } catch (error) {
      results.transfer_fee = {
        status: 'error',
        message: `Transfer fee check failed: ${error instanceof Error ? error.message : 'Unknown'}`
      };
    }

    // Test 4: Try a simple transfer validation (safer than profile endpoint)
    console.log('[FLW-TEST] Testing transfer validation...');
    try {
      const validateResponse = await fetch(`${FLW_BASE_URL}/accounts/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_number: '0690000031', // Test account number
          account_bank: '044' // Access Bank
        })
      });

      const validateText = await validateResponse.text();
      let validateResult;
      
      try {
        validateResult = JSON.parse(validateText);
      } catch {
        validateResult = { status: 'error', message: 'Account validation not accessible', raw: validateText.substring(0, 100) };
      }

      results.profile = {
        status: validateResult.status || 'error',
        message: validateResult.message || 'Account validation test completed',
        note: 'This tests if your API key can validate accounts (required for transfers)'
      };
    } catch (error) {
      results.profile = {
        status: 'error',
        message: `Account validation failed: ${error instanceof Error ? error.message : 'Unknown'}`
      };
    }

    return NextResponse.json({
      status: 'success',
      message: 'Flutterwave account test completed',
      tests: results,
      recommendations: generateRecommendations(results),
      summary: generateSummary(results)
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

function generateSummary(results: any): string {
  const authOk = results.authentication?.status === 'success';
  const transferOk = results.transfer_fee?.status === 'success';
  const validateOk = results.profile?.status === 'success';

  if (authOk && transferOk && validateOk) {
    return '✅ All tests passed - Transfers should work';
  } else if (authOk && validateOk) {
    return '⚠️ Basic functionality works, but transfers may need to be enabled';
  } else if (authOk) {
    return '⚠️ Authentication works, but transfer features are limited';
  } else {
    return '❌ API authentication failed - check your secret key';
  }
}

function generateRecommendations(results: any): string[] {
  const recommendations: string[] = [];

  if (results.authentication?.status !== 'success') {
    recommendations.push('❌ API authentication failed - verify your FLUTTERWAVE_SECRET_KEY');
    recommendations.push('💡 Check if you\'re using the correct secret key (not public key)');
  }

  if (results.transfer_fee?.status !== 'success') {
    recommendations.push('❌ Transfer fee endpoint not accessible');
    recommendations.push('💡 Contact Flutterwave support to enable transfer/payout functionality');
    recommendations.push('📧 Email: developers@flutterwavego.com');
  }

  if (results.profile?.status !== 'success') {
    recommendations.push('❌ Account validation failed');
    recommendations.push('💡 Your API key may not have sufficient permissions');
  }

  if (results.balance?.status !== 'success') {
    recommendations.push('⚠️ Cannot check balance - this may be normal for some account types');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Account configuration looks good');
    recommendations.push('💡 If withdrawals still fail, check your Flutterwave dashboard for any restrictions');
  }

  return recommendations;
}

