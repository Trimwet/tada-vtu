/**
 * Enhanced VTU Airtime API Route
 * Demonstrates all security features and best practices
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase/server';
import { TransactionIdempotency } from '@/lib/transaction-idempotency';
import { circuitBreakers, EnhancedVTUService } from '@/lib/circuit-breaker';
import { loggers } from '@/lib/logger';
import { AuditLogger, withAuditContext } from '@/lib/audit-logger';
import { BackgroundJobProcessor } from '@/lib/background-jobs';

// Request validation schema
const AirtimeRequestSchema = z.object({
  phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, 'Invalid Nigerian phone number'),
  amount: z.number().min(50).max(50000),
  network: z.enum(['MTN', 'AIRTEL', 'GLO', '9MOBILE']),
  pin: z.string().length(4).regex(/^\d{4}$/, 'PIN must be 4 digits'),
  beneficiaryId: z.string().uuid().optional(),
  saveAsBeneficiary: z.boolean().default(false),
  beneficiaryName: z.string().max(100).optional()
});

type AirtimeRequest = z.infer<typeof AirtimeRequestSchema>;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    // 1. Parse and validate request
    const body = await request.json();
    const validatedData = AirtimeRequestSchema.parse(body);
    
    // 2. Get authenticated user
    const supabase = getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      await AuditLogger.logSecurity('unauthorized_access', undefined, {
        endpoint: '/api/vtu/airtime',
        ip: request.headers.get('x-forwarded-for')
      });
      
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // 3. Rate limiting check
    const rateLimitKey = `airtime:${user.id}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, 10, 3600); // 10 per hour
    
    if (!rateLimitResult.allowed) {
      await AuditLogger.logSecurity('rate_limit_exceeded', user.id, {
        endpoint: '/api/vtu/airtime',
        limit: 10,
        window: 3600
      });
      
      return NextResponse.json({
        success: false,
        error: { 
          code: 'RATE_LIMIT_EXCEEDED', 
          message: `Rate limit exceeded. Try again in ${rateLimitResult.resetTime} seconds` 
        }
      }, { status: 429 });
    }

    // 4. Verify transaction PIN
    const { data: userProfile } = await supabase
      .from('users')
      .select('transaction_pin, balance, is_active')
      .eq('id', user.id)
      .single();

    if (!userProfile?.is_active) {
      return NextResponse.json({
        success: false,
        error: { code: 'ACCOUNT_INACTIVE', message: 'Account is inactive' }
      }, { status: 403 });
    }

    if (!userProfile.transaction_pin) {
      return NextResponse.json({
        success: false,
        error: { code: 'PIN_NOT_SET', message: 'Transaction PIN not set' }
      }, { status: 400 });
    }

    const pinValid = await verifyTransactionPIN(userProfile.transaction_pin, validatedData.pin);
    if (!pinValid) {
      await AuditLogger.logSecurity('invalid_pin', user.id, {
        endpoint: '/api/vtu/airtime',
        phone: validatedData.phone
      });
      
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_PIN', message: 'Invalid transaction PIN' }
      }, { status: 400 });
    }

    // 5. Check sufficient balance
    if (userProfile.balance < validatedData.amount) {
      return NextResponse.json({
        success: false,
        error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient wallet balance' }
      }, { status: 400 });
    }

    // 6. Execute transaction with idempotency protection
    const transactionData = {
      type: 'airtime',
      amount: validatedData.amount,
      recipient: validatedData.phone,
      reference: `AIRTIME_${Date.now()}_${user.id.substring(0, 8)}`
    };

    const result = await TransactionIdempotency.executeWithIdempotency(
      user.id,
      transactionData,
      async () => {
        // Create pending transaction
        const { transactionId, newBalance } = await TransactionIdempotency.createIdempotentTransaction(
          user.id,
          {
            type: 'airtime',
            amount: validatedData.amount,
            description: `Airtime purchase for ${validatedData.phone}`,
            reference: transactionData.reference,
            metadata: {
              phone: validatedData.phone,
              network: validatedData.network,
              beneficiaryId: validatedData.beneficiaryId
            }
          }
        );

        // Log transaction initiation
        loggers.vtu.transaction('initiated', {
          userId: user.id,
          transactionId,
          amount: validatedData.amount,
          phone: validatedData.phone,
          network: validatedData.network,
          requestId
        });

        await AuditLogger.logTransaction('create', transactionId, user.id, 
          undefined,
          {
            amount: validatedData.amount,
            phone: validatedData.phone,
            network: validatedData.network,
            status: 'pending'
          },
          withAuditContext(request, user.id)
        );

        // Execute VTU transaction with circuit breaker
        const vtuService = new EnhancedVTUService();
        
        try {
          const vtuResult = await vtuService.executeTransaction('inlomax', async () => {
            return await callInlomaxAirtime({
              phone: validatedData.phone,
              amount: validatedData.amount,
              network: validatedData.network,
              reference: transactionData.reference
            });
          });

          // Update transaction status
          await supabase
            .from('transactions')
            .update({ 
              status: vtuResult.success ? 'success' : 'failed',
              provider_reference: vtuResult.reference,
              error_message: vtuResult.success ? null : vtuResult.error,
              completed_at: new Date().toISOString()
            })
            .eq('id', transactionId);

          if (!vtuResult.success) {
            // Refund user on failure
            await supabase.rpc('atomic_wallet_update', {
              p_user_id: user.id,
              p_amount: validatedData.amount,
              p_description: `Refund for failed airtime purchase ${transactionId}`,
              p_reference: `REFUND_${transactionId}`,
              p_type: 'refund'
            });

            // Schedule retry job
            await BackgroundJobProcessor.enqueue('retry_failed_transaction', {
              transactionId,
              userId: user.id,
              provider: 'inlomax'
            });
          }

          // Save beneficiary if requested
          if (validatedData.saveAsBeneficiary && validatedData.beneficiaryName) {
            await saveBeneficiary(user.id, {
              name: validatedData.beneficiaryName,
              phone: validatedData.phone,
              network: validatedData.network,
              type: 'airtime'
            });
          }

          loggers.vtu.transaction(vtuResult.success ? 'success' : 'failed', {
            userId: user.id,
            transactionId,
            provider: 'inlomax',
            providerReference: vtuResult.reference,
            requestId
          });

          return {
            transactionId,
            reference: transactionData.reference,
            status: vtuResult.success ? 'success' : 'failed',
            amount: validatedData.amount,
            newBalance: vtuResult.success ? newBalance : userProfile.balance,
            providerReference: vtuResult.reference,
            message: vtuResult.success ? 'Airtime purchase successful' : vtuResult.error
          };

        } catch (error) {
          // Handle circuit breaker or other errors
          loggers.vtu.error('VTU transaction failed', {
            userId: user.id,
            transactionId,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId
          });

          // Mark transaction as failed
          await supabase
            .from('transactions')
            .update({ 
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              completed_at: new Date().toISOString()
            })
            .eq('id', transactionId);

          // Refund user
          await supabase.rpc('atomic_wallet_update', {
            p_user_id: user.id,
            p_amount: validatedData.amount,
            p_description: `Refund for failed airtime purchase ${transactionId}`,
            p_reference: `REFUND_${transactionId}`,
            p_type: 'refund'
          });

          throw error;
        }
      }
    );

    // Log API performance
    const duration = Date.now() - startTime;
    loggers.api.apiRequest('POST', '/api/vtu/airtime', 200, duration, {
      userId: user.id,
      amount: validatedData.amount,
      requestId
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        isNew: result.isNew
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof z.ZodError) {
      loggers.api.apiRequest('POST', '/api/vtu/airtime', 400, duration, { requestId });
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors
        }
      }, { status: 400 });
    }

    loggers.api.error('Airtime purchase failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
      duration
    });

    loggers.api.apiRequest('POST', '/api/vtu/airtime', 500, duration, { requestId });

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Transaction failed. Please try again.'
      }
    }, { status: 500 });
  }
}

// Helper functions
async function checkRateLimit(key: string, limit: number, windowSeconds: number) {
  // Implementation would use Redis or database
  // For demo, return allowed
  return { allowed: true, resetTime: 0 };
}

async function verifyTransactionPIN(hashedPin: string, inputPin: string): Promise<boolean> {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(inputPin, hashedPin);
}

async function callInlomaxAirtime(data: any) {
  // Mock implementation - replace with actual Inlomax API call
  return {
    success: true,
    reference: `INL_${Date.now()}`,
    message: 'Airtime purchase successful'
  };
}

async function saveBeneficiary(userId: string, beneficiary: any) {
  const supabase = getSupabase();
  
  const { error } = await supabase.from('beneficiaries').insert({
    user_id: userId,
    name: beneficiary.name,
    phone: beneficiary.phone,
    network: beneficiary.network,
    type: beneficiary.type
  });

  if (error) {
    loggers.api.warn('Failed to save beneficiary', { 
      userId, 
      error: error.message 
    });
  }
}