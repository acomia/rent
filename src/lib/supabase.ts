import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { env } from '@/lib/env';

/**
 * Shared Supabase client for the app.
 *
 * Uses AsyncStorage so the auth session survives app restarts (Phase 1).
 * `detectSessionInUrl` is false because we're not in a browser redirect flow.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
