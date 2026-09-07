import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { Alert, ScrollView, View } from 'react-native';

import { ShopHeader } from '@/components/admin/shop-header';
import { RowGroup, SettingsRow } from '@/components/ui/settings-row';
import { useAuth } from '@/features/auth/auth-context';

/**
 * Everything the shop needs occasionally rather than every day. The four tabs
 * are the daily loop; this is the drawer behind them.
 *
 * Uses the same `RowGroup`/`SettingsRow` primitives as the customer Profile —
 * one row implementation, so a press-state or accessibility fix lands on both
 * sides of the app at once.
 */
export default function AdminMore() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { signOut } = useAuth();

  return (
    <View className="flex-1 bg-canvas">
      <ShopHeader />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-2"
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <RowGroup label="Operations">
          <SettingsRow
            first
            icon="clock"
            label="Fittings"
            hint="Confirm and reschedule appointments"
            onPress={() => router.push('/admin/fittings')}
          />
          <SettingsRow
            icon="rotate-ccw"
            label="Returns"
            hint="Take an item back and start its cleaning window"
            onPress={() => router.push('/admin/returns')}
          />
        </RowGroup>

        <RowGroup label="Catalog">
          <SettingsRow
            first
            icon="tag"
            label="Categories"
            onPress={() => router.push('/admin/categories')}
          />
        </RowGroup>

        <RowGroup label="Account">
          {/*
            DEV ONLY. A shop owner is not a customer — in production these are
            different people and this row is noise. It exists so the customer app
            stays reachable while building, now that admins land in the admin
            shell. Same `__DEV__` gate as `devBypass` on the login screen.
          */}
          {__DEV__ ? (
            <SettingsRow
              first
              icon="shopping-bag"
              label="Switch to customer view"
              hint="Developer only — hidden in production builds"
              onPress={() => router.replace('/(app)/(tabs)')}
            />
          ) : null}
          <SettingsRow
            first={!__DEV__}
            icon="log-out"
            label="Sign out"
            destructive
            onPress={() =>
              Alert.alert('Sign out?', 'You can sign back in any time.', [
                { text: 'Stay', style: 'cancel' },
                {
                  text: 'Sign out',
                  style: 'destructive',
                  onPress: () => signOut(),
                },
              ])
            }
          />
        </RowGroup>
      </ScrollView>
    </View>
  );
}
