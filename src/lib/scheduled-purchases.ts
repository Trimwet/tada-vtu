// Scheduled Purchases - Auto-recurring purchases with retry logic
import type { ScheduledPurchase, ScheduleFrequency } from '@/types/database';

// Calculate next run time based on frequency
export function calculateNextRun(
  frequency: ScheduleFrequency,
  customDays: number[] | null,
  preferredTime: string = '09:00:00',
  fromDate: Date = new Date()
): Date {
  const [hours, minutes] = preferredTime.split(':').map(Number);
  const nextRun = new Date(fromDate);
  nextRun.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;

    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      break;

    case 'biweekly':
      nextRun.setDate(nextRun.getDate() + 14);
      break;

    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;

    case 'custom':
      if (customDays && customDays.length > 0) {
        const today = fromDate.getDate();
        const sortedDays = [...customDays].sort((a, b) => a - b);

        // Find next day in current month
        const nextDay = sortedDays.find((d) => d > today);

        if (nextDay) {
          nextRun.setDate(nextDay);
        } else {
          // Move to next month, use first day in array
          nextRun.setMonth(nextRun.getMonth() + 1);
          nextRun.setDate(sortedDays[0]);
        }
      } else {
        // Fallback to daily
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
  }

  // Ensure next run is in the future
  if (nextRun <= fromDate) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun;
}

// Calculate retry time with exponential backoff
export function calculateRetryTime(
  retryCount: number,
  baseDelayMinutes: number = 30,
  maxDelayMinutes: number = 240
): Date {
  // Exponential backoff: 30min, 60min, 120min, 240min (max)
  const delayMinutes = Math.min(baseDelayMinutes * Math.pow(2, retryCount), maxDelayMinutes);
  const retryTime = new Date();
  retryTime.setMinutes(retryTime.getMinutes() + delayMinutes);
  return retryTime;
}

// Validate scheduled purchase input
export interface ScheduledPurchaseInput {
  service_type: 'airtime' | 'data' | 'cable' | 'electricity';
  amount: number;
  recipient_phone?: string;
  network?: string;
  data_plan_id?: string;
  meter_number?: string;
  smartcard_number?: string;
  frequency: ScheduleFrequency;
  custom_days?: number[];
  preferred_time?: string;
  smart_timing_enabled?: boolean;
  notify_on_success?: boolean;
  notify_on_failure?: boolean;
  notify_before_run?: boolean;
  expires_at?: string;
}

export function validateScheduledPurchase(input: ScheduledPurchaseInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate service type requirements
  if (input.service_type === 'airtime' || input.service_type === 'data') {
    if (!input.recipient_phone) {
      errors.push('Phone number is required for airtime/data purchases');
    } else if (!/^0[789][01]\d{8}$/.test(input.recipient_phone)) {
      errors.push('Invalid phone number format. Use: 08012345678');
    }

    if (!input.network) {
      errors.push('Network is required for airtime/data purchases');
    }
  }

  if (input.service_type === 'electricity' && !input.meter_number) {
    errors.push('Meter number is required for electricity purchases');
  }

  if (input.service_type === 'cable' && !input.smartcard_number) {
    errors.push('Smartcard number is required for cable TV purchases');
  }

  // Validate amount
  if (input.amount < 50) {
    errors.push('Minimum amount is ₦50');
  }
  if (input.amount > 100000) {
    errors.push('Maximum amount is ₦100,000');
  }

  // Validate frequency
  if (input.frequency === 'custom') {
    if (!input.custom_days || input.custom_days.length === 0) {
      errors.push('Custom days are required for custom frequency');
    } else {
      const invalidDays = input.custom_days.filter((d) => d < 1 || d > 31);
      if (invalidDays.length > 0) {
        errors.push('Custom days must be between 1 and 31');
      }
    }
  }

  // Validate preferred time
  if (input.preferred_time) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
    if (!timeRegex.test(input.preferred_time)) {
      errors.push('Invalid time format. Use HH:MM or HH:MM:SS');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Format schedule for display
export function formatScheduleDescription(schedule: ScheduledPurchase): string {
  const time = schedule.preferred_time.slice(0, 5); // HH:MM

  switch (schedule.frequency) {
    case 'daily':
      return `Every day at ${time}`;
    case 'weekly':
      return `Every week at ${time}`;
    case 'biweekly':
      return `Every 2 weeks at ${time}`;
    case 'monthly':
      return `Monthly at ${time}`;
    case 'custom':
      if (schedule.custom_days && schedule.custom_days.length > 0) {
        const days = schedule.custom_days.map((d) => ordinal(d)).join(', ');
        return `On the ${days} of each month at ${time}`;
      }
      return `Custom schedule at ${time}`;
    default:
      return `Scheduled at ${time}`;
  }
}

// Helper for ordinal numbers
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Get human-readable status
export function getScheduleStatusMessage(status: string | null): {
  message: string;
  color: 'green' | 'red' | 'yellow' | 'gray';
} {
  switch (status) {
    case 'success':
      return { message: 'Last run successful', color: 'green' };
    case 'failed':
      return { message: 'Last run failed', color: 'red' };
    case 'insufficient_balance':
      return { message: 'Insufficient balance', color: 'yellow' };
    case 'service_unavailable':
      return { message: 'Service was unavailable', color: 'yellow' };
    case 'retrying':
      return { message: 'Retrying...', color: 'yellow' };
    default:
      return { message: 'Not yet run', color: 'gray' };
  }
}

// Check if schedule should run now (with tolerance)
export function shouldRunNow(nextRunAt: Date, toleranceMinutes: number = 5): boolean {
  const now = new Date();
  const runTime = new Date(nextRunAt);
  const diffMs = now.getTime() - runTime.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  // Run if we're within tolerance window (past due or slightly early)
  return diffMinutes >= -toleranceMinutes;
}

// Estimate monthly cost for a schedule
export function estimateMonthlyCost(schedule: ScheduledPurchase): number {
  const runsPerMonth = getRunsPerMonth(schedule.frequency, schedule.custom_days);
  return schedule.amount * runsPerMonth;
}

function getRunsPerMonth(frequency: ScheduleFrequency, customDays: number[] | null): number {
  switch (frequency) {
    case 'daily':
      return 30;
    case 'weekly':
      return 4;
    case 'biweekly':
      return 2;
    case 'monthly':
      return 1;
    case 'custom':
      return customDays?.length || 1;
    default:
      return 1;
  }
}
