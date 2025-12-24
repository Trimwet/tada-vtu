/**
 * Gift Room System Test Utilities
 * Comprehensive testing helpers for the gift room system
 */

import { 
  GiftRoom, 
  Reservation, 
  GiftClaim, 
  GiftRoomType, 
  DeviceFingerprint,
  CreateGiftRoomRequest 
} from '@/types/gift-room';

// Mock data generators
export class GiftRoomTestUtils {
  
  /**
   * Generate a mock device fingerprint
   */
  static generateMockDeviceFingerprint(overrides?: Partial<DeviceFingerprint>): DeviceFingerprint {
    const base: DeviceFingerprint = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      screenResolution: '1920x1080',
      timezone: 'Africa/Lagos',
      language: 'en-US',
      platform: 'Win32',
      hash: this.generateRandomHash(),
    };

    return { ...base, ...overrides };
  }

  /**
   * Generate a mock gift room
   */
  static generateMockGiftRoom(overrides?: Partial<GiftRoom>): GiftRoom {
    const base: GiftRoom = {
      id: this.generateUUID(),
      sender_id: this.generateUUID(),
      type: 'personal',
      capacity: 1,
      amount: 1000,
      total_amount: 1000,
      message: 'Test gift message',
      token: this.generateRandomToken(),
      status: 'active',
      joined_count: 0,
      claimed_count: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    return { ...base, ...overrides };
  }

  /**
   * Generate a mock reservation
   */
  static generateMockReservation(overrides?: Partial<Reservation>): Reservation {
    const base: Reservation = {
      id: this.generateUUID(),
      room_id: this.generateUUID(),
      device_fingerprint: this.generateRandomHash(),
      temp_token: this.generateRandomToken(),
      status: 'active',
      contact_info: {
        email: 'test@example.com',
        phone: '08012345678',
        name: 'Test User',
      },
      user_id: undefined,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      claimed_at: undefined,
    };

    return { ...base, ...overrides };
  }

  /**
   * Generate a mock gift claim
   */
  static generateMockGiftClaim(overrides?: Partial<GiftClaim>): GiftClaim {
    const base: GiftClaim = {
      id: this.generateUUID(),
      reservation_id: this.generateUUID(),
      user_id: this.generateUUID(),
      amount: 1000,
      transaction_id: this.generateUUID(),
      referral_bonus_awarded: false,
      claimed_at: new Date().toISOString(),
    };

    return { ...base, ...overrides };
  }

  /**
   * Generate a mock create gift room request
   */
  static generateMockCreateRequest(overrides?: Partial<CreateGiftRoomRequest>): CreateGiftRoomRequest {
    const base: CreateGiftRoomRequest = {
      type: 'personal',
      capacity: 1,
      amount: 1000,
      message: 'Test gift message',
      expiration_hours: 48,
    };

    return { ...base, ...overrides };
  }

  /**
   * Generate test scenarios for different gift room types
   */
  static generateTestScenarios(): {
    personal: CreateGiftRoomRequest;
    group: CreateGiftRoomRequest;
    public: CreateGiftRoomRequest;
  } {
    return {
      personal: this.generateMockCreateRequest({
        type: 'personal',
        capacity: 1,
        amount: 500,
      }),
      group: this.generateMockCreateRequest({
        type: 'group',
        capacity: 10,
        amount: 200,
      }),
      public: this.generateMockCreateRequest({
        type: 'public',
        capacity: 100,
        amount: 50,
      }),
    };
  }

  /**
   * Generate edge case test data
   */
  static generateEdgeCases(): {
    minAmount: CreateGiftRoomRequest;
    maxAmount: CreateGiftRoomRequest;
    maxCapacityGroup: CreateGiftRoomRequest;
    maxCapacityPublic: CreateGiftRoomRequest;
    longMessage: CreateGiftRoomRequest;
  } {
    return {
      minAmount: this.generateMockCreateRequest({
        type: 'personal',
        capacity: 1,
        amount: 50, // Minimum amount
      }),
      maxAmount: this.generateMockCreateRequest({
        type: 'personal',
        capacity: 1,
        amount: 50000, // Maximum amount
      }),
      maxCapacityGroup: this.generateMockCreateRequest({
        type: 'group',
        capacity: 50, // Maximum group capacity
        amount: 100,
      }),
      maxCapacityPublic: this.generateMockCreateRequest({
        type: 'public',
        capacity: 1000, // Maximum public capacity
        amount: 50,
      }),
      longMessage: this.generateMockCreateRequest({
        type: 'personal',
        capacity: 1,
        amount: 1000,
        message: 'A'.repeat(500), // Maximum message length
      }),
    };
  }

  /**
   * Generate invalid test data for validation testing
   */
  static generateInvalidData(): {
    invalidCapacityPersonal: CreateGiftRoomRequest;
    invalidCapacityGroup: CreateGiftRoomRequest;
    invalidCapacityPublic: CreateGiftRoomRequest;
    invalidAmountLow: CreateGiftRoomRequest;
    invalidAmountHigh: CreateGiftRoomRequest;
    invalidMessage: CreateGiftRoomRequest;
  } {
    return {
      invalidCapacityPersonal: this.generateMockCreateRequest({
        type: 'personal',
        capacity: 2, // Personal should be 1
        amount: 1000,
      }),
      invalidCapacityGroup: this.generateMockCreateRequest({
        type: 'group',
        capacity: 1, // Group should be 2-50
        amount: 1000,
      }),
      invalidCapacityPublic: this.generateMockCreateRequest({
        type: 'public',
        capacity: 1001, // Public should be <= 1000
        amount: 50,
      }),
      invalidAmountLow: this.generateMockCreateRequest({
        type: 'personal',
        capacity: 1,
        amount: 49, // Below minimum
      }),
      invalidAmountHigh: this.generateMockCreateRequest({
        type: 'personal',
        capacity: 1,
        amount: 50001, // Above maximum
      }),
      invalidMessage: this.generateMockCreateRequest({
        type: 'personal',
        capacity: 1,
        amount: 1000,
        message: 'A'.repeat(501), // Above maximum length
      }),
    };
  }

  /**
   * Generate time-based test scenarios
   */
  static generateTimeScenarios(): {
    justCreated: GiftRoom;
    aboutToExpire: GiftRoom;
    expired: GiftRoom;
    longExpiry: GiftRoom;
  } {
    const now = new Date();
    
    return {
      justCreated: this.generateMockGiftRoom({
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      }),
      aboutToExpire: this.generateMockGiftRoom({
        created_at: new Date(now.getTime() - 47 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour left
      }),
      expired: this.generateMockGiftRoom({
        created_at: new Date(now.getTime() - 50 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'expired',
      }),
      longExpiry: this.generateMockGiftRoom({
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
      }),
    };
  }

  /**
   * Generate capacity and status test scenarios
   */
  static generateCapacityScenarios(): {
    empty: GiftRoom;
    partiallyFilled: GiftRoom;
    almostFull: GiftRoom;
    full: GiftRoom;
    overbooked: GiftRoom;
  } {
    return {
      empty: this.generateMockGiftRoom({
        capacity: 10,
        joined_count: 0,
        claimed_count: 0,
        status: 'active',
      }),
      partiallyFilled: this.generateMockGiftRoom({
        capacity: 10,
        joined_count: 5,
        claimed_count: 2,
        status: 'active',
      }),
      almostFull: this.generateMockGiftRoom({
        capacity: 10,
        joined_count: 9,
        claimed_count: 4,
        status: 'active',
      }),
      full: this.generateMockGiftRoom({
        capacity: 10,
        joined_count: 10,
        claimed_count: 6,
        status: 'full',
      }),
      overbooked: this.generateMockGiftRoom({
        capacity: 10,
        joined_count: 10,
        claimed_count: 10,
        status: 'completed',
      }),
    };
  }

  /**
   * Generate device fingerprint variations for testing
   */
  static generateDeviceVariations(): DeviceFingerprint[] {
    return [
      // Desktop Chrome
      this.generateMockDeviceFingerprint({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        platform: 'Win32',
        screenResolution: '1920x1080',
      }),
      // Mobile Safari
      this.generateMockDeviceFingerprint({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        screenResolution: '375x812',
      }),
      // Android Chrome
      this.generateMockDeviceFingerprint({
        userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        platform: 'Linux armv81',
        screenResolution: '360x800',
      }),
      // Firefox
      this.generateMockDeviceFingerprint({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        platform: 'Win32',
        screenResolution: '1920x1080',
      }),
    ];
  }

  /**
   * Generate test user profiles
   */
  static generateTestUsers(): {
    newUser: { id: string; isNew: boolean };
    existingUser: { id: string; isNew: boolean };
    premiumUser: { id: string; isNew: boolean; balance: number };
    lowBalanceUser: { id: string; isNew: boolean; balance: number };
  } {
    return {
      newUser: {
        id: this.generateUUID(),
        isNew: true,
      },
      existingUser: {
        id: this.generateUUID(),
        isNew: false,
      },
      premiumUser: {
        id: this.generateUUID(),
        isNew: false,
        balance: 100000,
      },
      lowBalanceUser: {
        id: this.generateUUID(),
        isNew: false,
        balance: 25,
      },
    };
  }

  // Utility functions
  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private static generateRandomHash(): string {
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  private static generateRandomToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    return Array.from({ length: 32 }, () => 
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  }

  /**
   * Create a test suite configuration
   */
  static createTestSuite(name: string): {
    name: string;
    scenarios: any;
    edgeCases: any;
    invalidData: any;
    timeScenarios: any;
    capacityScenarios: any;
    deviceVariations: DeviceFingerprint[];
    testUsers: any;
  } {
    return {
      name,
      scenarios: this.generateTestScenarios(),
      edgeCases: this.generateEdgeCases(),
      invalidData: this.generateInvalidData(),
      timeScenarios: this.generateTimeScenarios(),
      capacityScenarios: this.generateCapacityScenarios(),
      deviceVariations: this.generateDeviceVariations(),
      testUsers: this.generateTestUsers(),
    };
  }

  /**
   * Validate test data consistency
   */
  static validateTestData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Add validation logic here
    if (!data) {
      errors.push('Test data is null or undefined');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export test utilities
export default GiftRoomTestUtils;