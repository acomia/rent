import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { GRAPE } from '@/components/catalog/catalog-style';
import { useAuth } from '@/features/auth/auth-context';

/**
 * Guards the admin area. RLS is the real enforcement (every write policy checks
 * `is_admin()`); this is a UX gate so a non-admin never sees admin screens and
 * a deep link bounces back to the customer tabs. Mirrors the `AuthGate`
 * redirect-once-loaded pattern in the root layout.
 */
export default function AdminLayout() {
  const { loading, isAdmin } = useAuth();
  const { replace } = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) replace('/(app)/(tabs)');
  }, [loading, isAdmin, replace]);

  if (loading || !isAdmin) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-night-950">
        <ActivityIndicator color={GRAPE} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
