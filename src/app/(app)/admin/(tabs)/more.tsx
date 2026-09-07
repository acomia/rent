import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { ShopHeader } from '@/components/admin/shop-header';
import { INK, MUTED } from '@/components/catalog/catalog-style';
import { useAuth } from '@/features/auth/auth-context';

type FeatherName = keyof typeof Feather.glyphMap;

function MenuRow({
  icon,
  label,
  hint,
  destructive = false,
  onPress,
}: {
  icon: FeatherName;
  label: string;
  hint?: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl border p-4 active:opacity-80 ${
        destructive
          ? 'border-overdue-soft bg-overdue-soft/50'
          : 'border-hairline bg-surface'
      }`}
    >
      <Feather name={icon} size={18} color={destructive ? '#A83232' : INK} />
      <View className="flex-1">
        <Text
          className={`font-sans-medium text-base ${destructive ? 'text-overdue' : 'text-ink'}`}
        >
          {label}
        </Text>
        {hint ? (
          <Text className="font-sans text-xs text-muted">{hint}</Text>
        ) : null}
      </View>
      {destructive ? null : (
        <Feather name="chevron-right" size={18} color={MUTED} />
      )}
    </Pressable>
  );
}

/**
 * Everything the shop needs occasionally rather than every day. The four tabs
 * are the daily loop; this is the drawer behind them.
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
        <View className="gap-3">
          <Text className="font-sans-medium text-[11px] uppercase tracking-[2px] text-muted">
            Operations
          </Text>
          <MenuRow
            icon="clock"
            label="Fittings"
            hint="Confirm and reschedule appointments"
            onPress={() => router.push('/admin/fittings')}
          />
          <MenuRow
            icon="rotate-ccw"
            label="Returns"
            hint="Take an item back and start its cleaning window"
            onPress={() => router.push('/admin/returns')}
          />
        </View>

        <View className="gap-3">
          <Text className="font-sans-medium text-[11px] uppercase tracking-[2px] text-muted">
            Catalog
          </Text>
          <MenuRow
            icon="tag"
            label="Categories"
            onPress={() => router.push('/admin/categories')}
          />
        </View>

        <View className="gap-3">
          <Text className="font-sans-medium text-[11px] uppercase tracking-[2px] text-muted">
            Account
          </Text>
          {/*
            DEV ONLY. A shop owner is not a customer — in production these are
            different people and this row is noise. It exists so the customer app
            stays reachable while building, now that admins land in the admin
            shell. Same `__DEV__` gate as `devBypass` on the login screen.
          */}
          {__DEV__ ? (
            <MenuRow
              icon="shopping-bag"
              label="Switch to customer view"
              hint="Developer only — hidden in production builds"
              onPress={() => router.replace('/(app)/(tabs)')}
            />
          ) : null}
          <MenuRow
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
        </View>
      </ScrollView>
    </View>
  );
}
