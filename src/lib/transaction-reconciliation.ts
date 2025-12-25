/**
 * Transaction Reconciliation System
 * Ensures consistency between our records and external provider records
 */

import { getSupabase } from '@/lib/supabase/server';
import { loggers } from '@/lib/logger';
import { AuditLogger } from '@/lib/audit-logger';

export interface ReconciliationResult {
  totalTransactions: number;
  matchedTransactions: number;
  discrepancies: TransactionDiscrepancy[];
  summary: {
    ourTotal: number;
    providerTotal: number;
    difference: number;
  };
}

export interface TransactionDiscrepancy {
  transactionId: string;
  ourStatus: string;
  providerStatus: string;
  ourAmount: number;
  providerAmount: number;
  discrepancyType: 'status_mismatch' | 'amount_mismatch' | 'missing_our_side' | 'missing_provider_side';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
}

export class TransactionReconciliation {
  /**
   * Reconcile transactions for a specific date and provider
   */
  static async reconcileTransactions(
    provider: 'inlomax' | 'smeplug' | 'flutterwave',
    date: string
  ): Promise<ReconciliationResult> {
    loggers.api.info('Starting transaction reconciliation', { provider, date });

    try {
      // Get our transactions for the date
      const ourTransactions = await this.getOurTransactions(provider, date);
      
      // Get provider transactions for the date
      const providerTransactions = await this.getProviderTransactions(provider, date);
      
      // Compare and find discrepancies
      const discrepancies = await this.compareTransactions(ourTransactions, providerTransactions);
      
      // Calculate summary
      const summary = this.calculateSummary(ourTransactions, providerTransactions);
      
      // Store reconciliation results
      await this.storeReconciliationResults(provider, date, {
        totalTransactions: ourTransactions.length,
        matchedTransactions: ourTransactions.length - discrepancies.length,
        discrepancies,
        summary
      });

      // Log critical discrepancies
      const criticalDiscrepancies = discrepancies.filter(d => d.severity === 'critical');
      if (criticalDiscrepancies.length > 0) {
        await this.alertCriticalDiscrepancies(provider, date, criticalDiscrepancies);
      }

      loggers.api.info('Transaction reconciliation completed', {
        provider,
        date,
        totalTransactions: ourTransactions.length,
        discrepancies: discrepancies.length,
        criticalIssues: criticalDiscrepancies.length
      });

      return {
        totalTransactions: ourTransactions.length,
        matchedTransactions: ourTransactions.length - discrepancies.length,
        discrepancies,
        summary
      };

    } catch (error) {
      loggers.api.error('Transaction reconciliation failed', {
        provider,
        date,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get our transactions for reconciliation
   */
  private static async getOurTransactions(provider: string, date: string): Promise<any[]> {
    const supabase = getSupabase();
    
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('provider', provider)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch our transactions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get provider transactions via their API
   */
  private static async getProviderTransactions(provider: string, date: string): Promise<any[]> {
    switch (provider) {
      case 'inlomax':
        return await this.getInlomaxTransactions(date);
      case 'smeplug':
        return await this.getSMEPlugTransactions(date);
      case 'flutterwave':
        return await this.getFlutterwaveTransactions(date);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Get Inlomax transactions for reconciliation
   */
  private static async getInlomaxTransactions(date: string): Promise<any[]> {
    try {
      const response = await fetch(`${process.env.INLOMAX_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.INLOMAX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: date,
          action: 'reconciliation'
        })
      });

      if (!response.ok) {
        throw new Error(`Inlomax API error: ${response.status}`);
      }

      const data = await response.json();
      return data.transactions || [];
    } catch (error) {
      loggers.api.error('Failed to fetch Inlomax transactions', {
        date,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Get SME Plug transactions for reconciliation
   */
  private static async getSMEPlugTransactions(date: string): Promise<any[]> {
    try {
      const response = await fetch(`${process.env.SMEPLUG_BASE_URL}/reconciliation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SMEPLUG_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: date
        })
      });

      if (!response.ok) {
        throw new Error(`SME Plug API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      loggers.api.error('Failed to fetch SME Plug transactions', {
        date,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Get Flutterwave transactions for reconciliation
   */
  private static async getFlutterwaveTransactions(date: string): Promise<any[]> {
    try {
      const response = await fetch(`${process.env.FLUTTERWAVE_BASE_URL}/v3/transactions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Flutterwave API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter by date
      const targetDate = new Date(date);
      return (data.data || []).filter((txn: any) => {
        const txnDate = new Date(txn.created_at);
        return txnDate.toDateString() === targetDate.toDateString();
      });
    } catch (error) {
      loggers.api.error('Failed to fetch Flutterwave transactions', {
        date,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Compare our transactions with provider transactions
   */
  private static async compareTransactions(
    ourTransactions: any[],
    providerTransactions: any[]
  ): Promise<TransactionDiscrepancy[]> {
    const discrepancies: TransactionDiscrepancy[] = [];
    
    // Create maps for efficient lookup
    const ourTxnMap = new Map(ourTransactions.map(txn => [txn.provider_reference, txn]));
    const providerTxnMap = new Map(providerTransactions.map(txn => [txn.reference, txn]));

    // Check our transactions against provider
    for (const ourTxn of ourTransactions) {
      const providerTxn = providerTxnMap.get(ourTxn.provider_reference);
      
      if (!providerTxn) {
        // Missing on provider side
        discrepancies.push({
          transactionId: ourTxn.id,
          ourStatus: ourTxn.status,
          providerStatus: 'not_found',
          ourAmount: ourTxn.amount,
          providerAmount: 0,
          discrepancyType: 'missing_provider_side',
          severity: 'high',
          recommendedAction: 'Investigate missing transaction on provider side'
        });
        continue;
      }

      // Check status mismatch
      const normalizedOurStatus = this.normalizeStatus(ourTxn.status);
      const normalizedProviderStatus = this.normalizeStatus(providerTxn.status);
      
      if (normalizedOurStatus !== normalizedProviderStatus) {
        discrepancies.push({
          transactionId: ourTxn.id,
          ourStatus: ourTxn.status,
          providerStatus: providerTxn.status,
          ourAmount: ourTxn.amount,
          providerAmount: providerTxn.amount || ourTxn.amount,
          discrepancyType: 'status_mismatch',
          severity: this.getStatusMismatchSeverity(normalizedOurStatus, normalizedProviderStatus),
          recommendedAction: this.getStatusMismatchAction(normalizedOurStatus, normalizedProviderStatus)
        });
      }

      // Check amount mismatch
      if (Math.abs(ourTxn.amount - (providerTxn.amount || ourTxn.amount)) > 0.01) {
        discrepancies.push({
          transactionId: ourTxn.id,
          ourStatus: ourTxn.status,
          providerStatus: providerTxn.status,
          ourAmount: ourTxn.amount,
          providerAmount: providerTxn.amount || 0,
          discrepancyType: 'amount_mismatch',
          severity: 'critical',
          recommendedAction: 'Investigate amount discrepancy immediately'
        });
      }
    }

    // Check for transactions on provider side that we don't have
    for (const providerTxn of providerTransactions) {
      if (!ourTxnMap.has(providerTxn.reference)) {
        discrepancies.push({
          transactionId: providerTxn.reference,
          ourStatus: 'not_found',
          providerStatus: providerTxn.status,
          ourAmount: 0,
          providerAmount: providerTxn.amount || 0,
          discrepancyType: 'missing_our_side',
          severity: 'medium',
          recommendedAction: 'Check if transaction should exist in our system'
        });
      }
    }

    return discrepancies;
  }

  /**
   * Normalize status values for comparison
   */
  private static normalizeStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'success': 'success',
      'successful': 'success',
      'completed': 'success',
      'delivered': 'success',
      'failed': 'failed',
      'error': 'failed',
      'declined': 'failed',
      'pending': 'pending',
      'processing': 'pending',
      'initiated': 'pending'
    };

    return statusMap[status.toLowerCase()] || status.toLowerCase();
  }

  /**
   * Determine severity of status mismatch
   */
  private static getStatusMismatchSeverity(ourStatus: string, providerStatus: string): 'low' | 'medium' | 'high' | 'critical' {
    if (ourStatus === 'success' && providerStatus === 'failed') return 'critical';
    if (ourStatus === 'failed' && providerStatus === 'success') return 'critical';
    if (ourStatus === 'pending' && providerStatus === 'success') return 'high';
    if (ourStatus === 'success' && providerStatus === 'pending') return 'medium';
    return 'low';
  }

  /**
   * Get recommended action for status mismatch
   */
  private static getStatusMismatchAction(ourStatus: string, providerStatus: string): string {
    if (ourStatus === 'success' && providerStatus === 'failed') {
      return 'URGENT: Refund user - transaction failed on provider side';
    }
    if (ourStatus === 'failed' && providerStatus === 'success') {
      return 'URGENT: Credit user - transaction succeeded on provider side';
    }
    if (ourStatus === 'pending' && providerStatus === 'success') {
      return 'Update transaction status to success';
    }
    if (ourStatus === 'success' && providerStatus === 'pending') {
      return 'Monitor provider status - may need reversal';
    }
    return 'Review transaction details and update accordingly';
  }

  /**
   * Calculate reconciliation summary
   */
  private static calculateSummary(ourTransactions: any[], providerTransactions: any[]): any {
    const ourTotal = ourTransactions.reduce((sum, txn) => sum + txn.amount, 0);
    const providerTotal = providerTransactions.reduce((sum, txn) => sum + (txn.amount || 0), 0);
    
    return {
      ourTotal,
      providerTotal,
      difference: ourTotal - providerTotal
    };
  }

  /**
   * Store reconciliation results in database
   */
  private static async storeReconciliationResults(
    provider: string,
    date: string,
    results: ReconciliationResult
  ): Promise<void> {
    const supabase = getSupabase();
    
    const { error } = await supabase.from('transaction_reconciliation').insert({
      provider,
      reconciliation_date: date,
      total_transactions: results.totalTransactions,
      matched_transactions: results.matchedTransactions,
      discrepancies_count: results.discrepancies.length,
      our_total: results.summary.ourTotal,
      provider_total: results.summary.providerTotal,
      difference: results.summary.difference,
      discrepancies: results.discrepancies,
      created_at: new Date().toISOString()
    });

    if (error) {
      loggers.api.error('Failed to store reconciliation results', {
        provider,
        date,
        error: error.message
      });
    }

    // Log audit trail
    await AuditLogger.logAction({
      action: 'reconciliation_completed',
      resourceType: 'transaction_reconciliation',
      metadata: {
        provider,
        date,
        discrepancies: results.discrepancies.length,
        criticalIssues: results.discrepancies.filter(d => d.severity === 'critical').length
      }
    });
  }

  /**
   * Alert on critical discrepancies
   */
  private static async alertCriticalDiscrepancies(
    provider: string,
    date: string,
    discrepancies: TransactionDiscrepancy[]
  ): Promise<void> {
    loggers.api.critical('Critical transaction discrepancies found', {
      provider,
      date,
      count: discrepancies.length,
      discrepancies: discrepancies.map(d => ({
        transactionId: d.transactionId,
        type: d.discrepancyType,
        severity: d.severity
      }))
    });

    // Send alerts to admin team
    // Implementation depends on your notification system
    // Could be email, Slack, SMS, etc.
  }

  /**
   * Get reconciliation history
   */
  static async getReconciliationHistory(
    provider?: string,
    limit: number = 30
  ): Promise<any[]> {
    const supabase = getSupabase();
    
    let query = supabase
      .from('transaction_reconciliation')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data, error } = await query;

    if (error) {
      loggers.api.error('Failed to fetch reconciliation history', {
        error: error.message
      });
      return [];
    }

    return data || [];
  }
}

// Database schema for reconciliation
/*
CREATE TABLE transaction_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    reconciliation_date DATE NOT NULL,
    total_transactions INTEGER NOT NULL,
    matched_transactions INTEGER NOT NULL,
    discrepancies_count INTEGER NOT NULL,
    our_total DECIMAL(12,2) NOT NULL,
    provider_total DECIMAL(12,2) NOT NULL,
    difference DECIMAL(12,2) NOT NULL,
    discrepancies JSONB,
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transaction_reconciliation_provider_date 
    ON transaction_reconciliation(provider, reconciliation_date);
CREATE INDEX idx_transaction_reconciliation_status 
    ON transaction_reconciliation(status);
*/