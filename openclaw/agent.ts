/**
 * OpenClaw Agent for TADA VTU
 * 
 * Secure conversational agent that handles VTU transactions through natural language.
 * All operations go through secure API endpoints with proper authentication.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface AgentAuth {
  userId: string;
  sessionId: string;
  signature: string;
}

export interface AgentContext {
  userId: string;
  sessionId: string;
  conversationHistory: AgentMessage[];
  currentIntent?: TransactionIntent;
  pendingOrder?: PendingOrder;
}

export interface TransactionIntent {
  type: 'airtime' | 'data' | 'balance' | 'history' | 'help' | 'unknown';
  network?: 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE';
  phoneNumber?: string;
  amount?: number;
  planId?: string;
  confidence: number;
}

export interface PendingOrder {
  orderId: string;
  type: 'airtime' | 'data';
  network: string;
  phoneNumber: string;
  amount: number;
  planId?: string;
  planName?: string;
  createdAt: Date;
}

export interface AgentResponse {
  message: string;
  requiresConfirmation: boolean;
  requiresInput: boolean;
  suggestedActions?: string[];
  data?: any;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NETWORKS = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'] as const;
const NETWORK_ALIASES: Record<string, string> = {
  'mtn': 'MTN',
  'airtel': 'AIRTEL',
  'glo': 'GLO',
  '9mobile': '9MOBILE',
  'etisalat': '9MOBILE',
  '9mob': '9MOBILE',
};

const INTENT_KEYWORDS = {
  airtime: ['airtime', 'recharge', 'top up', 'topup', 'credit', 'load'],
  data: ['data', 'internet', 'bundle', 'mb', 'gb'],
  balance: ['balance', 'wallet', 'how much', 'check balance'],
  history: ['history', 'transactions', 'recent', 'last purchase'],
  help: ['help', 'what can you do', 'commands', 'how to'],
};

// ============================================================================
// AGENT CLASS
// ============================================================================

export class OpenClawAgent {
  private baseUrl: string;
  private auth: AgentAuth;

  constructor(baseUrl: string, auth: AgentAuth) {
    this.baseUrl = baseUrl;
    this.auth = auth;
  }

  /**
   * Main entry point - processes user message and returns response
   */
  async processMessage(
    message: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    // Add user message to history
    context.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Parse intent from message
    const intent = this.parseIntent(message, context);
    context.currentIntent = intent;

    // Route to appropriate handler
    let response: AgentResponse;

    switch (intent.type) {
      case 'balance':
        response = await this.handleBalanceCheck();
        break;
      case 'history':
        response = await this.handleHistoryRequest();
        break;
      case 'help':
        response = this.handleHelpRequest();
        break;
      case 'airtime':
        response = await this.handleAirtimeRequest(intent, context);
        break;
      case 'data':
        response = await this.handleDataRequest(intent, context);
        break;
      default:
        response = this.handleUnknownIntent(message);
    }

    // Add assistant response to history
    context.conversationHistory.push({
      role: 'assistant',
      content: response.message,
      timestamp: new Date(),
    });

    return response;
  }

  /**
   * Confirms and executes a pending order
   */
  async confirmOrder(
    context: AgentContext,
    pin: string
  ): Promise<AgentResponse> {
    if (!context.pendingOrder) {
      return {
        message: "There's no pending order to confirm. What would you like to do?",
        requiresConfirmation: false,
        requiresInput: false,
      };
    }

    const order = context.pendingOrder;

    try {
      // Execute the order
      const response = await fetch(`${this.baseUrl}/api/openclaw/orders/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenClaw-User-ID': this.auth.userId,
          'X-OpenClaw-Session-ID': this.auth.sessionId,
          'X-OpenClaw-Signature': this.auth.signature,
        },
        body: JSON.stringify({
          orderId: order.orderId,
          pin,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          message: `❌ ${result.error || 'Failed to process order'}`,
          requiresConfirmation: false,
          requiresInput: false,
        };
      }

      // Clear pending order
      context.pendingOrder = undefined;

      return {
        message: `✅ Success! Your ${order.type} purchase has been processed.\n\n` +
          `Network: ${order.network}\n` +
          `Phone: ${order.phoneNumber}\n` +
          `Amount: ₦${order.amount.toLocaleString()}\n\n` +
          `Transaction ID: ${result.transactionId}`,
        requiresConfirmation: false,
        requiresInput: false,
        data: result,
      };
    } catch (error) {
      return {
        message: '❌ An error occurred while processing your order. Please try again.',
        requiresConfirmation: false,
        requiresInput: false,
      };
    }
  }

  /**
   * Cancels a pending order
   */
  cancelOrder(context: AgentContext): AgentResponse {
    if (!context.pendingOrder) {
      return {
        message: "There's no pending order to cancel.",
        requiresConfirmation: false,
        requiresInput: false,
      };
    }

    context.pendingOrder = undefined;

    return {
      message: 'Order cancelled. What else can I help you with?',
      requiresConfirmation: false,
      requiresInput: false,
      suggestedActions: ['Check balance', 'Buy airtime', 'Buy data', 'View history'],
    };
  }

  // ==========================================================================
  // INTENT PARSING
  // ==========================================================================

  private parseIntent(message: string, context: AgentContext): TransactionIntent {
    const lowerMessage = message.toLowerCase();

    // Check for confirmation/cancellation of pending order
    if (context.pendingOrder) {
      if (lowerMessage.match(/^(yes|confirm|ok|proceed|go ahead)/)) {
        return { type: 'airtime', confidence: 1.0 }; // Will be handled by confirmOrder
      }
      if (lowerMessage.match(/^(no|cancel|stop|nevermind)/)) {
        return { type: 'airtime', confidence: 1.0 }; // Will be handled by cancelOrder
      }
    }

    // Check each intent type
    for (const [intentType, keywords] of Object.entries(INTENT_KEYWORDS)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        const intent: TransactionIntent = {
          type: intentType as any,
          confidence: 0.8,
        };

        // Extract additional details
        this.extractTransactionDetails(lowerMessage, intent);

        return intent;
      }
    }

    return { type: 'unknown', confidence: 0.0 };
  }

  private extractTransactionDetails(message: string, intent: TransactionIntent): void {
    // Extract network
    for (const [alias, network] of Object.entries(NETWORK_ALIASES)) {
      if (message.includes(alias)) {
        intent.network = network as any;
        break;
      }
    }

    // Extract phone number (11 digits starting with 0, or 10 digits)
    const phoneMatch = message.match(/\b0?\d{10}\b/);
    if (phoneMatch) {
      let phone = phoneMatch[0];
      if (phone.length === 10 && !phone.startsWith('0')) {
        phone = '0' + phone;
      }
      intent.phoneNumber = phone;
    }

    // Extract amount (₦ or naira followed by number, or just number)
    const amountMatch = message.match(/(?:₦|naira|ngn)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (amountMatch) {
      intent.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }
  }

  // ==========================================================================
  // INTENT HANDLERS
  // ==========================================================================

  private async handleBalanceCheck(): Promise<AgentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/openclaw/user/balance`, {
        headers: {
          'X-OpenClaw-User-ID': this.auth.userId,
          'X-OpenClaw-Session-ID': this.auth.sessionId,
          'X-OpenClaw-Signature': this.auth.signature,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          message: '❌ Unable to fetch balance. Please try again.',
          requiresConfirmation: false,
          requiresInput: false,
        };
      }

      return {
        message: `💰 Your current balance is ₦${data.balance.toLocaleString()}`,
        requiresConfirmation: false,
        requiresInput: false,
        suggestedActions: ['Buy airtime', 'Buy data', 'Fund wallet'],
        data,
      };
    } catch (error) {
      return {
        message: '❌ An error occurred while checking your balance.',
        requiresConfirmation: false,
        requiresInput: false,
      };
    }
  }

  private async handleHistoryRequest(): Promise<AgentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/openclaw/transactions/recent`, {
        headers: {
          'X-OpenClaw-User-ID': this.auth.userId,
          'X-OpenClaw-Session-ID': this.auth.sessionId,
          'X-OpenClaw-Signature': this.auth.signature,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.transactions) {
        return {
          message: '❌ Unable to fetch transaction history.',
          requiresConfirmation: false,
          requiresInput: false,
        };
      }

      if (data.transactions.length === 0) {
        return {
          message: "You haven't made any transactions yet. Ready to get started?",
          requiresConfirmation: false,
          requiresInput: false,
          suggestedActions: ['Buy airtime', 'Buy data'],
        };
      }

      const transactionList = data.transactions
        .slice(0, 5)
        .map((tx: any, i: number) => {
          const status = tx.status === 'completed' ? '✅' : tx.status === 'failed' ? '❌' : '⏳';
          return `${i + 1}. ${status} ${tx.type} - ${tx.network} - ₦${tx.amount} (${new Date(tx.created_at).toLocaleDateString()})`;
        })
        .join('\n');

      return {
        message: `📊 Your recent transactions:\n\n${transactionList}`,
        requiresConfirmation: false,
        requiresInput: false,
        data,
      };
    } catch (error) {
      return {
        message: '❌ An error occurred while fetching your history.',
        requiresConfirmation: false,
        requiresInput: false,
      };
    }
  }

  private handleHelpRequest(): AgentResponse {
    return {
      message: `👋 I'm your TADA VTU assistant! Here's what I can do:\n\n` +
        `📱 Buy Airtime: "Buy ₦500 MTN airtime for 08012345678"\n` +
        `📶 Buy Data: "Get 2GB Airtel data for 08012345678"\n` +
        `💰 Check Balance: "What's my balance?"\n` +
        `📊 View History: "Show my recent transactions"\n\n` +
        `Just tell me what you need in plain English!`,
      requiresConfirmation: false,
      requiresInput: false,
      suggestedActions: ['Check balance', 'Buy airtime', 'Buy data', 'View history'],
    };
  }

  private async handleAirtimeRequest(
    intent: TransactionIntent,
    context: AgentContext
  ): Promise<AgentResponse> {
    // Check if we have all required information
    const missing: string[] = [];
    if (!intent.network) missing.push('network (MTN, Airtel, Glo, or 9mobile)');
    if (!intent.phoneNumber) missing.push('phone number');
    if (!intent.amount) missing.push('amount');

    if (missing.length > 0) {
      return {
        message: `To buy airtime, I need: ${missing.join(', ')}. Can you provide that?`,
        requiresConfirmation: false,
        requiresInput: true,
      };
    }

    // Validate phone number (guaranteed to exist at this point)
    const phoneNumber = intent.phoneNumber!;
    if (!/^0\d{10}$/.test(phoneNumber)) {
      return {
        message: 'Please provide a valid 11-digit phone number starting with 0.',
        requiresConfirmation: false,
        requiresInput: true,
      };
    }

    // Validate amount (guaranteed to exist at this point)
    const amount = intent.amount!;
    if (amount < 50 || amount > 50000) {
      return {
        message: 'Airtime amount must be between ₦50 and ₦50,000.',
        requiresConfirmation: false,
        requiresInput: true,
      };
    }

    try {
      // Create order (all values are guaranteed to exist at this point)
      const network = intent.network!;
      const phoneNumber = intent.phoneNumber!;
      const amount = intent.amount!;

      const response = await fetch(`${this.baseUrl}/api/openclaw/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenClaw-User-ID': this.auth.userId,
          'X-OpenClaw-Session-ID': this.auth.sessionId,
          'X-OpenClaw-Signature': this.auth.signature,
        },
        body: JSON.stringify({
          type: 'airtime',
          network,
          phoneNumber,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          message: `❌ ${data.error || 'Unable to create order'}`,
          requiresConfirmation: false,
          requiresInput: false,
        };
      }

      // Store pending order
      context.pendingOrder = {
        orderId: data.orderId,
        type: 'airtime',
        network,
        phoneNumber,
        amount,
        createdAt: new Date(),
      };

      return {
        message: `📱 Airtime Purchase Confirmation\n\n` +
          `Network: ${network}\n` +
          `Phone: ${phoneNumber}\n` +
          `Amount: ₦${amount.toLocaleString()}\n\n` +
          `Reply with your PIN to confirm, or say "cancel" to abort.`,
        requiresConfirmation: true,
        requiresInput: true,
        data,
      };
    } catch (error) {
      return {
        message: '❌ An error occurred. Please try again.',
        requiresConfirmation: false,
        requiresInput: false,
      };
    }
  }

  private async handleDataRequest(
    intent: TransactionIntent,
    context: AgentContext
  ): Promise<AgentResponse> {
    // Check if we have network and phone number
    const missing: string[] = [];
    if (!intent.network) missing.push('network (MTN, Airtel, Glo, or 9mobile)');
    if (!intent.phoneNumber) missing.push('phone number');

    if (missing.length > 0) {
      return {
        message: `To buy data, I need: ${missing.join(', ')}. Can you provide that?`,
        requiresConfirmation: false,
        requiresInput: true,
      };
    }

    // Validate phone number (guaranteed to exist at this point)
    const phoneNumber = intent.phoneNumber!;
    if (!/^0\d{10}$/.test(phoneNumber)) {
      return {
        message: 'Please provide a valid 11-digit phone number starting with 0.',
        requiresConfirmation: false,
        requiresInput: true,
      };
    }

    try {
      // Fetch available data plans (network is guaranteed to exist at this point)
      const network = intent.network!;
      const response = await fetch(
        `${this.baseUrl}/api/openclaw/pricing?network=${network}`,
        {
          headers: {
            'X-OpenClaw-User-ID': this.auth.userId,
            'X-OpenClaw-Session-ID': this.auth.sessionId,
            'X-OpenClaw-Signature': this.auth.signature,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.dataPlans) {
        return {
          message: '❌ Unable to fetch data plans. Please try again.',
          requiresConfirmation: false,
          requiresInput: false,
        };
      }

      // If we have a plan ID from context, create the order
      if (intent.planId) {
        return await this.createDataOrder(intent, context);
      }

      // Show available plans
      const planList = data.dataPlans
        .slice(0, 10)
        .map((plan: any, i: number) => 
          `${i + 1}. ${plan.name} - ₦${plan.price.toLocaleString()} (${plan.validity})`
        )
        .join('\n');

      return {
        message: `📶 Available ${network} Data Plans:\n\n${planList}\n\n` +
          `Reply with the plan number you want.`,
        requiresConfirmation: false,
        requiresInput: true,
        data: { plans: data.dataPlans, network, phoneNumber: intent.phoneNumber },
      };
    } catch (error) {
      return {
        message: '❌ An error occurred while fetching data plans.',
        requiresConfirmation: false,
        requiresInput: false,
      };
    }
  }

  private async createDataOrder(
    intent: TransactionIntent,
    context: AgentContext
  ): Promise<AgentResponse> {
    try {
      // All values are guaranteed to exist when this method is called
      const network = intent.network!;
      const phoneNumber = intent.phoneNumber!;
      const planId = intent.planId!;

      const response = await fetch(`${this.baseUrl}/api/openclaw/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenClaw-User-ID': this.auth.userId,
          'X-OpenClaw-Session-ID': this.auth.sessionId,
          'X-OpenClaw-Signature': this.auth.signature,
        },
        body: JSON.stringify({
          type: 'data',
          network,
          phoneNumber,
          planId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          message: `❌ ${data.error || 'Unable to create order'}`,
          requiresConfirmation: false,
          requiresInput: false,
        };
      }

      // Store pending order
      context.pendingOrder = {
        orderId: data.orderId,
        type: 'data',
        network,
        phoneNumber,
        amount: data.amount,
        planId,
        planName: data.planName,
        createdAt: new Date(),
      };

      return {
        message: `📶 Data Purchase Confirmation\n\n` +
          `Network: ${network}\n` +
          `Phone: ${phoneNumber}\n` +
          `Plan: ${data.planName}\n` +
          `Amount: ₦${data.amount.toLocaleString()}\n\n` +
          `Reply with your PIN to confirm, or say "cancel" to abort.`,
        requiresConfirmation: true,
        requiresInput: true,
        data,
      };
    } catch (error) {
      return {
        message: '❌ An error occurred. Please try again.',
        requiresConfirmation: false,
        requiresInput: false,
      };
    }
  }

  private handleUnknownIntent(message: string): AgentResponse {
    return {
      message: `I'm not sure what you're asking for. I can help you with:\n\n` +
        `• Buying airtime\n` +
        `• Buying data\n` +
        `• Checking your balance\n` +
        `• Viewing transaction history\n\n` +
        `What would you like to do?`,
      requiresConfirmation: false,
      requiresInput: true,
      suggestedActions: ['Buy airtime', 'Buy data', 'Check balance', 'Help'],
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a new agent context for a user session
 */
export function createAgentContext(userId: string, sessionId: string): AgentContext {
  return {
    userId,
    sessionId,
    conversationHistory: [
      {
        role: 'system',
        content: 'You are a helpful VTU assistant for TADA VTU platform.',
        timestamp: new Date(),
      },
    ],
  };
}

/**
 * Validates if a message looks like a PIN (4-6 digits)
 */
export function isPinMessage(message: string): boolean {
  return /^\d{4,6}$/.test(message.trim());
}
