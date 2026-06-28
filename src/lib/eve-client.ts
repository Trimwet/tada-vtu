/**
 * TADAPAY Eve client — WhatsApp AI assistant powered by Groq.
 *
 * Architecture:
 *  WhatsApp message → bridge.ts → sendEveMessage() → Groq (llama-3.3-70b)
 *    → tool execution (Next.js API routes) → reply to user
 *
 * Fix log:
 *  - Replaced simplified user/assistant history with full groqMessages history
 *    (includes tool_call + tool_result entries). This stops Groq re-calling
 *    get_data_plans when the user selects a plan number — Groq now has full
 *    context of what was already fetched.
 *  - Removed DIRECT_OUTPUT_TOOLS short-circuit. All tool results now go back
 *    through Groq so it can format a proper response AND maintain context.
 *  - Expanded plan display: shows size, type, validity, and [ID] for buy_data.
 *  - Added ?limit=20&best=false to data-plans fetch to get full plan list.
 *  - System prompt updated: explicit "do not re-call get_data_plans" rule.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

interface GroqMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface EveReply {
  message: string;
}

// ── Conversation storage (full Groq message chain per user) ───────────────────
// We keep the FULL chain (user, assistant, tool_call, tool_result) so Groq
// has complete context on every follow-up message.
const sessions = new Map<string, GroqMessage[]>();
const MAX_SESSION_MESSAGES = 20; // keep last 20 messages (~10 turns)

// ── Base URL for Next.js API calls ────────────────────────────────────────────
function getBase() {
  return process.env.NEXT_APP_URL || 'http://localhost:3000';
}

function getCoreSecret() {
  return process.env.CORE_SECRET || '';
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Eve, the TADAPAY AI assistant on WhatsApp. You help users with their TADAPAY wallet.

WHAT YOU CAN DO:
- Check wallet balance (check_balance)
- Show transaction history (get_transaction_history)
- Show data plans (get_data_plans)
- Buy airtime (buy_airtime) — ONLY after user explicitly confirms
- Buy data (buy_data) — ONLY after user explicitly confirms

HARD RULES — never break these:
1. DEPOSITS: Never process them. Say exactly: "To add money to your wallet, open the TADAPAY app and tap Fund Wallet."
2. TRANSFERS: Not available on WhatsApp. Direct to app.
3. WITHDRAWALS: Not available on WhatsApp. Direct to app.
4. NEVER re-call get_data_plans if the tool result is already in this conversation. Use the data already returned.
5. NEVER invent plan IDs or prices. Only use IDs from the get_data_plans result.

DATA PURCHASE FLOW — follow this sequence exactly:
  Step 1 — If network, phone, or plan is missing, ask for it. One question at a time.
  Step 2 — Call get_data_plans ONCE to fetch plans. Show them clearly. STOP — wait for user to pick.
  Step 3 — When user picks a number (e.g. "3" or "plan 3"), identify the plan from the tool result already in context. DO NOT call get_data_plans again.
  Step 4 — Show confirmation:
             Network: [network]
             Phone: [phone]  
             Plan: [plan name + size]
             Cost: ₦[price]
             Reply YES to confirm.
  Step 5 — Only call buy_data after user replies with YES/yes/confirm/ok/sure/go ahead.
  Step 6 — If balance is low: "Your balance is ₦X. You need ₦Y. Please fund in the TADAPAY app."

AIRTIME PURCHASE FLOW:
  Step 1 — Collect: network, phone, amount.
  Step 2 — Confirm:
             Network: [network]
             Phone: [phone]
             Amount: ₦[amount]
             Reply YES to confirm.
  Step 3 — Only call buy_airtime after YES.

STYLE:
- Concise. Plain text only. No markdown, no asterisks, no code blocks.
- One sentence for success or failure.
- "awoof", "cheap", "best" = show smallest/cheapest plans first.`;

// ── Tool implementations ───────────────────────────────────────────────────────

async function checkBalance(userId: string): Promise<string> {
  try {
    const res = await fetch(
      `${getBase()}/api/wallet/balance?userId=${encodeURIComponent(userId)}`,
      { headers: { 'x-core-secret': getCoreSecret() }, signal: AbortSignal.timeout(10000) }
    );
    const json = await res.json() as { status: boolean; data?: { balance: number }; message?: string };
    if (!json.status || !json.data) return json.message || 'Could not read your balance. Please try again.';
    const balance = Number(json.data.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 });
    return `Your TADAPAY wallet balance is ₦${balance}.`;
  } catch (err) {
    console.error('[EVE] checkBalance error:', err);
    return 'Could not read your balance. Please try again.';
  }
}

async function getTransactionHistory(userId: string, limit = 5): Promise<string> {
  try {
    const count = Math.min(Math.max(1, limit), 10);
    const res = await fetch(
      `${getBase()}/api/transaction?userId=${encodeURIComponent(userId)}&limit=${count}`,
      { headers: { 'x-core-secret': getCoreSecret() }, signal: AbortSignal.timeout(10000) }
    );
    const json = await res.json() as { status: boolean; data?: Array<Record<string, unknown>>; message?: string };
    if (!json.status || !json.data || json.data.length === 0) {
      return json.data?.length === 0 ? 'No transactions yet.' : (json.message || 'Could not fetch transactions.');
    }
    const lines = json.data.map((tx) => {
      const amount = Number(tx['amount'] ?? 0);
      const isDebit = amount < 0 || ['airtime', 'data', 'cable', 'electricity'].includes(String(tx['type'] ?? ''));
      const sign = isDebit ? '-' : '+';
      const abs = Math.abs(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 });
      const date = new Date(String(tx['created_at'] ?? '')).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
      const desc = String(tx['description'] || tx['type'] || '').replace(/\s+\(.*?\)$/, '');
      const status = tx['status'] === 'success' ? '✓' : tx['status'] === 'failed' ? '✗' : '⏳';
      return `${status} ${date}  ${sign}₦${abs}  ${desc}`;
    });
    return `Last ${json.data.length} transactions:\n${lines.join('\n')}`;
  } catch (err) {
    console.error('[EVE] getTransactionHistory error:', err);
    return 'Could not fetch transactions. Please try again.';
  }
}

async function getDataPlans(network: string): Promise<string> {
  try {
    const net = network.trim().toUpperCase();
    const res = await fetch(
      `${getBase()}/api/data-plans?network=${encodeURIComponent(net)}&limit=20`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return `Could not fetch ${net} data plans. Please try again.`;

    const json = await res.json() as {
      success: boolean;
      plans?: Array<Record<string, unknown>>;
      byType?: Record<string, Array<Record<string, unknown>>>;
    };

    if (!json.success) return `Could not fetch ${net} data plans. Please try again.`;

    // Prefer byType so we can show SME plans (cheaper/awoof) first,
    // then fall back to the flat plans array.
    let plans: Array<Record<string, unknown>> = [];

    if (json.byType && typeof json.byType === 'object') {
      // Order: SME first (cheapest), then GIFTING, then CORPORATE, then others
      const order = ['SME', 'GIFTING', 'CORPORATE', 'MONTHLY', 'WEEKLY', 'DAILY'];
      const seen = new Set<string>();
      for (const t of order) {
        const bucket = json.byType[t] || [];
        for (const p of bucket) {
          const pid = String(p['id'] || '');
          if (!seen.has(pid)) { seen.add(pid); plans.push(p); }
          if (plans.length >= 20) break;
        }
        if (plans.length >= 20) break;
      }
      // Add any remaining types not in order list
      if (plans.length < 20) {
        for (const [t, bucket] of Object.entries(json.byType)) {
          if (order.includes(t)) continue;
          for (const p of bucket) {
            const pid = String(p['id'] || '');
            if (!seen.has(pid)) { seen.add(pid); plans.push(p); }
            if (plans.length >= 20) break;
          }
          if (plans.length >= 20) break;
        }
      }
    } else if (Array.isArray(json.plans)) {
      plans = json.plans.slice(0, 20);
    }

    if (plans.length === 0) return `No data plans available for ${net} at this time.`;

    // Filter out airtime/combo plans (Talkmore, etc.) — those aren't data bundles
    const dataOnly = plans.filter(p => {
      const name = String(p['name'] || '').toUpperCase();
      return !name.includes('TALKMORE') && !name.includes('AIRTIME') && !name.includes('COMBO');
    });
    const display = (dataOnly.length > 0 ? dataOnly : plans).slice(0, 10);

    const lines = display.map((p, i) => {
      const name = String(p['name'] || p['plan'] || `Plan ${i + 1}`);
      const size = String(p['size'] || '');
      const price = Number(p['price'] || p['amount'] || 0);
      const validity = String(p['validity'] || p['duration'] || '');
      const type = String(p['type'] || '');
      const id = String(p['id'] || p['planId'] || i);

      // Build display line: size is the key info, then price
      const sizeStr = size ? `${size} ` : '';
      const validStr = validity ? ` / ${validity}` : '';
      const typeStr = type ? ` [${type}]` : '';
      return `${i + 1}. ${sizeStr}${name} — ₦${price}${validStr}${typeStr} [ID:${id}]`;
    });

    return `${net} data plans:\n${lines.join('\n')}\n\nWhich plan do you want? Reply with the number.`;
  } catch (err) {
    console.error('[EVE] getDataPlans error:', err);
    return `Could not fetch ${network} data plans. Please try again.`;
  }
}

async function buyAirtime(userId: string, network: string, phone: string, amount: number): Promise<string> {
  try {
    const res = await fetch(`${getBase()}/api/airtime/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-core-secret': getCoreSecret() },
      body: JSON.stringify({ userId, network, phone, amount }),
      signal: AbortSignal.timeout(30000),
    });
    const json = await res.json() as { status: boolean; message?: string };
    return json.status
      ? `✅ ₦${amount} ${network} airtime sent to ${phone} successfully.`
      : (json.message || 'Airtime purchase failed. Please try again.');
  } catch (err) {
    console.error('[EVE] buyAirtime error:', err);
    return 'Airtime purchase failed. Please try again.';
  }
}

async function buyData(userId: string, network: string, phone: string, planId: string, amount: number, planName: string): Promise<string> {
  try {
    const res = await fetch(`${getBase()}/api/data/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-core-secret': getCoreSecret() },
      body: JSON.stringify({ userId, network, phone, planId, planName, amount }),
      signal: AbortSignal.timeout(30000),
    });
    const json = await res.json() as { status: boolean; message?: string };
    return json.status
      ? `✅ ${planName || 'Data bundle'} activated on ${phone} successfully.`
      : (json.message || 'Data purchase failed. Please try again.');
  } catch (err) {
    console.error('[EVE] buyData error:', err);
    return 'Data purchase failed. Please try again.';
  }
}

// ── Tool dispatcher ────────────────────────────────────────────────────────────

async function runTool(name: string, args: Record<string, unknown>, userId: string): Promise<string> {
  switch (name) {
    case 'check_balance':
      return checkBalance(userId);
    case 'get_transaction_history':
      return getTransactionHistory(userId, Number(args['limit']) || 5);
    case 'get_data_plans':
      return getDataPlans(String(args['network'] || ''));
    case 'buy_airtime':
      return buyAirtime(userId, String(args['network'] || ''), String(args['phone'] || ''), Number(args['amount']) || 0);
    case 'buy_data':
      return buyData(userId, String(args['network'] || ''), String(args['phone'] || ''), String(args['planId'] || ''), Number(args['amount']) || 0, String(args['planName'] || ''));
    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Tool definitions for Groq ──────────────────────────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'check_balance',
      description: "Check the user's current TADAPAY wallet balance.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transaction_history',
      description: "Fetch the user's recent transaction history.",
      parameters: {
        type: 'object',
        properties: { limit: { type: 'integer', description: 'Number of transactions (1-10, default 5)' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_data_plans',
      description: 'Fetch available data plans for a Nigerian network. Call ONCE per network per conversation — do not repeat if already called.',
      parameters: {
        type: 'object',
        required: ['network'],
        properties: { network: { type: 'string', description: 'MTN, Airtel, Glo, or 9mobile' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buy_airtime',
      description: 'Purchase airtime. ONLY call after explicit user confirmation (YES/yes/confirm/ok).',
      parameters: {
        type: 'object',
        required: ['network', 'phone', 'amount'],
        properties: {
          network: { type: 'string' },
          phone: { type: 'string', description: '11-digit Nigerian number e.g. 08012345678' },
          amount: { type: 'number', description: 'Amount in naira' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buy_data',
      description: 'Purchase a data bundle. ONLY call after explicit user confirmation (YES/yes/confirm/ok).',
      parameters: {
        type: 'object',
        required: ['network', 'phone', 'planId', 'amount', 'planName'],
        properties: {
          network: { type: 'string' },
          phone: { type: 'string' },
          planId: { type: 'string', description: 'Exact plan ID from get_data_plans result' },
          amount: { type: 'number', description: 'Plan price from get_data_plans result' },
          planName: { type: 'string', description: 'Plan name from get_data_plans result' },
        },
      },
    },
  },
];

// ── Main export ────────────────────────────────────────────────────────────────

export async function sendEveMessage(userId: string, message: string): Promise<EveReply> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY is not configured');

  // Get or create session (full groq message chain, no system prompt stored here)
  const session = sessions.get(userId) || [];

  // Add the new user message
  session.push({ role: 'user', content: message });

  // Build the messages array for this Groq call
  const groqMessages: GroqMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...session.slice(-MAX_SESSION_MESSAGES),
  ];

  const MAX_ITERATIONS = 6;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: 1024,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new Error(`Groq error ${response.status}: ${err}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: GroqMessage;
        finish_reason: string;
      }>;
    };

    const assistantMsg = data.choices?.[0]?.message;
    if (!assistantMsg) throw new Error('No response from Groq');

    // Add assistant message to the chain (includes tool_calls if any)
    groqMessages.push(assistantMsg);
    session.push(assistantMsg);

    // No tool calls — this is the final text reply
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      const reply = assistantMsg.content?.trim() || "I'm here to help. What would you like to do?";
      // Save session (trimmed to max length)
      sessions.set(userId, session.slice(-MAX_SESSION_MESSAGES));
      return { message: reply };
    }

    // Execute all tool calls in parallel
    const toolResults = await Promise.all(
      assistantMsg.tool_calls.map(async (toolCall) => {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch { /* empty */ }
        const result = await runTool(toolCall.function.name, args, userId);
        return { id: toolCall.id, result };
      })
    );

    // Add all tool results to the chain
    for (const { id, result } of toolResults) {
      const toolMsg: GroqMessage = { role: 'tool', tool_call_id: id, content: result };
      groqMessages.push(toolMsg);
      session.push(toolMsg);
    }

    // Loop continues — Groq will now respond with final text
  }

  sessions.set(userId, session.slice(-MAX_SESSION_MESSAGES));
  return { message: "I'm having trouble completing that. Please try again." };
}
