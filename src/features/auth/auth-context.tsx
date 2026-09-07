import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/lib/supabase';
import { supabaseConfigured } from '@/lib/env';
import { fetchAdmin } from '@/features/admin/api';
import type { Admin } from '@/features/admin/types';

import { fetchCustomer, type Customer } from './customer';

type AuthState = {
  /** True until the initial session restore completes — gate on this to avoid a redirect flash. */
  loading: boolean;
  /** False when `.env` has no Supabase keys; screens can show a setup hint. */
  configured: boolean;
  session: Session | null;
  user: User | null;
  customer: Customer | null;
  /** The admin row for the current user, or null if they are not an admin. */
  admin: Admin | null;
  /** Convenience flag: true when the signed-in user has an `admins` row. */
  isAdmin: boolean;
  /**
   * False while the `admins` lookup for the current user is still in flight.
   *
   * `isAdmin` is `Boolean(admin)`, so it reads false both for "not an admin" and
   * for "we don't know yet". Anything that BRANCHES on role — chiefly the
   * post-login redirect — must wait on this instead, or it will send an admin to
   * the customer app and then correct itself, which the user sees as a flash.
   */
  roleResolved: boolean;
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

/**
 * Guards against a stale fetch (from a previous user/session) committing after
 * a newer load has started — e.g. sign-out or account switch mid-flight. Bumps
 * a ref before fetching and only commits state if it's still the most recent
 * load by the time the fetch resolves.
 */
function useGuardedLoad<T>(
  fetch: (userId: string) => Promise<T | null>,
  setState: (value: T | null) => void,
) {
  const loadId = useRef(0);
  return useCallback(
    async (userId: string | undefined) => {
      const id = ++loadId.current;
      if (!userId) {
        setState(null);
        return;
      }
      try {
        const next = await fetch(userId);
        if (id === loadId.current) setState(next);
      } catch (e) {
        if (id !== loadId.current) return;
        // A missing row right after signup is expected (trigger may lag); leave
        // null and let a later refresh pick it up. Report anything unexpected.
        console.error(e);
        setState(null);
      }
    },
    [fetch, setState],
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // If Supabase isn't configured there's no session to restore, so we're not
  // loading — start false and skip the effect. Avoids a sync setState in the effect.
  const [loading, setLoading] = useState(Boolean(supabase));
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [roleResolved, setRoleResolved] = useState(!supabase);
  const [devBypass, setDevBypass] = useState(false);

  const user = session?.user ?? null;

  const loadCustomer = useGuardedLoad<Customer>(fetchCustomer, setCustomer);
  // Admin status resolves alongside the customer. `fetchAdmin` swallows the
  // "no row / not visible" case to null, so a non-admin simply lands on null.
  const loadAdmin = useGuardedLoad<Admin>(fetchAdmin, setAdmin);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        return Promise.all([
          loadCustomer(data.session?.user.id),
          loadAdmin(data.session?.user.id),
        ]);
      })
      .catch((e) => {
        // Cold-start network failure: don't strand the app on the splash.
        console.error(e);
        if (active) {
          setSession(null);
          setCustomer(null);
          setAdmin(null);
        }
      })
      .finally(() => {
        if (active) {
          setRoleResolved(true);
          setLoading(false);
        }
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next?.user) {
        setCustomer(null);
        setAdmin(null);
        setRoleResolved(true);
        return;
      }
      setRoleResolved(false);
      Promise.all([
        loadCustomer(next.user.id),
        loadAdmin(next.user.id),
      ]).finally(() => setRoleResolved(true));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadCustomer, loadAdmin]);

  const refreshCustomer = useCallback(
    () => loadCustomer(session?.user.id),
    [loadCustomer, session?.user.id],
  );

  const enableDevBypass = useCallback(() => {
    if (__DEV__) setDevBypass(true);
  }, []);

  const signOut = useCallback(async () => {
    setDevBypass(false);
    setAdmin(null);
    await supabase?.auth.signOut();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      configured: supabaseConfigured,
      session,
      user,
      customer,
      admin,
      isAdmin: Boolean(admin),
      roleResolved,
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
      admin,
      roleResolved,
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
