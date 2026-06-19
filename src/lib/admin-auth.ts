import crypto from 'crypto';

const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || 'tada-vtu-admin-secret-change-in-production';
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 64;
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512').toString('hex');
  return `${salt}:${key}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  // Legacy base64 format support (for existing admin accounts)
  if (!storedHash.includes(':')) {
    const oldHash = Buffer.from(password).toString('base64');
    try {
      return crypto.timingSafeEqual(Buffer.from(oldHash), Buffer.from(storedHash));
    } catch {
      return oldHash === storedHash;
    }
  }

  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(derivedKey), Buffer.from(key));
  } catch {
    return derivedKey === key;
  }
}

export function generateToken(adminId: string): string {
  const payload = JSON.stringify({
    id: adminId,
    exp: Date.now() + TOKEN_EXPIRY_MS,
    iat: Date.now(),
  });
  const encoded = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyToken(token: string): { valid: boolean; adminId?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };

    const [encoded, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');

    try {
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return { valid: false };
      }
    } catch {
      if (signature !== expectedSignature) return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (payload.exp < Date.now()) return { valid: false };

    return { valid: true, adminId: payload.id };
  } catch {
    return { valid: false };
  }
}
