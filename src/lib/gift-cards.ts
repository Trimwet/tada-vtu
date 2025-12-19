// Gift Cards - Emotional gifting with animations
import type { GiftCard, GiftOccasion, GiftStatus } from '@/types/database';

// Gift themes with colors and animations
export interface GiftTheme {
  id: string;
  name: string;
  occasion: GiftOccasion;
  icon: string; // Ionicon name
  primaryColor: string;
  secondaryColor: string;
  animation: 'confetti' | 'hearts' | 'balloons' | 'fireworks' | 'stars' | 'sparkles';
  defaultMessage: string;
}

export const GIFT_THEMES: GiftTheme[] = [
  // Birthday themes
  {
    id: 'birthday_cake',
    name: 'Birthday Cake',
    occasion: 'birthday',
    icon: 'balloon',
    primaryColor: '#FF6B9D',
    secondaryColor: '#FFD700',
    animation: 'confetti',
    defaultMessage: 'Happy Birthday! Enjoy your special day!',
  },
  {
    id: 'birthday_balloons',
    name: 'Birthday Balloons',
    occasion: 'birthday',
    icon: 'happy',
    primaryColor: '#FF69B4',
    secondaryColor: '#87CEEB',
    animation: 'balloons',
    defaultMessage: 'Wishing you the happiest birthday!',
  },

  // Love themes
  {
    id: 'love_hearts',
    name: 'Love Hearts',
    occasion: 'love',
    icon: 'heart',
    primaryColor: '#DC143C',
    secondaryColor: '#FFB6C1',
    animation: 'hearts',
    defaultMessage: 'Thinking of you',
  },
  {
    id: 'love_roses',
    name: 'Rose Petals',
    occasion: 'love',
    icon: 'rose',
    primaryColor: '#E91E63',
    secondaryColor: '#F8BBD9',
    animation: 'hearts',
    defaultMessage: 'You mean the world to me',
  },

  // Thanks themes
  {
    id: 'thanks_star',
    name: 'Thank You Star',
    occasion: 'thanks',
    icon: 'star',
    primaryColor: '#FFD700',
    secondaryColor: '#FFA500',
    animation: 'stars',
    defaultMessage: 'Thank you so much!',
  },
  {
    id: 'thanks_flowers',
    name: 'Grateful Flowers',
    occasion: 'thanks',
    icon: 'flower',
    primaryColor: '#98D8C8',
    secondaryColor: '#F7DC6F',
    animation: 'sparkles',
    defaultMessage: 'I really appreciate you!',
  },

  // Apology themes
  {
    id: 'apology_sorry',
    name: "I'm Sorry",
    occasion: 'apology',
    icon: 'hand-left',
    primaryColor: '#6B7280',
    secondaryColor: '#9CA3AF',
    animation: 'sparkles',
    defaultMessage: "I'm truly sorry. Please forgive me",
  },

  // Religious themes
  {
    id: 'ramadan_moon',
    name: 'Ramadan Mubarak',
    occasion: 'ramadan',
    icon: 'moon',
    primaryColor: '#2ECC71',
    secondaryColor: '#F4D03F',
    animation: 'stars',
    defaultMessage: 'Ramadan Mubarak!',
  },
  {
    id: 'eid_celebration',
    name: 'Eid Mubarak',
    occasion: 'eid',
    icon: 'sparkles',
    primaryColor: '#8E44AD',
    secondaryColor: '#F39C12',
    animation: 'fireworks',
    defaultMessage: 'Eid Mubarak! May your celebrations be blessed',
  },
  {
    id: 'christmas_tree',
    name: 'Merry Christmas',
    occasion: 'christmas',
    icon: 'snow',
    primaryColor: '#229954',
    secondaryColor: '#E74C3C',
    animation: 'sparkles',
    defaultMessage: 'Merry Christmas!',
  },

  // Graduation
  {
    id: 'graduation_cap',
    name: 'Congratulations Grad',
    occasion: 'graduation',
    icon: 'school',
    primaryColor: '#1E3A8A',
    secondaryColor: '#FBBF24',
    animation: 'confetti',
    defaultMessage: 'Congratulations on your graduation!',
  },

  // Anniversary
  {
    id: 'anniversary_ring',
    name: 'Happy Anniversary',
    occasion: 'anniversary',
    icon: 'diamond',
    primaryColor: '#9333EA',
    secondaryColor: '#F472B6',
    animation: 'hearts',
    defaultMessage: 'Happy Anniversary! Here\'s to many more years together',
  },

  // Custom/General
  {
    id: 'custom_gift',
    name: 'Special Gift',
    occasion: 'custom',
    icon: 'gift',
    primaryColor: '#22C55E',
    secondaryColor: '#10B981',
    animation: 'confetti',
    defaultMessage: 'A special gift just for you!',
  },
];

// Get themes by occasion
export function getThemesByOccasion(occasion: GiftOccasion): GiftTheme[] {
  return GIFT_THEMES.filter((t) => t.occasion === occasion);
}

// Get theme by ID
export function getThemeById(themeId: string): GiftTheme | undefined {
  return GIFT_THEMES.find((t) => t.id === themeId);
}

// Occasion display config with icons
export interface OccasionConfig {
  label: string;
  icon: string;
  color: string;
}

export const OCCASION_CONFIG: Record<GiftOccasion, OccasionConfig> = {
  birthday: { label: 'Birthday', icon: 'balloon', color: '#FF6B9D' },
  anniversary: { label: 'Anniversary', icon: 'diamond', color: '#9333EA' },
  thanks: { label: 'Thank You', icon: 'star', color: '#FFD700' },
  love: { label: 'Love', icon: 'heart', color: '#DC143C' },
  apology: { label: 'Apology', icon: 'hand-left', color: '#6B7280' },
  ramadan: { label: 'Ramadan', icon: 'moon', color: '#2ECC71' },
  christmas: { label: 'Christmas', icon: 'snow', color: '#229954' },
  eid: { label: 'Eid', icon: 'sparkles', color: '#8E44AD' },
  graduation: { label: 'Graduation', icon: 'school', color: '#1E3A8A' },
  custom: { label: 'Custom', icon: 'gift', color: '#22C55E' },
};

// Legacy support - simple labels
export const OCCASION_LABELS: Record<GiftOccasion, string> = {
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  thanks: 'Thank You',
  love: 'Love',
  apology: 'Apology',
  ramadan: 'Ramadan',
  christmas: 'Christmas',
  eid: 'Eid',
  graduation: 'Graduation',
  custom: 'Custom',
};

// Gift amount presets
export const GIFT_AMOUNTS = [
  { value: 100, label: '₦100' },
  { value: 200, label: '₦200' },
  { value: 500, label: '₦500' },
  { value: 1000, label: '₦1,000' },
  { value: 2000, label: '₦2,000' },
  { value: 5000, label: '₦5,000' },
];

// Validate gift card input
export interface GiftCardInput {
  recipient_email: string;
  recipient_phone: string;
  service_type: 'airtime' | 'data';
  amount: number;
  network?: string;
  occasion: GiftOccasion;
  theme_id: string;
  personal_message?: string;
  scheduled_delivery?: string;
}

export function validateGiftCard(input: GiftCardInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate email (required)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.recipient_email) {
    errors.push('Recipient email is required');
  } else if (!emailRegex.test(input.recipient_email)) {
    errors.push('Invalid email address format');
  }

  // Validate phone (required for airtime delivery)
  if (!input.recipient_phone) {
    errors.push('Recipient phone number is required');
  } else if (!/^0[789][01]\d{8}$/.test(input.recipient_phone)) {
    errors.push('Invalid phone number format. Use: 08012345678');
  }

  // Validate amount (₦100 minimum to match Inlomax constraints)
  if (input.amount < 100) {
    errors.push('Minimum gift amount is ₦100');
  }
  if (input.amount > 50000) {
    errors.push('Maximum gift amount is ₦50,000');
  }

  // Validate theme
  const theme = getThemeById(input.theme_id);
  if (!theme) {
    errors.push('Invalid gift theme selected');
  }

  // Validate message length
  if (input.personal_message && input.personal_message.length > 500) {
    errors.push('Personal message must be under 500 characters');
  }

  // Validate scheduled delivery
  if (input.scheduled_delivery) {
    const scheduledDate = new Date(input.scheduled_delivery);
    if (scheduledDate <= new Date()) {
      errors.push('Scheduled delivery must be in the future');
    }
    // Max 30 days in advance
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    if (scheduledDate > maxDate) {
      errors.push('Scheduled delivery cannot be more than 30 days in advance');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Format gift status for display
export function getGiftStatusDisplay(status: GiftStatus): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case 'pending':
      return { label: 'Pending', color: 'text-yellow-500', icon: 'time-outline' };
    case 'scheduled':
      return { label: 'Scheduled', color: 'text-blue-500', icon: 'calendar-outline' };
    case 'delivered':
      return { label: 'Delivered', color: 'text-green-500', icon: 'checkmark-circle-outline' };
    case 'opened':
      return { label: 'Opened', color: 'text-purple-500', icon: 'gift-outline' };
    case 'credited':
      return { label: 'Credited', color: 'text-green-600', icon: 'checkmark-done-outline' };
    case 'expired':
      return { label: 'Expired', color: 'text-gray-500', icon: 'close-circle-outline' };
    case 'cancelled':
      return { label: 'Cancelled', color: 'text-red-500', icon: 'close-outline' };
    default:
      return { label: 'Unknown', color: 'text-gray-400', icon: 'help-outline' };
  }
}

// Generate share text for gift
export function generateShareText(gift: GiftCard, senderName: string): string {
  return `${senderName} sent you a special gift on TADA VTU! Open it now: tadavtu.com/gift/${gift.id}`;
}

// Calculate time until gift expires
export function getExpiryCountdown(expiresAt: string): {
  expired: boolean;
  days: number;
  hours: number;
  message: string;
} {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { expired: true, days: 0, hours: 0, message: 'Expired' };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  let message = '';
  if (days > 0) {
    message = `${days} day${days > 1 ? 's' : ''} left`;
  } else if (hours > 0) {
    message = `${hours} hour${hours > 1 ? 's' : ''} left`;
  } else {
    message = 'Expiring soon!';
  }

  return { expired: false, days, hours, message };
}
