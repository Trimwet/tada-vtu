/**
 * Transaction Idempotency Service
 * Prevents duplicate transactions and ensures atomic operations
 */

import { getSupabase } from '@/lib/supabase/server';
import crypto from 'crypto';

export interface IdempotencyResult<T> {
  isNew: boolean;
  data: T;
  transactionId: string;
}

export class TransactionIdempotency {
  private static generateIdempotencyKey(
    userId: string,
    type: string,
    amount: number,
    recipient?: string
  ): string {
    const data = `${userId}:${type}:${amount}:${recipient || ''}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Check for duplicate transaction and return existing result if found
   */
  static async checkDuplicateTransaction(
    userId: string,
    reference: string,
    timeWindowMinutes: number = 5
  ): Promise<any | null> {
    const supabase = getSupabase();
    const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    const { data: existingTxn } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('reference', reference)
      .gte('created_at', timeWindow.toISOString())
      .single();

    return existingTxn;
  }

  /**
   * Execute transaction with idempotency protection
   */
  static async executeWithIdempotency<T>(
    userId: string,
    transactionData: {
      type: string;
      amount: number;
      recipient?: string;
      reference?: string;
    },
    executionFn: () => Promise<T>
  ): Promise<IdempotencyResult<T>> {
    const reference = transactionData.reference || 
      this.generateIdempotencyKey(
        userId,
        transactionData.type,
        transactionData.amount,
        transactionData.recipient
      );

    // Check for existing transaction
    const existingTxn = await this.checkDuplicateTransaction(userId, reference);
    
    if (existingTxn) {
      console.log(`Duplicate transaction detected: ${reference}`);
      return {
        isNew: false,
        data: existingTxn as T,
        transactionId: existingTxn.id
      };
    }

    // Execute new transaction
    try {
      const result = await executionFn();
      return {
        isNew: true,
        data: result,
        transactionId: reference
      };
    } catch (error) {
      console.error(`Transaction execution failed: ${reference}`, error);
      throw error;
    }
  }

  /**
   * Create idempotent transaction record
   */
  static async createIdempotentTransaction(
    userId: string,
    transactionData: {
      type: string;
      amount: number;
      description: string;
      reference?: string;
      provider?: string;
      metadata?: any;
    }
  ) {
    const supabase = getSupabase();
    const reference = transactionData.reference || 
      this.generateIdempotencyKey(
        userId,
        transactionData.type,
        transactionData.amount
      );

    // Use atomic function to prevent race conditions
    const { data, error } = await supabase.rpc('atomic_wallet_update', {
      p_user_id: userId,
      p_amount: -Math.abs(transactionData.amount),
      p_description: transactionData.description,
      p_reference: reference,
      p_type: transactionData.type,
      p_metadata: transactionData.metadata || {},
      p_provider: transactionData.provider
    });

    if (error) {
      throw new Error(`Transaction creation failed: ${error.message}`);
    }

    return {
      transactionId: data[0].transaction_id,
      newBalance: data[0].new_balance,
      reference
    };
  }
}

// Usage example in API routes
export async function executeVTUTransaction(
  userId: string,
  transactionData: any
) {
  return await TransactionIdempotency.executeWithIdempotency(
    userId,
    transactionData,
    async () => {
      // Your VTU provider call here
      const providerResult = await callVTUProvider(transactionData);
      
      // Update transaction status
      await updateTransactionStatus(
        transactionData.reference,
        providerResult.success ? 'success' : 'failed'
      );
      
      return providerResult;
    }
  );
}