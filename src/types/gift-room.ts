// Gift Room System Types

export type GiftRoomType = 'personal' | 'group' | 'public';
export type GiftRoomStatus = 'active' | 'full' | 'expired' | 'completed';
export type ReservationStatus = 'active' | 'claimed' | 'expired';
export type ActivityType = 'created' | 'joined' | 'claimed' | 'expired' | 'refunded';

export interface GiftRoom {
  id: string;
  sender_id: string;
  type: GiftRoomType;
  capacity: number;
  amount: number;
  total_amount: number;
  message?: string;
  token: string;
  status: GiftRoomStatus;
  joined_count: number;
  claimed_count: number;
  metadata: Record<string, any>;
  created_at: string;
  expires_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  room_id: string;
  device_fingerprint: string;
  temp_token: string;
  status: ReservationStatus;
  contact_info?: ContactInfo;
  user_id?: string;
  created_at: string;
  expires_at: string;
  claimed_at?: string;
}

export interface GiftClaim {
  id: string;
  reservation_id: string;
  user_id: string;
  amount: number;
  transaction_id?: string;
  referral_bonus_awarded: boolean;
  claimed_at: string;
}

export interface GiftRoomActivity {
  id: string;
  room_id?: string;
  user_id?: string;
  activity_type: ActivityType;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  name?: string;
}

export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  hash: string;
}

// API Request/Response Types
export interface CreateGiftRoomRequest {
  type: GiftRoomType;
  capacity: number;
  amount: number;
  message?: string;
  expiration_hours?: number;
}

export interface CreateGiftRoomResponse {
  success: boolean;
  data?: {
    room_id: string;
    token: string;
    share_url: string;
  };
  error?: string;
}

export interface JoinGiftRoomRequest {
  room_token: string;
  device_fingerprint: DeviceFingerprint;
  contact_info?: ContactInfo;
}

export interface JoinGiftRoomResponse {
  success: boolean;
  data?: {
    reservation_id: string;
    temp_token: string;
    room: GiftRoom;
    reservation: Reservation;
  };
  error?: string;
}

export interface ClaimGiftRequest {
  reservation_id: string;
}

export interface ClaimGiftResponse {
  success: boolean;
  data?: {
    claim_id: string;
    amount: number;
    referral_bonus_awarded: boolean;
  };
  error?: string;
}

export interface GiftRoomDetailsResponse {
  success: boolean;
  data?: {
    room: GiftRoom;
    sender: {
      full_name: string;
      referral_code: string;
    };
    user_reservation?: Reservation;
    can_join: boolean;
    spots_remaining: number;
  };
  error?: string;
}

export interface GiftRoomListResponse {
  success: boolean;
  data?: {
    sent: GiftRoom[];
    received: GiftClaim[];
    total_sent: number;
    total_received: number;
  };
  error?: string;
}

// UI Component Props
export interface GiftRoomCardProps {
  room: GiftRoom;
  sender?: {
    full_name: string;
    referral_code: string;
  };
  onJoin?: (roomId: string) => void;
  onShare?: (shareUrl: string) => void;
  className?: string;
}

export interface ReservationCardProps {
  reservation: Reservation;
  room: GiftRoom;
  onClaim?: (reservationId: string) => void;
  className?: string;
}

export interface GiftRoomStatsProps {
  room: GiftRoom;
  className?: string;
}

// Utility Types
export interface GiftRoomCapacityLimits {
  personal: { min: 1; max: 1 };
  group: { min: 2; max: 50 };
  public: { min: 1; max: 1000 };
}

export interface GiftRoomExpirationHours {
  personal: number;
  group: number;
  public: number;
  reservation_personal: number;
  reservation_public: number;
}

export const GIFT_ROOM_LIMITS: GiftRoomCapacityLimits = {
  personal: { min: 1, max: 1 },
  group: { min: 2, max: 50 },
  public: { min: 1, max: 1000 },
};

export const GIFT_ROOM_EXPIRATION: GiftRoomExpirationHours = {
  personal: 48,
  group: 48,
  public: 24,
  reservation_personal: 48,
  reservation_public: 6,
};

// Validation helpers
export const validateGiftRoomCapacity = (type: GiftRoomType, capacity: number): boolean => {
  const limits = GIFT_ROOM_LIMITS[type];
  return capacity >= limits.min && capacity <= limits.max;
};

export const validateGiftAmount = (amount: number): boolean => {
  return amount >= 50 && amount <= 50000; // ₦50 to ₦50,000
};

export const calculateTotalAmount = (capacity: number, amount: number): number => {
  return capacity * amount;
};

export const formatGiftRoomUrl = (token: string, baseUrl?: string): string => {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/gift/${token}`;
};

export const getGiftRoomTypeLabel = (type: GiftRoomType): string => {
  switch (type) {
    case 'personal':
      return 'Personal Gift';
    case 'group':
      return 'Group Gift';
    case 'public':
      return 'Public Giveaway';
    default:
      return 'Gift';
  }
};

export const getGiftRoomStatusLabel = (status: GiftRoomStatus): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'full':
      return 'Full';
    case 'expired':
      return 'Expired';
    case 'completed':
      return 'Completed';
    default:
      return 'Unknown';
  }
};

export const getReservationStatusLabel = (status: ReservationStatus): string => {
  switch (status) {
    case 'active':
      return 'Reserved';
    case 'claimed':
      return 'Claimed';
    case 'expired':
      return 'Expired';
    default:
      return 'Unknown';
  }
};

export const isGiftRoomExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

export const isReservationExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

export const getTimeUntilExpiration = (expiresAt: string): string => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} left`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  } else {
    return `${minutes} min left`;
  }
};