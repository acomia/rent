import '@/global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  useFonts,
} from '@expo-google-fonts/playfair-display';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();

// Screens a signed-in-but-not-finished user is allowed to stay on inside the
// (auth) group — otherwise a fresh session would bounce them straight to the app
// before they finish. `forgot-password` is included because verifyOtp(recovery)
// creates a temporary session mid-flow; the reset must complete (updateUser +
// signOut) without being redirected away.
const SESSION_ALLOWED_AUTH_SCREENS = new Set([
  'verify-otp',
  'forgot-password',
  'terms',
  'privacy',
]);

function AuthGate() {
  const { loading, session, devBypass, isAdmin, roleResolved } = useAuth();
  const segments = useSegments();
  const { replace } = useRouter();

  // `devBypass` is a DEV-ONLY demo shortcut; in production it is always false.
  const authed = Boolean(session) || devBypass;
  const uid = session?.user.id ?? (devBypass ? 'dev' : null);

  // Which signed-in admin we have already sent to the shop. Routing ONCE per
  // account is the whole point: a cold start must land an admin in the shop,
  // but tapping "Switch to customer view" afterwards must stick.
  const sentToShopFor = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';
    const screen = segments[1];

    if (!authed && !inAuthGroup) {
      sentToShopFor.current = null;
      replace('/(auth)/login');
      return;
    }

    if (
      authed &&
      inAuthGroup &&
      !SESSION_ALLOWED_AUTH_SCREENS.has(screen ?? '')
    ) {
      // Wait until we know whether this is a shop account. `session` lands a
      // tick before the `admins` lookup returns, so redirecting now would send
      // an admin to the storefront and then correct itself — the user sees the
      // customer dashboard flash past. Staying on the login screen for that
      // tick is the better trade.
      if (!roleResolved) return;
      if (isAdmin && uid) sentToShopFor.current = uid;
      replace(isAdmin ? '/admin' : '/(app)/(tabs)');
      return;
    }

    // A restored session does not pass through the auth group at all — it comes
    // straight back to the customer tabs — so the branch above never runs on a
    // cold start. This is what actually puts the shop in the shop. It also
    // covers a fresh sign-in where `admin` resolves a tick after `session`,
    // because the effect re-runs when `isAdmin` flips.
    if (
      authed &&
      roleResolved &&
      isAdmin &&
      uid &&
      sentToShopFor.current !== uid
    ) {
      sentToShopFor.current = uid;
      replace('/admin');
    }
  }, [loading, authed, isAdmin, roleResolved, uid, segments, replace]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  // Hold the splash until both faces are ready so no screen flashes in a
  // fallback. If loading fails, proceed anyway (system font) rather than hang
  // on a blank splash. AuthGate hides the splash once the session resolves.
  if (!fontsLoaded && !fontError) return null;

  // The design is light-only (see DESIGN.md), so the theme is pinned rather
  // than following the system scheme — a warm ivory app has no honest
  // inversion, and half-converted dark surfaces read as bugs.
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={DefaultTheme}>
          <AuthProvider>
            <StatusBar style="dark" />
            <AuthGate />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default RootLayout;
