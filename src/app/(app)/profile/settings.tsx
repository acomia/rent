import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { RowGroup, SettingsRow, SwitchRow } from '@/components/ui/settings-row';
import { FlowHeader } from '@/components/booking/flow-header';
import { useAuth } from '@/features/auth/auth-context';
import {
  updateCustomer,
  type NotificationPrefs,
} from '@/features/auth/customer';

type PrefKey = keyof NotificationPrefs;

const CHANNELS: {
  key: PrefKey;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  hint: string;
}[] = [
  {
    key: 'notify_booking_updates',
    icon: 'bell',
    label: 'Booking updates',
    hint: 'Status changes, reminders',
  },
  {
    key: 'notify_new_arrivals',
    icon: 'star',
    label: 'New arrivals',
    hint: 'Be the first to know',
  },
  {
    key: 'notify_promotions',
    icon: 'tag',
    label: 'Promotions and offers',
    hint: 'Discounts and seasonal deals',
  },
  {
    key: 'notify_tips',
    icon: 'zap',
    label: 'Tips and styling ideas',
    hint: 'Occasional inspiration',
  },
];

export default function Settings() {
  const router = useRouter();
  const { customer, user, commitCustomer, signOut } = useAuth();

  // Optimistic: a switch that lags behind the finger feels broken. The write is
  // fire-and-forget with a rollback, not a spinner.
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    notify_booking_updates: customer?.notify_booking_updates ?? true,
    notify_new_arrivals: customer?.notify_new_arrivals ?? true,
    notify_promotions: customer?.notify_promotions ?? false,
    notify_tips: customer?.notify_tips ?? false,
  });

  async function toggle(key: PrefKey, next: boolean) {
    if (!user) return;
    const previous = prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    try {
      commitCustomer(await updateCustomer(user.id, { [key]: next }));
    } catch (e) {
      setPrefs((p) => ({ ...p, [key]: previous }));
      Alert.alert(
        'Couldn’t save that',
        e instanceof Error ? e.message : 'Please try again.',
      );
    }
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader title="Settings" />

      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-10 pt-1"
        showsVerticalScrollIndicator={false}
      >
        <RowGroup label="Account">
          <SettingsRow
            first
            icon="mail"
            label="Email"
            hint={customer?.email ?? user?.email ?? '—'}
          />
          <SettingsRow
            icon="phone"
            label="Phone number"
            hint={customer?.phone_number ?? 'Not set'}
            onPress={() => router.replace('/(app)/profile/edit')}
          />
          <SettingsRow
            icon="lock"
            label="Change password"
            onPress={() =>
              Alert.alert(
                'Change password',
                'We’ll email you a reset link. Sign out and use “Forgot password” on the login screen.',
              )
            }
          />
          <SettingsRow
            icon="trash-2"
            label="Delete account"
            destructive
            onPress={() =>
              Alert.alert(
                'Delete account?',
                'This removes your profile and rental history. Bookings that are still active must be settled with the shop first.',
                [
                  { text: 'Keep my account', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () =>
                      Alert.alert(
                        'Not available yet',
                        'Account deletion needs a server-side flow so your rental records are handled correctly. Contact the shop and we’ll do it for you.',
                      ),
                  },
                ],
              )
            }
          />
        </RowGroup>

        <RowGroup label="Notifications">
          {CHANNELS.map((c, i) => (
            <SwitchRow
              key={c.key}
              first={i === 0}
              icon={c.icon}
              label={c.label}
              hint={c.hint}
              value={prefs[c.key]}
              onChange={(next) => toggle(c.key, next)}
            />
          ))}
        </RowGroup>

        <RowGroup label="App">
          {/*
            Appearance and Language are shown as current state, not choices:
            the design is light-only and the app is single-locale in v1, so
            offering a picker would promise something that does nothing.
          */}
          <SettingsRow first icon="sun" label="Appearance" value="Light" />
          <SettingsRow icon="globe" label="Language" value="English" />
          <SettingsRow icon="info" label="App version" value={version} />
        </RowGroup>

        <RowGroup>
          <SettingsRow
            first
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
