// Smart Toast - AI-powered friendly error messages
import { toast } from "@/lib/toast";

interface HumanizedError {
  friendlyMessage: string;
  suggestion: string;
  emoji: string;
}

// Quick error mappings for instant feedback (no API call needed)
const QUICK_ERRORS: Record<string, HumanizedError> = {
  insufficient_balance: {
    friendlyMessage: "Your wallet needs a top-up!",
    suggestion: "Fund your wallet to continue",
    emoji: "💰",
  },
  network_error: {
    friendlyMessage: "Connection hiccup!",
    suggestion: "Check your internet and try again",
    emoji: "📶",
  },
  invalid_phone: {
    friendlyMessage: "That number doesn't look right",
    suggestion: "Use 11 digits starting with 0",
    emoji: "📱",
  },
  service_unavailable: {
    friendlyMessage: "Service taking a quick break",
    suggestion: "Try again in a moment",
    emoji: "🔧",
  },
  transaction_failed: {
    friendlyMessage: "Transaction didn't go through",
    suggestion: "Your money is safe - try again",
    emoji: "🔄",
  },
  rate_limit: {
    friendlyMessage: "Slow down a bit!",
    suggestion: "Wait 30 seconds and retry",
    emoji: "⏳",
  },
  invalid_amount: {
    friendlyMessage: "Amount not valid",
    suggestion: "Check min/max limits",
    emoji: "💵",
  },
  timeout: {
    friendlyMessage: "Taking too long",
    suggestion: "Try using WiFi",
    emoji: "⏰",
  },
  auth_error: {
    friendlyMessage: "Session expired",
    suggestion: "Please log in again",
    emoji: "🔐",
  },
};

// Smart error toast - uses quick mapping or falls back to AI
export async function smartErrorToast(
  errorCode: string,
  errorMessage?: string,
  context?: string
) {
  // Try quick mapping first
  const quickError = QUICK_ERRORS[errorCode.toLowerCase()];
  if (quickError) {
    toast.error(
      `${quickError.emoji} ${quickError.friendlyMessage}`,
      quickError.suggestion
    );
    return;
  }

  // Show immediate feedback
  toast.error("Something went wrong", "Working on it...");

  // Then try AI humanization in background
  try {
    const response = await fetch("/api/ai-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "humanize-error",
        data: { errorCode, errorMessage, context },
      }),
    });

    if (response.ok) {
      const data: HumanizedError = await response.json();
      // Update with AI message (sonner will replace the previous toast)
      toast.error(
        `${data.emoji} ${data.friendlyMessage}`,
        data.suggestion
      );
    }
  } catch {
    // Keep the generic message if AI fails
  }
}

// Success toasts with personality
const SUCCESS_MESSAGES = [
  "Nailed it! 🎯",
  "Done and dusted! ✨",
  "Success! 🚀",
  "All good! ✅",
  "Sorted! 👍",
];

export function smartSuccessToast(message: string, description?: string) {
  const prefix = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
  toast.success(`${prefix} ${message}`, description ? { description } : undefined);
}

// Payment success with celebration
export function smartPaymentToast(amount: number, type: string, recipient?: string) {
  const messages = [
    `₦${amount.toLocaleString()} ${type} sent! 🎉`,
    `Done! ₦${amount.toLocaleString()} ${type} delivered 🚀`,
    `Success! ${type} worth ₦${amount.toLocaleString()} ✨`,
  ];
  const message = messages[Math.floor(Math.random() * messages.length)];
  toast.payment(message, recipient ? `To ${recipient}` : undefined);
}

// Warning with helpful context
export function smartWarningToast(issue: string, suggestion?: string) {
  toast.warning(`⚠️ ${issue}`, suggestion || "Please check and try again");
}

// Info with friendly tone
export function smartInfoToast(info: string) {
  const prefixes = ["FYI:", "Heads up:", "Just so you know:"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  toast.info(`${prefix} ${info}`);
}
