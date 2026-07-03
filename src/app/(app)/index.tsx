import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brandmark } from '@/components/brandmark';
import { useAuth } from '@/features/auth/auth-context';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { customer, user, phoneVerified } = useAuth();
  const firstName = (customer?.full_name ?? '').split(' ')[0];

  return (
    <ScrollView
      className="flex-1 bg-blush dark:bg-plum-950"
      contentContainerClassName="gap-8 px-6"
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 48 }}
    >
      <View className="flex-row items-center justify-between">
        <Brandmark tagline="Your account" />
        <Link href="/(app)/profile" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            className="h-11 w-11 items-center justify-center rounded-full bg-wine active:opacity-80 dark:bg-wine-soft"
          >
            <Text className="text-base font-semibold text-white">
              {(firstName || user?.email || '?').charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </Link>
      </View>

      <View className="gap-1">
        <Text className="text-3xl font-semibold text-ink dark:text-cream">
          {firstName ? `Hello, ${firstName}.` : 'Hello.'}
        </Text>
        <Text className="text-base text-muted">
          {phoneVerified
            ? 'Your number is verified. The catalog opens in the next phase.'
            : 'Finish verifying your number to unlock booking.'}
        </Text>
      </View>

      {/* Placeholder for the catalog that arrives in Phase 2. */}
      <View className="items-center gap-2 rounded-3xl border border-dashed border-wine/25 px-6 py-14 dark:border-cream/15">
        <Text className="text-lg font-medium text-ink dark:text-cream">
          Catalog coming soon
        </Text>
        <Text className="text-center text-sm text-muted">
          Browse, search, and reserve gowns and costumes — landing in Phase 2.
        </Text>
      </View>

      <Link
        href="/(app)/profile"
        className="self-center font-medium text-wine dark:text-champagne"
      >
        Edit your profile →
      </Link>
    </ScrollView>
  );
}
