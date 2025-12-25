/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures when external services are down
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening
  recoveryTimeout: number;     // Time to wait before trying again (ms)
  monitoringPeriod: number;    // Time window for failure counting (ms)
  successThreshold: number;    // Successes needed to close circuit
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  totalRequests: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private totalRequests: number = 0;
  private nextAttempt: number = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitBreakerError(
          `Circuit breaker ${this.name} is OPEN. Next attempt in ${
            Math.ceil((this.nextAttempt - Date.now()) / 1000)
          } seconds`
        );
      } else {
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
        console.log(`Circuit breaker ${this.name} entering HALF_OPEN state`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.reset();
        console.log(`Circuit breaker ${this.name} CLOSED after recovery`);
      }
    } else {
      // Reset failure count on success in CLOSED state
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.open();
    } else if (this.failures >= this.config.failureThreshold) {
      this.open();
    }
  }

  private open(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.config.recoveryTimeout;
    console.error(
      `Circuit breaker ${this.name} OPENED after ${this.failures} failures`
    );
  }

  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = 0;
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests
    };
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Manually reset the circuit breaker
   */
  manualReset(): void {
    console.log(`Circuit breaker ${this.name} manually reset`);
    this.reset();
  }
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// Circuit breaker instances for different services
export const circuitBreakers = {
  inlomax: new CircuitBreaker('Inlomax', {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
    successThreshold: 3
  }),

  smeplug: new CircuitBreaker('SMEPlug', {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
    successThreshold: 3
  }),

  flutterwave: new CircuitBreaker('Flutterwave', {
    failureThreshold: 3,
    recoveryTimeout: 30000, // 30 seconds
    monitoringPeriod: 180000, // 3 minutes
    successThreshold: 2
  }),

  groq: new CircuitBreaker('Groq AI', {
    failureThreshold: 10,
    recoveryTimeout: 120000, // 2 minutes
    monitoringPeriod: 600000, // 10 minutes
    successThreshold: 5
  })
};

// Enhanced VTU service with circuit breaker
export class EnhancedVTUService {
  async executeTransaction(
    provider: 'inlomax' | 'smeplug',
    transactionFn: () => Promise<any>
  ) {
    const circuitBreaker = circuitBreakers[provider];
    
    try {
      return await circuitBreaker.execute(transactionFn);
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        // Try fallback provider
        const fallbackProvider = provider === 'inlomax' ? 'smeplug' : 'inlomax';
        const fallbackCircuit = circuitBreakers[fallbackProvider];
        
        if (fallbackCircuit.isHealthy()) {
          console.log(`Falling back to ${fallbackProvider} provider`);
          return await fallbackCircuit.execute(transactionFn);
        }
      }
      
      throw error;
    }
  }
}

// Health check endpoint for circuit breakers
export function getCircuitBreakerHealth() {
  const health = Object.entries(circuitBreakers).map(([name, breaker]) => ({
    service: name,
    ...breaker.getStats(),
    healthy: breaker.isHealthy()
  }));

  const overallHealthy = health.every(service => service.healthy);

  return {
    healthy: overallHealthy,
    services: health,
    timestamp: new Date().toISOString()
  };
}