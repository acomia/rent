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
