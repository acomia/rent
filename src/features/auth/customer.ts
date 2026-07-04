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
  created_at: string;
  updated_at: string;
};

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
};

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
