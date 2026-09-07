import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INK } from '@/components/catalog/catalog-style';
import { Avatar } from '@/components/ui/avatar';
import { RowGroup, SettingsRow } from '@/components/ui/settings-row';
import { useAuth } from '@/features/auth/auth-context';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function memberSince(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function Profile() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { customer, user, isAdmin } = useAuth();

  const since = memberSince(customer?.created_at);

  return (
    <View className="flex-1 bg-canvas">
      <View
        className="flex-row items-center justify-between px-5 pb-2"
        style={{ paddingTop: insets.top + 10 }}
      >
        <Text className="font-display-bold text-3xl text-ink">Profile</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/(app)/profile/settings')}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
        >
          <Feather name="settings" size={21} color={INK} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="gap-5 px-5 pt-2"
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile photo"
            onPress={() => router.push('/(app)/profile/edit')}
            className="active:opacity-80"
          >
            <Avatar
              uri={customer?.avatar_url}
              name={customer?.full_name}
              size={76}
              badge={
                <View className="h-7 w-7 items-center justify-center rounded-full border-2 border-canvas bg-bronze">
                  <Feather name="edit-2" size={12} color="#FFFFFF" />
                </View>
              }
            />
          </Pressable>
          <View className="flex-1 gap-0.5">
            <Text
              numberOfLines={1}
              className="font-display-bold text-xl text-ink"
            >
              {customer?.full_name || 'Your profile'}
            </Text>
            <Text numberOfLines={1} className="font-sans text-sm text-muted">
              {customer?.email ?? user?.email ?? ''}
            </Text>
            {customer?.phone_number ? (
              <Text className="font-sans text-sm text-muted">
                {customer.phone_number}
              </Text>
            ) : null}
          </View>
        </View>

        {/*
          Membership recognition, derived from the signup date alone. Deliberately
          NOT a tier: loyalty and rewards are v2, so this says nothing it cannot
          back up — no points, no level, no implied discount.
        */}
        {since ? (
          <View className="flex-row items-center gap-3 rounded-2xl bg-bronze-soft px-4 py-3.5">
            <Feather name="award" size={22} color="#8A6F45" />
            <View className="gap-0.5">
              <Text className="font-sans-semibold text-base text-bronze-deep">
                Valued customer
              </Text>
              <Text className="font-sans text-xs text-bronze-deep">
                Since {since}
              </Text>
            </View>
          </View>
        ) : null}

        <RowGroup>
          <SettingsRow
            first
            icon="calendar"
            label="My bookings"
            hint="View and manage your bookings"
            onPress={() => router.push('/(app)/(tabs)/bookings')}
          />
        </RowGroup>

        <RowGroup>
          <SettingsRow
            first
            icon="user"
            label="Personal information"
            hint="Name, phone number, date of birth"
            onPress={() => router.push('/(app)/profile/edit')}
          />
          <SettingsRow
            icon="bell"
            label="Notification preferences"
            hint="Choose what you want to receive"
            onPress={() => router.push('/(app)/profile/settings')}
          />
        </RowGroup>

        <RowGroup>
          <SettingsRow
            first
            icon="help-circle"
            label="Help & support"
            hint="Get assistance anytime"
            onPress={() => router.push('/(app)/profile/settings')}
          />
          <SettingsRow
            icon="file-text"
            label="Terms and policies"
            hint="Terms of service, privacy policy"
            onPress={() => router.push('/(auth)/terms')}
          />
        </RowGroup>

        {isAdmin ? (
          <RowGroup label="Shop">
            <SettingsRow
              first
              icon="briefcase"
              label="Shop admin"
              hint="Bookings, items, returns"
              onPress={() => router.replace('/admin')}
            />
          </RowGroup>
        ) : null}
      </ScrollView>
    </View>
  );
}
