import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createMMKV } from 'react-native-mmkv';
import 'react-native-url-polyfill/auto';

import { env, supabaseConfigured } from '@/lib/env';

// MMKV is synchronous; Supabase's storage interface accepts sync return values.
const mmkv = createMMKV({ id: 'supabase-auth' });

const mmkvStorage = {
  getItem: (key: string) => mmkv.getString(key) ?? null,
  setItem: (key: string, value: string) => mmkv.set(key, value),
  removeItem: (key: string) => {
    mmkv.remove(key);
  },
};

/**
 * Shared Supabase client for the app.
 *
 * Uses MMKV so the auth session survives app restarts (Phase 1).
 * `detectSessionInUrl` is false because we're not in a browser redirect flow.
 *
 * `null` until `.env` is filled in: `createClient` throws on an empty URL, so
 * we defer construction until config is present and let screens guard on it
 * (see `supabaseConfigured`) instead of crashing at import.
 */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: mmkvStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * The configured client, or a clear error.
 *
 * Every write path needs this — there is no meaningful mock for a mutation — so
 * it lives with the nullable client rather than being re-declared in each
 * feature's `api.ts`. Three copies had already drifted in wording.
 */
export function requireDb(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_* to .env.',
    );
  }
  return supabase;
}

/**
 * Upload a locally-picked file to a bucket and return its public URL.
 *
 * `fetch(uri).arrayBuffer()` is the Expo-supported way to read a local file;
 * that idiom is the fragile part, so it is owned in one place rather than
 * copied per feature.
 */
export async function uploadToBucket(
  bucket: string,
  path: string,
  localUri: string,
  contentType: string,
): Promise<string> {
  const db = requireDb();
  const arrayBuffer = await fetch(localUri).then((res) => res.arrayBuffer());
  const { error } = await db.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw error;
  return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** jpg/png/webp from a MIME type — the only extensions the buckets accept. */
export function extensionFor(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  return 'jpg';
}
