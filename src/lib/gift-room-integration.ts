import { createClient } from '@/lib/supabase/server';

/**
 * Gift Room Integration Service
 * Handles integration checks and system health monitoring
 */
export class GiftRoomIntegrationService {
  /**
   * Check if all required database tables exist
   */
  async checkDatabaseTables(): Promise<{
    success: boolean;
    missingTables: string[];
    error?: string;
  }> {
    try {
      const supabase = await createClient();
      const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', [
          'gift_rooms',
          'reservations', 
          'gift_claims',
          'gift_room_activities'
        ]);

      if (error) {
        return { success: false, missingTables: [], error: error.message };
      }

      const existingTables = tables?.map((t: any) => t.table_name) || [];
      const requiredTables = ['gift_rooms', 'reservations', 'gift_claims', 'gift_room_activities'];
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));

      return {
        success: missingTables.length === 0,
        missingTables
      };

    } catch (error) {
      console.error('Error checking database tables:', error);
      return { success: false, missingTables: [], error: `Failed to check tables: ${error}` };
    }
  }

  /**
   * Check if all required database functions exist
   */
  async checkDatabaseFunctions(): Promise<{
    success: boolean;
    missingFunctions: string[];
    error?: string;
  }> {
    try {
      const supabase = await createClient();
      const { data: functions, error } = await supabase
        .from('information_schema.routines')
        .select('routine_name')
        .eq('routine_schema', 'public')
        .in('routine_name', [
          'cleanup_expired_gift_rooms',
          'update_user_balance'
        ]);

      if (error) {
        return { success: false, missingFunctions: [], error: error.message };
      }

      const existingFunctions = functions?.map((f: any) => f.routine_name) || [];
      const requiredFunctions = ['cleanup_expired_gift_rooms', 'update_user_balance'];
      const missingFunctions = requiredFunctions.filter(func => !existingFunctions.includes(func));

      return {
        success: missingFunctions.length === 0,
        missingFunctions
      };

    } catch (error) {
      console.error('Error checking database functions:', error);
      return { success: false, missingFunctions: [], error: `Failed to check functions: ${error}` };
    }
  }

  /**
   * Run comprehensive system health check
   */
  async runHealthCheck(): Promise<{
    overall: 'healthy' | 'warning' | 'error';
    checks: {
      database: { status: 'pass' | 'fail'; message: string };
      tables: { status: 'pass' | 'fail'; message: string };
      functions: { status: 'pass' | 'fail'; message: string };
      data: { status: 'pass' | 'fail'; message: string };
    };
    timestamp: string;
  }> {
    const checks = {
      database: { status: 'fail' as 'pass' | 'fail', message: '' },
      tables: { status: 'fail' as 'pass' | 'fail', message: '' },
      functions: { status: 'fail' as 'pass' | 'fail', message: '' },
      data: { status: 'fail' as 'pass' | 'fail', message: '' }
    };

    try {
      // Test basic database connectivity
      const supabase = await createClient();
      const { error: dbError } = await supabase.from('gift_rooms').select('count').limit(1);
      
      if (dbError) {
        checks.database = { status: 'fail', message: `Database connection failed: ${dbError.message}` };
      } else {
        checks.database = { status: 'pass', message: 'Database connection successful' };
      }

      // Check tables
      const tableCheck = await this.checkDatabaseTables();
      if (tableCheck.success) {
        checks.tables = { status: 'pass', message: 'All required tables exist' };
      } else {
        checks.tables = { 
          status: 'fail', 
          message: `Missing tables: ${tableCheck.missingTables.join(', ')}` 
        };
      }

      // Check functions
      const functionCheck = await this.checkDatabaseFunctions();
      if (functionCheck.success) {
        checks.functions = { status: 'pass', message: 'All required functions exist' };
      } else {
        checks.functions = { 
          status: 'fail', 
          message: `Missing functions: ${functionCheck.missingFunctions.join(', ')}` 
        };
      }

      // Check data integrity
      const dataCheck = await this.checkDataIntegrity();
      checks.data = dataCheck;

    } catch (error) {
      console.error('Error during health check:', error);
      checks.database = { status: 'fail', message: `Health check failed: ${error}` };
    }

    // Determine overall status
    const failedChecks = Object.values(checks).filter(check => check.status === 'fail').length;
    let overall: 'healthy' | 'warning' | 'error';
    
    if (failedChecks === 0) {
      overall = 'healthy';
    } else if (failedChecks <= 1) {
      overall = 'warning';
    } else {
      overall = 'error';
    }

    return {
      overall,
      checks,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check data integrity
   */
  private async checkDataIntegrity(): Promise<{ status: 'pass' | 'fail'; message: string }> {
    try {
      const supabase = await createClient();
      const [roomsResult, reservationsResult] = await Promise.all([
        supabase
          .from('gift_rooms')
          .select('id, status, total_amount'),
        supabase
          .from('reservations')
          .select('id, status')
      ]);

      if (roomsResult.error || reservationsResult.error) {
        return { 
          status: 'fail', 
          message: `Data integrity check failed: ${roomsResult.error?.message || reservationsResult.error?.message}` 
        };
      }

      const rooms = roomsResult.data || [];
      const reservations = reservationsResult.data || [];

      // Basic data validation
      const invalidRooms = rooms.filter((r: any) => !r.id || !r.status);
      const invalidReservations = reservations.filter((r: any) => !r.id || !r.status);

      if (invalidRooms.length > 0 || invalidReservations.length > 0) {
        return { 
          status: 'fail', 
          message: `Found ${invalidRooms.length} invalid rooms and ${invalidReservations.length} invalid reservations` 
        };
      }

      return { status: 'pass', message: 'Data integrity check passed' };

    } catch (error) {
      console.error('Error checking data integrity:', error);
      return { status: 'fail', message: `Data integrity check failed: ${error}` };
    }
  }

  /**
   * Check database permissions
   */
  async checkPermissions(): Promise<{
    success: boolean;
    permissions: string[];
    error?: string;
  }> {
    try {
      const supabase = await createClient();
      const { data: permissions, error } = await supabase
        .from('information_schema.table_privileges')
        .select('privilege_type, table_name')
        .eq('grantee', 'authenticated')
        .in('table_name', ['gift_rooms', 'reservations', 'gift_claims', 'gift_room_activities']);

      if (error) {
        return { success: false, permissions: [], error: error.message };
      }

      const permissionList = permissions?.map((p: any) => `${p.table_name}: ${p.privilege_type}`) || [];

      return {
        success: true,
        permissions: permissionList
      };

    } catch (error) {
      console.error('Error checking permissions:', error);
      return { success: false, permissions: [], error: `Failed to check permissions: ${error}` };
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<{
    rooms: {
      total: number;
      active: number;
      expired: number;
      totalValue: number;
    };
    reservations: {
      total: number;
      active: number;
      claimed: number;
    };
    claims: {
      total: number;
      totalValue: number;
      referralBonuses: number;
    };
    timestamp: string;
  }> {
    try {
      const supabase = await createClient();
      const [roomsResult, reservationsResult, claimsResult] = await Promise.all([
        supabase
          .from('gift_rooms')
          .select('status, total_amount'),
        supabase
          .from('reservations')
          .select('status'),
        supabase
          .from('gift_claims')
          .select('amount, referral_bonus_awarded')
      ]);

      const rooms = roomsResult.data || [];
      const reservations = reservationsResult.data || [];
      const claims = claimsResult.data || [];

      return {
        rooms: {
          total: rooms.length,
          active: rooms.filter((r: any) => r.status === 'active' || r.status === 'full').length,
          expired: rooms.filter((r: any) => r.status === 'expired').length,
          totalValue: rooms.reduce((sum: number, r: any) => sum + parseFloat(r.total_amount), 0),
        },
        reservations: {
          total: reservations.length,
          active: reservations.filter((r: any) => r.status === 'active').length,
          claimed: reservations.filter((r: any) => r.status === 'claimed').length,
        },
        claims: {
          total: claims.length,
          totalValue: claims.reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0),
          referralBonuses: claims.filter((c: any) => c.referral_bonus_awarded).length,
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting system stats:', error);
      return {
        rooms: { total: 0, active: 0, expired: 0, totalValue: 0 },
        reservations: { total: 0, active: 0, claimed: 0 },
        claims: { total: 0, totalValue: 0, referralBonuses: 0 },
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export a singleton instance
export const giftRoomIntegration = new GiftRoomIntegrationService();