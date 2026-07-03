import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { env, supabaseConfigured } from '@/lib/env';

/**
 * Shared Supabase client for the app.
 *
 * Uses AsyncStorage so the auth session survives app restarts (Phase 1).
 * `detectSessionInUrl` is false because we're not in a browser redirect flow.
 *
 * `null` until `.env` is filled in: `createClient` throws on an empty URL, so
 * we defer construction until config is present and let screens guard on it
 * (see `supabaseConfigured`) instead of crashing at import.
 */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
