/**
 * Structured Logging Service
 * Provides consistent logging across the application
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface LogContext {
  userId?: string;
  transactionId?: string;
  provider?: string;
  amount?: number;
  reference?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  duration?: number;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: LogContext;
  timestamp: string;
  service: string;
  environment: string;
  version: string;
}

export class Logger {
  private service: string;
  private environment: string;
  private version: string;

  constructor(config: {
    service: string;
    environment?: string;
    version?: string;
  }) {
    this.service = config.service;
    this.environment = config.environment || process.env.NODE_ENV || 'development';
    this.version = config.version || process.env.npm_package_version || '1.0.0';
  }

  private log(level: LogLevel, message: string, context: LogContext = {}): void {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      service: this.service,
      environment: this.environment,
      version: this.version
    };

    // In production, send to external logging service
    if (this.environment === 'production') {
      this.sendToExternalLogger(entry);
    }

    // Console output with formatting
    const logMethod = this.getConsoleMethod(level);
    logMethod(JSON.stringify(entry, null, 2));

    // Store critical errors in database
    if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
      this.storeErrorInDatabase(entry);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  critical(message: string, context?: LogContext): void {
    this.log(LogLevel.CRITICAL, message, context);
  }

  /**
   * Log transaction events with structured data
   */
  transaction(
    event: 'initiated' | 'processing' | 'success' | 'failed' | 'timeout',
    context: LogContext
  ): void {
    const message = `Transaction ${event}`;
    const level = event === 'failed' ? LogLevel.ERROR : LogLevel.INFO;
    
    this.log(level, message, {
      ...context,
      event_type: 'transaction',
      event
    });
  }

  /**
   * Log API requests with performance metrics
   */
  apiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? LogLevel.ERROR : 
                 statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, `${method} ${path} - ${statusCode}`, {
      ...context,
      event_type: 'api_request',
      method,
      path,
      status_code: statusCode,
      duration
    });
  }

  /**
   * Log security events
   */
  security(
    event: 'login_attempt' | 'login_success' | 'login_failed' | 'suspicious_activity' | 'rate_limit_exceeded',
    context: LogContext
  ): void {
    const level = event.includes('failed') || event === 'suspicious_activity' ? 
                 LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, `Security event: ${event}`, {
      ...context,
      event_type: 'security',
      event
    });
  }

  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  private async sendToExternalLogger(entry: LogEntry): Promise<void> {
    try {
      // In production, integrate with services like:
      // - Vercel Log Drains
      // - Datadog
      // - New Relic
      // - Sentry
      
      // Example: Send to webhook endpoint
      if (process.env.LOG_WEBHOOK_URL) {
        await fetch(process.env.LOG_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
      }
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  private async storeErrorInDatabase(entry: LogEntry): Promise<void> {
    try {
      // Store in system_logs table for critical errors
      const { getSupabase } = await import('@/lib/supabase/server');
      const supabase = getSupabase();
      
      await supabase.from('system_logs').insert({
        level: entry.level,
        message: entry.message,
        context: entry.context,
        user_id: entry.context.userId || null
      });
    } catch (error) {
      console.error('Failed to store error in database:', error);
    }
  }
}

// Pre-configured loggers for different services
export const loggers = {
  api: new Logger({ service: 'api' }),
  vtu: new Logger({ service: 'vtu-service' }),
  wallet: new Logger({ service: 'wallet-service' }),
  giftRoom: new Logger({ service: 'gift-room-service' }),
  auth: new Logger({ service: 'auth-service' }),
  webhook: new Logger({ service: 'webhook-handler' })
};

// Performance monitoring decorator
export function logPerformance(logger: Logger, operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      
      logger.info(`${operation} started`, { 
        operation, 
        requestId,
        args: args.length 
      });

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        
        logger.info(`${operation} completed`, { 
          operation, 
          requestId, 
          duration,
          success: true 
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error(`${operation} failed`, { 
          operation, 
          requestId, 
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false 
        });
        
        throw error;
      }
    };
  };
}

// Usage examples:
/*
// Basic logging
loggers.api.info('User authenticated', { userId: '123', method: 'google' });

// Transaction logging
loggers.vtu.transaction('initiated', {
  userId: '123',
  transactionId: 'txn_456',
  amount: 1000,
  provider: 'inlomax'
});

// Performance monitoring
class VTUService {
  @logPerformance(loggers.vtu, 'buyAirtime')
  async buyAirtime(data: any) {
    // Implementation
  }
}
*/