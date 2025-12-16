import { z } from 'zod';

// Phone number validation for Nigerian numbers
export const phoneSchema = z.string()
  .regex(/^(\+234|0)[789][01]\d{8}$/, 'Invalid Nigerian phone number')
  .transform(phone => {
    // Normalize to 11-digit format
    if (phone.startsWith('+234')) {
      return '0' + phone.slice(4);
    }
    return phone;
  });

// Amount validation
export const amountSchema = z.number()
  .min(50, 'Minimum amount is ₦50')
  .max(500000, 'Maximum amount is ₦500,000')
  .int('Amount must be a whole number');

// PIN validation
export const pinSchema = z.string()
  .length(4, 'PIN must be exactly 4 digits')
  .regex(/^\d{4}$/, 'PIN must contain only numbers');

// Email validation
export const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email too long');

// Name validation
export const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces');

// Network validation
export const networkSchema = z.enum(['MTN', 'AIRTEL', 'GLO', '9MOBILE'], {
  message: 'Invalid network selected'
});

// Sanitize HTML input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>"'&]/g, (match) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match] || match;
    })
    .trim();
}

// Validate and sanitize form data
export function validateFormData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Zod v4 uses issues instead of errors
  const issues = result.error.issues || [];
  return {
    success: false,
    errors: issues.map((issue: { message: string }) => issue.message)
  };
}

// API request validation schemas
export const airtimeRequestSchema = z.object({
  network: networkSchema,
  phone: phoneSchema,
  amount: amountSchema,
  userId: z.string().uuid('Invalid user ID')
});

export const dataRequestSchema = z.object({
  network: networkSchema,
  phone: phoneSchema,
  planId: z.string().min(1, 'Plan ID required'),
  amount: amountSchema,
  planName: z.string().min(1, 'Plan name required'),
  userId: z.string().uuid('Invalid user ID')
});

export const cableRequestSchema = z.object({
  serviceID: z.string().min(1, 'Service ID required'),
  iucNum: z.string().min(10, 'Invalid IUC number').max(15, 'Invalid IUC number'),
  amount: amountSchema.optional(),
  planName: z.string().optional(),
  userId: z.string().uuid('Invalid user ID').optional()
});

export const electricityRequestSchema = z.object({
  serviceID: z.string().min(1, 'Service ID required'),
  meterNum: z.string().min(10, 'Invalid meter number').max(15, 'Invalid meter number'),
  meterType: z.enum(['prepaid', 'postpaid'], { message: 'Invalid meter type' }),
  amount: z.number().min(500, 'Minimum amount is ₦500').max(500000, 'Maximum amount is ₦500,000'),
  userId: z.string().uuid('Invalid user ID').optional(),
  discoName: z.string().optional()
});

export const paymentRequestSchema = z.object({
  amount: amountSchema,
  email: emailSchema,
  name: nameSchema,
  phone: phoneSchema,
  redirect_url: z.string().url('Invalid redirect URL')
});
