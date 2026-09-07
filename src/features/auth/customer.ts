import { supabase } from '@/lib/supabase';

/**
 * Row shape of `public.customers` (see `src/db/0001_customers.sql`).
 * `id` equals the `auth.users` id. The row is created server-side by a trigger
 * on signup; the client only ever reads and updates its own row.
 */
export type Customer = {
  id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  address: string | null;
  id_document_url: string | null; // KYC option B — unused in v1
  deposit_tier: 'full' | 'reduced'; // KYC option C — always 'full' in v1
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  terms_version: string | null;
  /** Public URL in the `avatars` bucket, or null for the initial fallback. */
  avatar_url: string | null;
  date_of_birth: string | null;
  preferred_language: 'en' | 'fil';
  /** Email/marketing consent — distinct from the push channels below. */
  marketing_opt_in: boolean;
  notify_booking_updates: boolean;
  notify_new_arrivals: boolean;
  notify_promotions: boolean;
  notify_tips: boolean;
  created_at: string;
  updated_at: string;
};

/** The push channels, as one object — the shape the Settings switches bind to. */
export type NotificationPrefs = Pick<
  Customer,
  | 'notify_booking_updates'
  | 'notify_new_arrivals'
  | 'notify_promotions'
  | 'notify_tips'
>;

export async function fetchCustomer(userId: string): Promise<Customer | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Customer | null;
}

export type CustomerUpdate = {
  full_name?: string;
  phone_number?: string;
  address?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  preferred_language?: 'en' | 'fil';
  marketing_opt_in?: boolean;
  notify_booking_updates?: boolean;
  notify_new_arrivals?: boolean;
  notify_promotions?: boolean;
  notify_tips?: boolean;
};

/**
 * NOTE on email: it is absent from `CustomerUpdate` on purpose. The column
 * mirrors `auth.users.email`, so writing it alone would let the two drift and
 * the customer would still sign in with the old address. Changing it for real is
 * `supabase.auth.updateUser({ email })`, which re-verifies — a flow of its own,
 * not a profile field. The profile UI shows email read-only and says so.
 */

const AVATAR_BUCKET = 'avatars';

/**
 * Upload a locally-picked image as this customer's avatar and return its public
 * URL.
 *
 * The path MUST start with the user's own id: every write policy on the bucket
 * checks that first segment against `auth.uid()`, which is what stops one
 * customer overwriting another's photo (see `0015_storage_avatars.sql`).
 */
export async function uploadAvatar(
  userId: string,
  localUri: string,
  contentType = 'image/jpeg',
): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const ext = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : 'jpg';
  const uid = `${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`}`;
  const path = `${userId}/${uid}.${ext}`;

  const arrayBuffer = await fetch(localUri).then((res) => res.arrayBuffer());
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw error;

  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function updateCustomer(
  userId: string,
  patch: CustomerUpdate,
): Promise<Customer> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase
    .from('customers')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Customer;
}
