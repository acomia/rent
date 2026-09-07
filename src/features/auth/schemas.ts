import { z } from 'zod';

/**
 * Bump when Terms or Privacy copy changes so returning customers can be asked
 * to re-accept. Stored on `customers.terms_version` at signup.
 */
export const TERMS_VERSION = '2026-07-01';

/**
 * PH mobile numbers: `09XXXXXXXXX` or `+639XXXXXXXXX`. Normalized to E.164
 * (`+63…`) before it ever reaches Supabase, which requires E.164.
 */
const phField = z
  .string()
  .trim()
  .regex(/^(\+63|0)9\d{9}$/, 'Enter a valid PH mobile number (09xx xxx xxxx)');

export function normalizePhone(raw: string): string {
  const v = raw.trim();
  return v.startsWith('0') ? `+63${v.slice(1)}` : v;
}

const password = z.string().min(8, 'At least 8 characters').max(72, 'Too long'); // bcrypt truncates at 72 bytes

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name').max(120),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    phone: phField,
    password,
    confirmPassword: z.string(),
    // 'admin' only becomes an actual admin if the invite code checks out
    // server-side (see src/db/0009_admin_invite_codes.sql); the picker itself
    // grants nothing.
    role: z.enum(['customer', 'admin']),
    inviteCode: z.string().trim().max(100),
    acceptedTerms: z
      .boolean()
      .refine((v) => v === true, 'Please accept the Terms & Privacy Policy'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((d) => d.role !== 'admin' || d.inviteCode.length > 0, {
    path: ['inviteCode'],
    message: 'Enter your shop invite code',
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export const forgotRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});

export const forgotResetSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the 6-digit code'),
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const otpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

/**
 * The Edit-profile form.
 *
 * `email` is absent on purpose — it mirrors `auth.users.email`, and changing it
 * for real is an auth operation that re-verifies, not a profile field. The
 * screen shows it read-only.
 *
 * Date of birth is entered as YYYY-MM-DD and validated here rather than trusted
 * to a picker, because there is no cross-platform date picker in the stack yet.
 * The DB has its own sanity CHECK (`customers_dob_sane`), so a bad value cannot
 * land even if this is bypassed.
 */
export const editProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  phone: phField,
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .refine((v) => {
      const d = new Date(`${v}T00:00:00`);
      if (Number.isNaN(d.getTime())) return false;
      const year = d.getFullYear();
      return d < new Date() && year > 1900;
    }, 'Enter a real date in the past')
    .optional()
    .or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
});

export type SignupForm = z.infer<typeof signupSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type ForgotRequestForm = z.infer<typeof forgotRequestSchema>;
export type ForgotResetForm = z.infer<typeof forgotResetSchema>;
export type OtpForm = z.infer<typeof otpSchema>;
export type EditProfileForm = z.infer<typeof editProfileSchema>;
