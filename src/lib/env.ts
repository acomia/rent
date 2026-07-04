/**
 * Centralized access to public runtime config.
 *
 * Only `EXPO_PUBLIC_*` values are safe to read on the client — they are inlined
 * into the JS bundle at build time. Never put secrets (service-role keys,
 * PayMongo secret keys, Resend/SMS API keys) here; those live server-side in
 * Supabase edge functions.
 *
 * Values are read leniently (no throw at import) so the app still boots before
 * `.env` is filled in — screens can check `env.supabaseConfigured` and show a
 * setup hint instead of crashing.
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

export const supabaseConfigured = Boolean(
  env.supabaseUrl && env.supabaseAnonKey,
);
