import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/lib/supabase';
import { supabaseConfigured } from '@/lib/env';
import { Sentry } from '@/lib/sentry';

import { fetchCustomer, type Customer } from './customer';

type AuthState = {
  /** True until the initial session restore completes — gate on this to avoid a redirect flash. */
  loading: boolean;
  /** False when `.env` has no Supabase keys; screens can show a setup hint. */
  configured: boolean;
  session: Session | null;
  user: User | null;
  customer: Customer | null;
  /** Whether the user has completed phone-OTP verification. */
  phoneVerified: boolean;
  /** DEV-ONLY: true when auth has been bypassed for local demo (no real session). */
  devBypass: boolean;
  /** DEV-ONLY: skip auth and treat the app as signed in. No-op in production builds. */
  enableDevBypass: () => void;
  refreshCustomer: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // If Supabase isn't configured there's no session to restore, so we're not
  // loading — start false and skip the effect. Avoids a sync setState in the effect.
  const [loading, setLoading] = useState(Boolean(supabase));
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [devBypass, setDevBypass] = useState(false);

  const user = session?.user ?? null;

  const loadCustomer = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setCustomer(null);
      return;
    }
    try {
      setCustomer(await fetchCustomer(userId));
    } catch (e) {
      // A missing row right after signup is expected (trigger may lag); leave
      // null and let a later refresh pick it up. Report anything unexpected.
      Sentry.captureException(e);
      setCustomer(null);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      loadCustomer(data.session?.user.id).finally(() => {
        if (active) setLoading(false);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      loadCustomer(next?.user.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadCustomer]);

  const refreshCustomer = useCallback(
    () => loadCustomer(session?.user.id),
    [loadCustomer, session?.user.id],
  );

  const enableDevBypass = useCallback(() => {
    if (__DEV__) setDevBypass(true);
  }, []);

  const signOut = useCallback(async () => {
    setDevBypass(false);
    await supabase?.auth.signOut();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      configured: supabaseConfigured,
      session,
      user,
      customer,
      phoneVerified: Boolean(user?.phone_confirmed_at),
      devBypass,
      enableDevBypass,
      refreshCustomer,
      signOut,
    }),
    [
      loading,
      session,
      user,
      customer,
      devBypass,
      enableDevBypass,
      refreshCustomer,
      signOut,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
