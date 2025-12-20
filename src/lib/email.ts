y// Email service using Resend
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'gifts@tadavtu.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tadavtu.com';

interface GiftEmailData {
  recipientEmail: string;
  senderName: string;
  amount: number;
  occasion: string;
  personalMessage?: string;
  giftId: string;
  accessToken: string;
  expiresAt: string;
}

export async function sendGiftNotificationEmail(data: GiftEmailData) {
  const giftLink = `${APP_URL}/gift/${data.giftId}?token=${data.accessToken}`;
  const expiryDate = new Date(data.expiresAt).toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const occasionEmoji = getOccasionEmoji(data.occasion);

  try {
    const { data: result, error } = await resend.emails.send({
      from: `TADA VTU Gifts <${FROM_EMAIL}>`,
      replyTo: 'support@tadavtu.com',
      to: data.recipientEmail,
      subject: `${data.senderName} sent you a ₦${data.amount.toLocaleString()} gift on TADA VTU`,
      html: generateGiftEmailHtml({
        ...data,
        giftLink,
        expiryDate,
        occasionEmoji,
      }),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

function getOccasionEmoji(occasion: string): string {
  const emojis: Record<string, string> = {
    birthday: '🎂',
    anniversary: '💍',
    thanks: '⭐',
    love: '❤️',
    apology: '🙏',
    ramadan: '🌙',
    christmas: '🎄',
    eid: '✨',
    graduation: '🎓',
    custom: '🎁',
  };
  return emojis[occasion] || '🎁';
}


interface EmailHtmlData extends GiftEmailData {
  giftLink: string;
  expiryDate: string;
  occasionEmoji: string;
}

function generateGiftEmailHtml(data: EmailHtmlData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You received a gift!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px 24px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 8px;">${data.occasionEmoji}</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">You've Got a Gift!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                <strong style="color: #111827;">${data.senderName}</strong> sent you a special gift on TADA VTU!
              </p>
              
              <!-- Gift Amount Box -->
              <div style="background-color: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="color: #166534; font-size: 14px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Gift Amount</p>
                <p style="color: #15803d; font-size: 36px; font-weight: 700; margin: 0;">₦${data.amount.toLocaleString()}</p>
              </div>
              
              ${data.personalMessage ? `
              <!-- Personal Message -->
              <div style="background-color: #fafafa; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px; text-transform: uppercase;">Personal Message</p>
                <p style="color: #374151; font-size: 15px; line-height: 1.5; margin: 0; font-style: italic;">"${data.personalMessage}"</p>
              </div>
              ` : ''}
              
              <!-- CTA Button -->
              <a href="${data.giftLink}" style="display: block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 24px;">
                🎁 Open Your Gift
              </a>
              
              <!-- Expiry Notice -->
              <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 0;">
                This gift expires on <strong>${data.expiryDate}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">
                Powered by <strong style="color: #22c55e;">TADA VTU</strong>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Fast & Reliable VTU Services
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Bottom Text -->
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">
          If you didn't expect this email, you can safely ignore it.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
