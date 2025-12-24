/**
 * Gift Room System Error Handler
 * Centralized error handling and logging for the gift room system
 */

export enum GiftRoomErrorCode {
  // Room Creation Errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_CAPACITY = 'INVALID_CAPACITY',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Room Access Errors
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_EXPIRED = 'ROOM_EXPIRED',
  ROOM_FULL = 'ROOM_FULL',
  ROOM_INACTIVE = 'ROOM_INACTIVE',
  
  // Reservation Errors
  DUPLICATE_RESERVATION = 'DUPLICATE_RESERVATION',
  RESERVATION_NOT_FOUND = 'RESERVATION_NOT_FOUND',
  RESERVATION_EXPIRED = 'RESERVATION_EXPIRED',
  DEVICE_LIMIT_EXCEEDED = 'DEVICE_LIMIT_EXCEEDED',
  
  // Claim Errors
  ALREADY_CLAIMED = 'ALREADY_CLAIMED',
  CLAIM_NOT_AUTHORIZED = 'CLAIM_NOT_AUTHORIZED',
  WALLET_CREDIT_FAILED = 'WALLET_CREDIT_FAILED',
  SELF_CLAIM_ATTEMPT = 'SELF_CLAIM_ATTEMPT',
  
  // System Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface GiftRoomError {
  code: GiftRoomErrorCode;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: string;
  context?: {
    userId?: string;
    roomId?: string;
    reservationId?: string;
    action?: string;
  };
}

export class GiftRoomErrorHandler {
  private static instance: GiftRoomErrorHandler;
  
  private constructor() {}
  
  static getInstance(): GiftRoomErrorHandler {
    if (!GiftRoomErrorHandler.instance) {
      GiftRoomErrorHandler.instance = new GiftRoomErrorHandler();
    }
    return GiftRoomErrorHandler.instance;
  }

  /**
   * Create a standardized error object
   */
  createError(
    code: GiftRoomErrorCode,
    message: string,
    userMessage: string,
    details?: any,
    context?: GiftRoomError['context']
  ): GiftRoomError {
    return {
      code,
      message,
      userMessage,
      details,
      context,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle and log errors
   */
  handleError(error: GiftRoomError | Error | any): GiftRoomError {
    let giftRoomError: GiftRoomError;

    if (this.isGiftRoomError(error)) {
      giftRoomError = error;
    } else if (error instanceof Error) {
      giftRoomError = this.mapGenericError(error);
    } else {
      giftRoomError = this.createError(
        GiftRoomErrorCode.UNKNOWN_ERROR,
        'An unknown error occurred',
        'Something went wrong. Please try again.',
        error
      );
    }

    // Log the error
    this.logError(giftRoomError);

    return giftRoomError;
  }

  /**
   * Map database errors to gift room errors
   */
  mapDatabaseError(dbError: any, context?: GiftRoomError['context']): GiftRoomError {
    const message = dbError.message || dbError.toString();

    // Map specific database errors
    if (message.includes('Insufficient balance')) {
      return this.createError(
        GiftRoomErrorCode.INSUFFICIENT_BALANCE,
        message,
        'You don\'t have enough balance to create this gift room.',
        dbError,
        context
      );
    }

    if (message.includes('Gift room is full')) {
      return this.createError(
        GiftRoomErrorCode.ROOM_FULL,
        message,
        'This gift room is full. All spots have been taken.',
        dbError,
        context
      );
    }

    if (message.includes('Device already has a reservation')) {
      return this.createError(
        GiftRoomErrorCode.DUPLICATE_RESERVATION,
        message,
        'You already have a reservation in this gift room.',
        dbError,
        context
      );
    }

    if (message.includes('already claimed')) {
      return this.createError(
        GiftRoomErrorCode.ALREADY_CLAIMED,
        message,
        'This gift has already been claimed.',
        dbError,
        context
      );
    }

    if (message.includes('no longer active')) {
      return this.createError(
        GiftRoomErrorCode.ROOM_INACTIVE,
        message,
        'This gift room is no longer available.',
        dbError,
        context
      );
    }

    // Generic database error
    return this.createError(
      GiftRoomErrorCode.DATABASE_ERROR,
      `Database error: ${message}`,
      'A database error occurred. Please try again.',
      dbError,
      context
    );
  }

  /**
   * Map validation errors
   */
  mapValidationError(validationError: any, context?: GiftRoomError['context']): GiftRoomError {
    const message = validationError.message || validationError.toString();

    if (message.includes('capacity')) {
      return this.createError(
        GiftRoomErrorCode.INVALID_CAPACITY,
        message,
        'Invalid capacity for this gift type.',
        validationError,
        context
      );
    }

    if (message.includes('amount')) {
      return this.createError(
        GiftRoomErrorCode.INVALID_AMOUNT,
        message,
        'Gift amount must be between ₦50 and ₦50,000.',
        validationError,
        context
      );
    }

    return this.createError(
      GiftRoomErrorCode.VALIDATION_ERROR,
      `Validation error: ${message}`,
      'Invalid input provided. Please check your data.',
      validationError,
      context
    );
  }

  /**
   * Map generic errors
   */
  private mapGenericError(error: Error): GiftRoomError {
    if (error.message.includes('fetch')) {
      return this.createError(
        GiftRoomErrorCode.NETWORK_ERROR,
        error.message,
        'Network error. Please check your connection and try again.',
        error
      );
    }

    return this.createError(
      GiftRoomErrorCode.UNKNOWN_ERROR,
      error.message,
      'An unexpected error occurred. Please try again.',
      error
    );
  }

  /**
   * Check if error is a GiftRoomError
   */
  private isGiftRoomError(error: any): error is GiftRoomError {
    return error && typeof error === 'object' && 'code' in error && 'userMessage' in error;
  }

  /**
   * Log error to console and potentially external services
   */
  private logError(error: GiftRoomError): void {
    console.error('Gift Room Error:', {
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp,
      details: error.details,
    });

    // In production, you might want to send errors to external monitoring services
    // like Sentry, LogRocket, or custom analytics
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(error);
    }
  }

  /**
   * Send error to monitoring service (placeholder)
   */
  private sendToMonitoring(error: GiftRoomError): void {
    // Implement integration with monitoring services here
    // Example: Sentry.captureException(error);
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: GiftRoomError | Error | any): string {
    if (this.isGiftRoomError(error)) {
      return error.userMessage;
    }

    const handledError = this.handleError(error);
    return handledError.userMessage;
  }

  /**
   * Create error response for API endpoints
   */
  createErrorResponse(error: GiftRoomError | Error | any, statusCode: number = 500) {
    const handledError = this.handleError(error);
    
    return {
      success: false,
      error: handledError.userMessage,
      code: handledError.code,
      timestamp: handledError.timestamp,
      // Only include details in development
      ...(process.env.NODE_ENV === 'development' && {
        details: handledError.details,
        context: handledError.context,
      }),
    };
  }

  /**
   * Retry logic for transient errors
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        const handledError = this.handleError(error);
        
        // Don't retry for certain error types
        if ([
          GiftRoomErrorCode.ROOM_NOT_FOUND,
          GiftRoomErrorCode.ALREADY_CLAIMED,
          GiftRoomErrorCode.DUPLICATE_RESERVATION,
          GiftRoomErrorCode.AUTHENTICATION_REQUIRED,
          GiftRoomErrorCode.VALIDATION_ERROR,
        ].includes(handledError.code)) {
          throw handledError;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw handledError;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }

    throw this.handleError(lastError);
  }
}

// Export singleton instance
export const giftRoomErrorHandler = GiftRoomErrorHandler.getInstance();
export default giftRoomErrorHandler;