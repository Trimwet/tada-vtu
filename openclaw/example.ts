/**
 * Example usage of the TADA VTU OpenClaw Agent
 * 
 * This demonstrates how to integrate the agent into your application
 */

import { OpenClawAgent, createAgentContext, isPinMessage, AgentContext } from './agent';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TADA_API_URL = process.env.TADA_API_URL || 'https://tadavtu.com';
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY;

if (!OPENCLAW_API_KEY) {
  throw new Error('OPENCLAW_API_KEY environment variable is required');
}

// ============================================================================
// USER IDENTIFICATION
// ============================================================================

/**
 * Identifies a user and gets authentication tokens
 */
async function identifyUser(phoneNumber: string) {
  const response = await fetch(`${TADA_API_URL}/api/openclaw/user/identify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENCLAW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phoneNumber }),
  });

  if (!response.ok) {
    throw new Error('Failed to identify user');
  }

  const data = await response.json();
  return {
    userId: data.userId,
    sessionId: data.sessionId,
    signature: data.signature,
    user: data.user,
  };
}

// ============================================================================
// CONVERSATION MANAGER
// ============================================================================

class ConversationManager {
  private agent: OpenClawAgent;
  private context: AgentContext;

  constructor(userId: string, sessionId: string, signature: string) {
    this.agent = new OpenClawAgent(TADA_API_URL, {
      userId,
      sessionId,
      signature,
    });
    this.context = createAgentContext(userId, sessionId);
  }

  /**
   * Processes a user message and returns the agent's response
   */
  async sendMessage(message: string) {
    // Check if this is a PIN for a pending order
    if (this.context.pendingOrder && isPinMessage(message)) {
      return await this.agent.confirmOrder(this.context, message);
    }

    // Check if user wants to cancel
    if (this.context.pendingOrder && message.toLowerCase().match(/^(cancel|no|stop)/)) {
      return this.agent.cancelOrder(this.context);
    }

    // Process as normal message
    return await this.agent.processMessage(message, this.context);
  }

  /**
   * Gets the current conversation history
   */
  getHistory() {
    return this.context.conversationHistory;
  }

  /**
   * Checks if there's a pending order
   */
  hasPendingOrder() {
    return !!this.context.pendingOrder;
  }

  /**
   * Gets the pending order details
   */
  getPendingOrder() {
    return this.context.pendingOrder;
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

async function example1_SimpleConversation() {
  console.log('=== Example 1: Simple Conversation ===\n');

  // Step 1: Identify user
  const auth = await identifyUser('08012345678');
  console.log(`User identified: ${auth.user.phone}`);
  console.log(`Balance: ₦${auth.user.balance}\n`);

  // Step 2: Create conversation manager
  const conversation = new ConversationManager(
    auth.userId,
    auth.sessionId,
    auth.signature
  );

  // Step 3: Send messages
  let response = await conversation.sendMessage('What is my balance?');
  console.log(`Agent: ${response.message}\n`);

  response = await conversation.sendMessage('Show me recent transactions');
  console.log(`Agent: ${response.message}\n`);
}

async function example2_AirtimePurchase() {
  console.log('=== Example 2: Airtime Purchase ===\n');

  const auth = await identifyUser('08012345678');
  const conversation = new ConversationManager(
    auth.userId,
    auth.sessionId,
    auth.signature
  );

  // Request airtime
  let response = await conversation.sendMessage('Buy ₦500 MTN airtime for 08012345678');
  console.log(`Agent: ${response.message}\n`);

  if (response.requiresConfirmation) {
    console.log('Order requires confirmation. Sending PIN...\n');
    
    // Confirm with PIN
    response = await conversation.sendMessage('1234');
    console.log(`Agent: ${response.message}\n`);
  }
}

async function example3_DataPurchase() {
  console.log('=== Example 3: Data Purchase ===\n');

  const auth = await identifyUser('08012345678');
  const conversation = new ConversationManager(
    auth.userId,
    auth.sessionId,
    auth.signature
  );

  // Request data plans
  let response = await conversation.sendMessage('Show me Airtel data plans for 08012345678');
  console.log(`Agent: ${response.message}\n`);

  // Select a plan (assuming plan 1 is selected)
  response = await conversation.sendMessage('1');
  console.log(`Agent: ${response.message}\n`);

  if (response.requiresConfirmation) {
    console.log('Order requires confirmation. Sending PIN...\n');
    
    // Confirm with PIN
    response = await conversation.sendMessage('1234');
    console.log(`Agent: ${response.message}\n`);
  }
}

async function example4_MultiTurnConversation() {
  console.log('=== Example 4: Multi-Turn Conversation ===\n');

  const auth = await identifyUser('08012345678');
  const conversation = new ConversationManager(
    auth.userId,
    auth.sessionId,
    auth.signature
  );

  // Incomplete request - agent will ask for missing info
  let response = await conversation.sendMessage('I want to buy airtime');
  console.log(`Agent: ${response.message}\n`);

  // Provide network
  response = await conversation.sendMessage('MTN');
  console.log(`Agent: ${response.message}\n`);

  // Provide phone number
  response = await conversation.sendMessage('08012345678');
  console.log(`Agent: ${response.message}\n`);

  // Provide amount
  response = await conversation.sendMessage('500 naira');
  console.log(`Agent: ${response.message}\n`);

  // Confirm
  if (response.requiresConfirmation) {
    response = await conversation.sendMessage('1234');
    console.log(`Agent: ${response.message}\n`);
  }
}

async function example5_ErrorHandling() {
  console.log('=== Example 5: Error Handling ===\n');

  const auth = await identifyUser('08012345678');
  const conversation = new ConversationManager(
    auth.userId,
    auth.sessionId,
    auth.signature
  );

  // Invalid phone number
  let response = await conversation.sendMessage('Buy ₦500 MTN airtime for 123');
  console.log(`Agent: ${response.message}\n`);

  // Invalid amount
  response = await conversation.sendMessage('Buy ₦10 MTN airtime for 08012345678');
  console.log(`Agent: ${response.message}\n`);

  // Unknown request
  response = await conversation.sendMessage('Buy me a pizza');
  console.log(`Agent: ${response.message}\n`);
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

async function main() {
  try {
    // Run one example at a time
    await example1_SimpleConversation();
    // await example2_AirtimePurchase();
    // await example3_DataPurchase();
    // await example4_MultiTurnConversation();
    // await example5_ErrorHandling();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment to run
// main();

// ============================================================================
// EXPORT FOR USE IN OTHER FILES
// ============================================================================

export { ConversationManager, identifyUser };
