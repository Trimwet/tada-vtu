// Push Notifications with AI-Generated Messages using Groq
import webpush from 'web-push';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Notification types
export type NotificationType = 
  | 'gift_received' 
  | 'transaction_success' 
  | 'transaction_failed'
  | 'low_balance' 
  | 'promotional'
  | 'daily_tip';

interface NotificationContext {
  type: NotificationType;
  userName?: string;
  amount?: number;
  senderName?: string;
  network?: string;
  serviceType?: string;
  balance?: number;
  promoTitle?: string;
}

interface GeneratedNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// Configure web-push with VAPID keys
export function configureWebPush() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL || 'mailto:support@tadavtu.com';

  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    return true;
  }
  return false;
}

// Generate AI-powered notification message using Groq
export async function generateNotificationMessage(
  context: NotificationContext
): Promise<GeneratedNotification> {
  const apiKey = process.env.GROQ_API_KEY;
  
  // If no API key, use fallback messages
  if (!apiKey) {
    return getFallbackNotification(context);
  }

  const prompt = buildNotificationPrompt(context);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are a friendly Nigerian notification writer for TADA VTU, a mobile recharge app.
Write SHORT, WARM, and ENGAGING push notifications.
Mix Nigerian Pidgin with English naturally - like a friendly neighbor.
Use relevant emojis (1-2 max).
Keep title under 50 characters, body under 100 characters.
Be encouraging and positive. Never be spammy or annoying.
Return ONLY a JSON object with "title" and "body" fields, nothing else.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status);
      return getFallbackNotification(context);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return getFallbackNotification(context);
    }

    // Parse JSON response
    try {
      const parsed = JSON.parse(content);
      return {
        title: parsed.title || getFallbackNotification(context).title,
        body: parsed.body || getFallbackNotification(context).body,
        ...getNotificationMeta(context),
      };
    } catch {
      // If JSON parsing fails, try to extract title and body
      const lines = content.split('\n').filter((l: string) => l.trim());
      return {
        title: lines[0]?.replace(/^(title:|"title":)/i, '').trim().replace(/[",]/g, '') || getFallbackNotification(context).title,
        body: lines[1]?.replace(/^(body:|"body":)/i, '').trim().replace(/[",]/g, '') || getFallbackNotification(context).body,
        ...getNotificationMeta(context),
      };
    }
  } catch (error) {
    console.error('Groq notification error:', error);
    return getFallbackNotification(context);
  }
}

function buildNotificationPrompt(context: NotificationContext): string {
  const { type, userName, amount, senderName, network, serviceType, balance, promoTitle } = context;
  const name = userName?.split(' ')[0] || 'friend';

  switch (type) {
    case 'gift_received':
      return `Write a push notification for ${name} who just received a ₦${amount?.toLocaleString()} gift card from ${senderName}. Make them excited to open it!`;
    
    case 'transaction_success':
      return `Write a push notification for ${name} whose ₦${amount?.toLocaleString()} ${network} ${serviceType} purchase was successful. Celebrate with them briefly!`;
    
    case 'transaction_failed':
      return `Write a gentle, reassuring push notification for ${name} whose ${serviceType} purchase failed. Let them know their money is safe and they can retry.`;
    
    case 'low_balance':
      return `Write a friendly reminder for ${name} that their TADA VTU balance is low (₦${balance?.toLocaleString()}). Encourage them to top up without being pushy.`;
    
    case 'promotional':
      return `Write an exciting but not spammy push notification about: ${promoTitle}. Make it feel exclusive and valuable.`;
    
    case 'daily_tip':
      return `Write a helpful daily tip notification for ${name} about saving money on airtime/data in Nigeria. Be practical and friendly.`;
    
    default:
      return `Write a friendly notification for ${name} from TADA VTU.`;
  }
}

function getNotificationMeta(context: NotificationContext): Partial<GeneratedNotification> {
  const { type } = context;
  
  const meta: Partial<GeneratedNotification> = {
    icon: '/logo-icon.svg',
    badge: '/logo-icon.svg',
  };

  switch (type) {
    case 'gift_received':
      meta.tag = 'gift';
      meta.data = { url: '/dashboard/send-gift?tab=received' };
      break;
    case 'transaction_success':
    case 'transaction_failed':
      meta.tag = 'transaction';
      meta.data = { url: '/dashboard/transactions' };
      break;
    case 'low_balance':
      meta.tag = 'balance';
      meta.data = { url: '/dashboard/fund-wallet' };
      break;
    case 'promotional':
      meta.tag = 'promo';
      meta.data = { url: '/dashboard' };
      break;
    case 'daily_tip':
      meta.tag = 'tip';
      meta.data = { url: '/dashboard' };
      break;
  }

  return meta;
}

// Fallback notifications when AI is unavailable
function getFallbackNotification(context: NotificationContext): GeneratedNotification {
  const { type, userName, amount, senderName, network, serviceType, balance, promoTitle } = context;
  const name = userName?.split(' ')[0] || 'there';

  const fallbacks: Record<NotificationType, GeneratedNotification[]> = {
    gift_received: [
      { title: '🎁 You got a gift!', body: `${senderName} sent you ₦${amount?.toLocaleString()}! Open am now!` },
      { title: '🎉 Surprise for you!', body: `Someone special (${senderName}) just blessed you with ₦${amount?.toLocaleString()}!` },
      { title: '💝 Gift Alert!', body: `Ehen! ${senderName} don send you ₦${amount?.toLocaleString()} gift card o!` },
    ],
    transaction_success: [
      { title: '✅ Transaction Successful!', body: `Your ₦${amount?.toLocaleString()} ${network} ${serviceType} don land!` },
      { title: '🎯 Done deal!', body: `${network} ${serviceType} of ₦${amount?.toLocaleString()} complete. Enjoy!` },
      { title: '✨ Success!', body: `Your ${serviceType} purchase don enter. ₦${amount?.toLocaleString()} well spent!` },
    ],
    transaction_failed: [
      { title: '⚠️ Transaction Issue', body: `Your ${serviceType} no go through, but your money safe. Try again?` },
      { title: '🔄 Please Retry', body: `Small wahala with your ${serviceType}. Your balance still complete o!` },
      { title: '❌ Oops!', body: `${serviceType} no work this time. No worry, your money never move.` },
    ],
    low_balance: [
      { title: '💰 Balance Low', body: `Hey ${name}! Your balance na ₦${balance?.toLocaleString()}. Top up make you no miss out!` },
      { title: '📊 Quick Reminder', body: `${name}, your TADA balance dey ₦${balance?.toLocaleString()}. Fund am small?` },
      { title: '🔔 Balance Alert', body: `Just ₦${balance?.toLocaleString()} left o! Add money so you fit recharge anytime.` },
    ],
    promotional: [
      { title: '🔥 Special Offer!', body: promoTitle || 'Check out our latest deals on TADA VTU!' },
      { title: '💎 VIP Alert', body: promoTitle || 'Exclusive offer just for you. Don\'t miss out!' },
      { title: '🎊 Good News!', body: promoTitle || 'Something special dey wait for you on TADA!' },
    ],
    daily_tip: [
      { title: '💡 Money-Saving Tip', body: 'Buy data after 11pm for better value. Night plans dey cheaper!' },
      { title: '🧠 Smart Tip', body: 'Monthly data plans save you up to 40% compared to daily. Think about am!' },
      { title: '✨ Pro Tip', body: 'Check for network promos before you buy. Free data dey hide sometimes!' },
      { title: '💰 Save Money', body: 'Airtime bonus dey come at night. Recharge after 11pm for extra value!' },
    ],
  };

  const options = fallbacks[type] || fallbacks.daily_tip;
  const selected = options[Math.floor(Math.random() * options.length)];
  
  return {
    ...selected,
    ...getNotificationMeta(context),
  };
}

// Send push notification to a subscription
export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  notification: GeneratedNotification
): Promise<{ success: boolean; error?: string }> {
  try {
    configureWebPush();
    
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/logo-icon.svg',
      badge: notification.badge || '/logo-icon.svg',
      tag: notification.tag,
      data: notification.data,
      requireInteraction: notification.tag === 'gift',
      actions: notification.tag === 'gift' ? [
        { action: 'open', title: 'Open Gift 🎁' },
        { action: 'later', title: 'Later' },
      ] : undefined,
    });

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      payload
    );

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Push notification error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

export { getFallbackNotification };
