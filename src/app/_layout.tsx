import '@/global.css';

import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { initSentry, Sentry } from '@/lib/sentry';

initSentry();
SplashScreen.preventAutoHideAsync();

// Screens a signed-in-but-not-finished user is allowed to stay on inside the
// (auth) group — otherwise a fresh session would bounce them straight to the app
// before they verify their phone or read the legal copy.
const SESSION_ALLOWED_AUTH_SCREENS = new Set([
  'verify-otp',
  'terms',
  'privacy',
]);

function AuthGate() {
  const { loading, session, devBypass } = useAuth();
  const segments = useSegments();
  const { replace } = useRouter();

  // `devBypass` is a DEV-ONLY demo shortcut; in production it is always false.
  const authed = Boolean(session) || devBypass;

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';
    const screen = segments[1];

    if (!authed && !inAuthGroup) {
      replace('/(auth)/login');
    } else if (
      authed &&
      inAuthGroup &&
      !SESSION_ALLOWED_AUTH_SCREENS.has(screen ?? '')
    ) {
      replace('/(app)');
    }
  }, [loading, authed, segments, replace]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
