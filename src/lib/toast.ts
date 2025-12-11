import { toast as sonnerToast } from "sonner";
import confetti from "canvas-confetti";

// Confetti configurations
const successConfetti = () => {
  // Fire confetti from both sides
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    origin: { x: 0.2, y: 0.7 },
  });
  fire(0.2, {
    spread: 60,
    origin: { x: 0.8, y: 0.7 },
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    origin: { x: 0.5, y: 0.7 },
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    origin: { x: 0.5, y: 0.7 },
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.7 },
  });
};

const moneyConfetti = () => {
  // Green money-themed confetti
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#22c55e", "#10b981", "#059669", "#047857", "#ffffff"],
    zIndex: 9999,
  });
};

const celebrationConfetti = () => {
  // Rainbow celebration
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
      zIndex: 9999,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
      zIndex: 9999,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
};

// Custom toast with emotions
export const toast = {
  // Success with confetti celebration
  success: (message: string, options?: { confetti?: boolean; description?: string }) => {
    if (options?.confetti !== false) {
      successConfetti();
    }
    return sonnerToast.success(message, {
      description: options?.description,
      duration: 4000,
      style: {
        background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
        border: "1px solid #10b981",
        color: "#ffffff",
      },
    });
  },

  // Money/Payment success with green confetti
  payment: (message: string, description?: string) => {
    moneyConfetti();
    return sonnerToast.success(message, {
      description,
      duration: 5000,
      style: {
        background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
        border: "1px solid #22c55e",
        color: "#ffffff",
      },
    });
  },

  // Big celebration (first purchase, milestone, etc.)
  celebrate: (message: string, description?: string) => {
    celebrationConfetti();
    return sonnerToast.success(message, {
      description,
      duration: 6000,
      style: {
        background: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
        border: "1px solid #a78bfa",
        color: "#ffffff",
      },
    });
  },

  // Error with shake effect (no confetti)
  error: (message: string, description?: string) => {
    return sonnerToast.error(message, {
      description,
      duration: 5000,
      style: {
        background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
        border: "1px solid #ef4444",
        color: "#ffffff",
      },
    });
  },

  // Warning
  warning: (message: string, description?: string) => {
    return sonnerToast.warning(message, {
      description,
      duration: 4000,
      style: {
        background: "linear-gradient(135deg, #78350f 0%, #92400e 100%)",
        border: "1px solid #f59e0b",
        color: "#ffffff",
      },
    });
  },

  // Info
  info: (message: string, description?: string) => {
    return sonnerToast.info(message, {
      description,
      duration: 4000,
      style: {
        background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)",
        border: "1px solid #3b82f6",
        color: "#ffffff",
      },
    });
  },

  // Loading state
  loading: (message: string) => {
    return sonnerToast.loading(message, {
      style: {
        background: "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
        border: "1px solid #4b5563",
        color: "#ffffff",
      },
    });
  },

  // Promise toast (for async operations)
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: (data) => {
        successConfetti();
        return typeof messages.success === "function"
          ? messages.success(data)
          : messages.success;
      },
      error: (err) =>
        typeof messages.error === "function"
          ? messages.error(err)
          : messages.error,
    });
  },

  // Dismiss toast
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },
};

// Export confetti functions for custom use
export { successConfetti, moneyConfetti, celebrationConfetti };
