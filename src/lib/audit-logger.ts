/**
 * Audit Logging System
 * Tracks all user actions and system changes for compliance and security
 */

import { getSupabase } from '@/lib/supabase/server';
import { loggers } from '@/lib/logger';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  /**
   * Log user action with full context
   */
  static async logAction(entry: AuditLogEntry): Promise<void> {
    try {
      const supabase = getSupabase();
      
      const auditEntry = {
        user_id: entry.userId || null,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        old_values: entry.oldValues || null,
        new_values: entry.newValues || null,
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
        session_id: entry.sessionId || null,
        metadata: entry.metadata || null,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert(auditEntry);

      if (error) {
        loggers.api.error('Failed to create audit log', { 
          error: error.message,
          action: entry.action 
        });
      }

      // Also log to structured logger for real-time monitoring
      loggers.api.info('Audit log created', {
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId
      });

    } catch (error) {
      loggers.api.error('Audit logging failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        action: entry.action 
      });
    }
  }

  /**
   * Log authentication events
   */
  static async logAuth(
    action: 'login' | 'logout' | 'register' | 'password_reset' | 'pin_change',
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      userId,
      action: `auth_${action}`,
      resourceType: 'user_session',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log transaction events
   */
  static async logTransaction(
    action: 'create' | 'update' | 'cancel' | 'refund',
    transactionId: string,
    userId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      userId,
      action: `transaction_${action}`,
      resourceType: 'transaction',
      resourceId: transactionId,
      oldValues,
      newValues,
      metadata
    });
  }

  /**
   * Log wallet operations
   */
  static async logWallet(
    action: 'credit' | 'debit' | 'freeze' | 'unfreeze',
    userId: string,
    amount?: number,
    oldBalance?: number,
    newBalance?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      userId,
      action: `wallet_${action}`,
      resourceType: 'wallet',
      resourceId: userId,
      oldValues: oldBalance !== undefined ? { balance: oldBalance } : undefined,
      newValues: newBalance !== undefined ? { balance: newBalance } : undefined,
      metadata: {
        ...metadata,
        amount
      }
    });
  }

  /**
   * Log gift room events
   */
  static async logGiftRoom(
    action: 'create' | 'join' | 'claim' | 'expire' | 'cancel',
    giftRoomId: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      userId,
      action: `gift_room_${action}`,
      resourceType: 'gift_room',
      resourceId: giftRoomId,
      metadata
    });
  }

  /**
   * Log admin actions
   */
  static async logAdmin(
    action: string,
    adminUserId: string,
    targetResourceType: string,
    targetResourceId?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      userId: adminUserId,
      action: `admin_${action}`,
      resourceType: targetResourceType,
      resourceId: targetResourceId,
      oldValues,
      newValues,
      metadata: {
        ...metadata,
        admin_action: true
      }
    });
  }

  /**
   * Log security events
   */
  static async logSecurity(
    action: 'suspicious_activity' | 'rate_limit_exceeded' | 'invalid_pin' | 'account_locked',
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      userId,
      action: `security_${action}`,
      resourceType: 'security_event',
      metadata: {
        ...metadata,
        severity: 'high',
        requires_review: true
      }
    });
  }

  /**
   * Get audit trail for a specific resource
   */
  static async getAuditTrail(
    resourceType: string,
    resourceId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          users!audit_logs_user_id_fkey(full_name, email)
        `)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        loggers.api.error('Failed to fetch audit trail', { 
          error: error.message,
          resourceType,
          resourceId 
        });
        return [];
      }

      return data || [];
    } catch (error) {
      loggers.api.error('Audit trail fetch failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        resourceType,
        resourceId 
      });
      return [];
    }
  }

  /**
   * Get security events for monitoring
   */
  static async getSecurityEvents(
    timeRange: { start: Date; end: Date },
    limit: number = 100
  ): Promise<any[]> {
    try {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .like('action', 'security_%')
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        loggers.api.error('Failed to fetch security events', { 
          error: error.message 
        });
        return [];
      }

      return data || [];
    } catch (error) {
      loggers.api.error('Security events fetch failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return [];
    }
  }
}

// Middleware to automatically capture request context
export function withAuditContext(
  request: Request,
  userId?: string
): Partial<AuditLogEntry> {
  return {
    userId,
    ipAddress: request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    sessionId: request.headers.get('x-session-id') || undefined
  };
}

// Database trigger to automatically audit sensitive table changes
export const auditTriggerSQL = `
-- Function to automatically create audit logs for sensitive operations
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Only audit specific operations
    IF TG_OP = 'UPDATE' AND TG_TABLE_NAME IN ('users', 'transactions', 'gift_rooms') THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            old_values,
            new_values,
            created_at
        ) VALUES (
            COALESCE(NEW.user_id, OLD.user_id),
            'system_' || lower(TG_OP),
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id)::text,
            to_jsonb(OLD),
            to_jsonb(NEW),
            NOW()
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to sensitive tables
CREATE TRIGGER audit_users_changes
    AFTER UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_transactions_changes
    AFTER UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_gift_rooms_changes
    AFTER UPDATE ON gift_rooms
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();
`;

// Usage examples:
/*
// Log user login
await AuditLogger.logAuth('login', userId, { 
  method: 'google',
  success: true 
});

// Log transaction creation
await AuditLogger.logTransaction('create', transactionId, userId, 
  undefined, 
  { amount: 1000, type: 'airtime' },
  { provider: 'inlomax' }
);

// Log wallet debit
await AuditLogger.logWallet('debit', userId, 1000, 5000, 4000, {
  transaction_id: transactionId,
  reason: 'airtime_purchase'
});

// Log admin action
await AuditLogger.logAdmin('user_suspend', adminId, 'user', userId,
  { status: 'active' },
  { status: 'suspended' },
  { reason: 'suspicious_activity' }
);
*/