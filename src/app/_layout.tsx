import '@/global.css';

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/poppins';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
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
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  // Hold the splash until Poppins is ready so no screen flashes in a fallback
  // face. If loading fails, proceed anyway (system font) rather than hang on a
  // blank splash. AuthGate hides the splash once the session has resolved.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
        >
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default RootLayout;
