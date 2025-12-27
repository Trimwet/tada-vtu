import { NextRequest, NextResponse } from 'next/server';

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

// Test a small withdrawal to see exact error
export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    
    if (!secretKey) {
      return NextResponse.json({
        status: 'error',
        message: 'FLUTTERWAVE_SECRET_KEY not configured'
      }, { status: 500 });
    }

    const { bankCode, accountNumber, amount } = await request.json();

    // Default test values if not provided
    const testBankCode = bankCode || '044'; // Access Bank
    const testAccountNumber = accountNumber || '0690000031'; // Test account
    const testAmount = amount || 100; // Small test amount

    console.log('[TEST-WITHDRAWAL] Testing withdrawal with:', {
      bankCode: testBankCode,
      accountNumber: testAccountNumber,
      amount: testAmount
    });

    // Step 1: Verify the account first
    console.log('[TEST-WITHDRAWAL] Step 1: Verifying account...');
    const verifyResponse = await fetch(`${FLW_BASE_URL}/accounts/resolve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_number: testAccountNumber,
        account_bank: testBankCode
      })
    });

    const verifyText = await verifyResponse.text();
    let verifyResult;
    
    try {
      verifyResult = JSON.parse(verifyText);
    } catch {
      verifyResult = { status: 'error', message: 'Account verification failed', raw: verifyText.substring(0, 200) };
    }

    console.log('[TEST-WITHDRAWAL] Account verification result:', verifyResult);

    if (verifyResult.status !== 'success') {
      return NextResponse.json({
        status: 'error',
        step: 'account_verification',
        message: 'Account verification failed',
        details: verifyResult,
        recommendation: 'The bank account could not be verified. Check the account number and bank code.'
      });
    }

    // Step 2: Attempt the transfer
    console.log('[TEST-WITHDRAWAL] Step 2: Attempting transfer...');
    const reference = `TEST-WD-${Date.now()}`;
    
    const transferResponse = await fetch(`${FLW_BASE_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_bank: testBankCode,
        account_number: testAccountNumber,
        amount: testAmount,
        narration: 'TADA VTU Test Withdrawal',
        currency: 'NGN',
        reference: reference,
        callback_url: `${process.env.NEXTAUTH_URL || 'https://www.tadavtu.com'}/api/flutterwave/webhook`,
        debit_currency: 'NGN',
        meta: {
          test: true,
          type: 'test_withdrawal'
        }
      })
    });

    const transferText = await transferResponse.text();
    let transferResult;
    
    try {
      transferResult = JSON.parse(transferText);
    } catch {
      transferResult = { status: 'error', message: 'Transfer API returned invalid response', raw: transferText.substring(0, 500) };
    }

    console.log('[TEST-WITHDRAWAL] Transfer result:', JSON.stringify(transferResult, null, 2));

    return NextResponse.json({
      status: transferResult.status === 'success' ? 'success' : 'error',
      message: 'Test withdrawal completed',
      steps: {
        account_verification: {
          status: verifyResult.status,
          account_name: verifyResult.data?.account_name,
          message: verifyResult.message
        },
        transfer_attempt: {
          status: transferResult.status,
          message: transferResult.message,
          data: transferResult.data,
          reference: reference
        }
      },
      analysis: analyzeTransferResult(transferResult),
      raw_response: transferResult
    });

  } catch (error) {
    console.error('[TEST-WITHDRAWAL] Error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Test withdrawal failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function analyzeTransferResult(result: any): any {
  if (result.status === 'success') {
    return {
      verdict: '✅ Transfer initiated successfully',
      next_steps: [
        'The transfer was accepted by Flutterwave',
        'Check the webhook for status updates',
        'Monitor your Flutterwave dashboard'
      ]
    };
  }

  const message = result.message?.toLowerCase() || '';
  
  if (message.includes('merchant')) {
    return {
      verdict: '❌ Merchant account issue',
      likely_cause: 'Transfer functionality not fully enabled',
      solution: 'Contact Flutterwave support to enable payouts/transfers',
      contact: 'developers@flutterwavego.com'
    };
  }
  
  if (message.includes('insufficient')) {
    return {
      verdict: '❌ Insufficient balance',
      likely_cause: 'Not enough funds in Flutterwave account',
      solution: 'Fund your Flutterwave account or reduce transfer amount'
    };
  }
  
  if (message.includes('limit')) {
    return {
      verdict: '❌ Transfer limit exceeded',
      likely_cause: 'Amount exceeds daily/monthly limits',
      solution: 'Check your account limits in Flutterwave dashboard'
    };
  }
  
  if (message.includes('kyc') || message.includes('verification')) {
    return {
      verdict: '❌ KYC/Verification required',
      likely_cause: 'Account needs additional verification',
      solution: 'Complete KYC verification in your Flutterwave dashboard'
    };
  }

  return {
    verdict: '❌ Unknown transfer error',
    message: result.message,
    solution: 'Check the raw response for more details'
  };
}