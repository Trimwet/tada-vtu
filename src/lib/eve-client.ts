/**
 * TADAPAY Eve client — WhatsApp AI assistant powered by Groq.
 *
 * Architecture:
 *  WhatsApp message → bridge.ts → sendEveMessage() → Groq (llama-3.3-70b)
 *    → tool execution (Next.js API routes) → reply to user
 *
 * All tool implementations call Next.js API routes with x-core-secret auth.
 * This keeps auth, validation, and balance logic in one place and avoids
 * importing @/lib/api/core (which tries the Go Core and may fail if it's
 * partially running or the ledger doesn't have the profile yet).
 */

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface EveReply {
  message: string;
  continuationToken?: string;
}

// ── Conversation history ───────────────────────────────────────────────────────
const conversationHistory = new Map<string, Message[]>();
const MAX_HISTORY = 10;

// ── Tools that bypass final Groq formatting ────────────────────────────────────
const DIRECT_OUTPUT_TOOLS = new Set(['get_transaction_history', 'get_data_plans']);

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
1. DEPOSITS: Never process them. If asked, say exactly: "To add money to your wallet, open the TADAPAY app and tap Fund Wallet." Do not ask how much, do not offer to help.
2. TRANSFERS: Not available on WhatsApp. Direct to the app.
3. WITHDRAWALS: Not available on WhatsApp. Direct to the app.

PURCHASE PROTOCOL — follow this exact sequence every time:
  Step 1 — Collect details. If any of network, phone number, or amount/plan are missing, ask for them. Never assume.
  Step 2 — Call get_data_plans before quoting any data plan. Never invent prices or IDs.
  Step 3 — Show a confirmation summary in this exact format:
             Network: [network]
             Phone: [phone]
             [Amount / Plan]: [value]
             Cost: ₦[amount]
             Reply YES to confirm.
  Step 4 — WAIT. Do not call buy_airtime or buy_data until the user replies with a clear yes ("yes", "confirm", "go ahead", "ok", "sure").
  Step 5 — If balance is insufficient, state it plainly: "Your balance is ₦X. You need ₦Y. Please fund your wallet in the app."

STYLE:
- Be concise. Users are on WhatsApp.
- Plain text only. No markdown headers or code blocks.
- One clear sentence for success or failure.`;

// ── Tool implementations ───────────────────────────────────────────────────────

async function checkBalance(userId: string): Promise<string> {
  try {
    const res = await fetch(
      `${getBase()}/api/wallet/balance?userId=${encodeURIComponent(userId)}`,
      {
        headers: { 'x-core-secret': getCoreSecret() },
        signal: AbortSignal.timeout(10000),
      }
    );
    const json = await res.json() as { status: boolean; data?: { balance: number }; message?: string };
    if (!json.status || !json.data) {
      return json.message || 'Could not read your balance right now. Please try again.';
    }
    const balance = Number(json.data.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 });
    return `Your TADAPAY wallet balance is ₦${balance}.`;
  } catch (err) {
    console.error('[EVE-CLIENT] checkBalance error:', err);
    return 'Could not read your balance right now. Please try again.';
  }
}

async function getTransactionHistory(userId: string, limit = 5): Promise<string> {
  try {
    const count = Math.min(Math.max(1, limit), 10);
    const res = await fetch(
      `${getBase()}/api/transaction?userId=${encodeURIComponent(userId)}&limit=${count}`,
      {
        headers: { 'x-core-secret': getCoreSecret() },
        signal: AbortSignal.timeout(10000),
      }
    );
    const json = await res.json() as { status: boolean; data?: Array<Record<string, unknown>>; message?: string };
    if (!json.status || !json.data || json.data.length === 0) {
      return json.data?.length === 0 ? 'You have no transactions yet.' : (json.message || 'Could not fetch your transactions right now.');
    }

    const lines = json.data.map((tx) => {
      const amount = Number(tx['amount'] ?? 0);
      const isDebit = amount < 0 || ['airtime', 'data', 'cable', 'electricity', 'betting'].includes(String(tx['type'] ?? ''));
      const sign = isDebit ? '-' : '+';
      const absAmount = Math.abs(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 });
      const date = new Date(String(tx['created_at'] ?? '')).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
      const desc = String(tx['description'] || tx['type'] || '').replace(/\s+\(.*?\)$/, '');
      const status = tx['status'] === 'success' ? '✓' : tx['status'] === 'failed' ? '✗' : '⏳';
      return `${status} ${date}  ${sign}₦${absAmount}  ${desc}`;
    });

    return `Last ${json.data.length} transactions:\n${lines.join('\n')}`;
  } catch (err) {
    console.error('[EVE-CLIENT] getTransactionHistory error:', err);
    return 'Could not fetch your transactions right now. Please try again.';
  }
}

async function getDataPlans(network: string): Promise<string> {
  try {
    const res = await fetch(
      `${getBase()}/api/data-plans?network=${encodeURIComponent(network.toLowerCase())}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return `Could not fetch ${network} data plans right now. Please try again.`;

    const json = await res.json();
    const raw = json.plans || json.data || json || [];
    const plans = Array.isArray(raw) ? raw.slice(0, 8) : [];
    if (!plans.length) return `No data plans available for ${network} at this time.`;

    const lines = plans.map((p: Record<string, unknown>, i: number) => {
      const name = String(p['name'] || p['plan'] || `Plan ${i + 1}`);
      const price = String(p['price'] || p['amount'] || '?');
      const validity = String(p['validity'] || p['duration'] || '');
      const id = String(p['id'] || p['planId'] || p['serviceID'] || i);
      return `${i + 1}. ${name} — ₦${price}${validity ? ` (${validity})` : ''} [ID:${id}]`;
    });

    return `${network.toUpperCase()} data plans:\n${lines.join('\n')}\n\nReply with the number of the plan you want.`;
  } catch (err) {
    console.error('[EVE-CLIENT] getDataPlans error:', err);
    return `Could not fetch ${network} data plans right now. Please try again.`;
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
    console.error('[EVE-CLIENT] buyAirtime error:', err);
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
      ? `✅ ${planName || 'Data bundle'} activated for ${phone} successfully.`
      : (json.message || 'Data purchase failed. Please try again.');
  } catch (err) {
    console.error('[EVE-CLIENT] buyData error:', err);
    return 'Data purchase failed. Please try again.';
  }
}

// ── Tool dispatcher ────────────────────────────────────────────────────────────

async function runTool(name: string, args: Record<string, unknown>, userId: string): Promise<{ result: string; direct: boolean }> {
  switch (name) {
    case 'check_balance':
      return { result: await checkBalance(userId), direct: false };
    case 'get_transaction_history':
      return { result: await getTransactionHistory(userId, Number(args['limit']) || 5), direct: true };
    case 'get_data_plans':
      return { result: await getDataPlans(String(args['network'] || '')), direct: true };
    case 'buy_airtime':
      return { result: await buyAirtime(userId, String(args['network'] || ''), String(args['phone'] || ''), Number(args['amount']) || 0), direct: false };
    case 'buy_data':
      return { result: await buyData(userId, String(args['network'] || ''), String(args['phone'] || ''), String(args['planId'] || ''), Number(args['amount']) || 0, String(args['planName'] || '')), direct: false };
    default:
      return { result: `Unknown tool: ${name}`, direct: false };
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
      description: 'Fetch available data plans for a Nigerian network. Always call before quoting prices.',
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
      description: 'Purchase airtime. Only call AFTER user explicitly confirms.',
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
      description: 'Purchase a data bundle. Only call AFTER user explicitly confirms.',
      parameters: {
        type: 'object',
        required: ['network', 'phone', 'planId', 'amount', 'planName'],
        properties: {
          network: { type: 'string' },
          phone: { type: 'string' },
          planId: { type: 'string', description: 'Plan ID from get_data_plans' },
          amount: { type: 'number' },
          planName: { type: 'string' },
        },
      },
    },
  },
];

// ── Main export ────────────────────────────────────────────────────────────────

export async function sendEveMessage(userId: string, message: string): Promise<EveReply> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY is not configured');

  const history = conversationHistory.get(userId) || [];
  history.push({ role: 'user', content: message });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groqMessages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-MAX_HISTORY),
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
        message: {
          content?: string;
          tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
        };
      }>;
    };

    const assistantMsg = data.choices?.[0]?.message;
    if (!assistantMsg) throw new Error('No response from Groq');

    groqMessages.push(assistantMsg);

    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      const reply = assistantMsg.content?.trim() || "I'm here to help. What would you like to do?";
      history.push({ role: 'assistant', content: reply });
      conversationHistory.set(userId, history.slice(-MAX_HISTORY));
      return { message: reply };
    }

    let directOutput: string | null = null;

    for (const toolCall of assistantMsg.tool_calls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch { /* empty */ }

      const { result, direct } = await runTool(toolCall.function.name, args, userId);

      groqMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });

      if (direct) directOutput = result;
    }

    if (directOutput !== null) {
      history.push({ role: 'assistant', content: directOutput });
      conversationHistory.set(userId, history.slice(-MAX_HISTORY));
      return { message: directOutput };
    }
  }

  return { message: "I'm having trouble completing that request. Please try again." };
}
