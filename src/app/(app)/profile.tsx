import { FieldGroup, Host, ListItem, TextInput } from '@expo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/auth-context';
import { updateCustomer, type Customer } from '@/features/auth/customer';
import { normalizePhone, profileSchema } from '@/features/auth/schemas';

export default function Profile() {
  const { customer } = useAuth();
  const insets = useSafeAreaInsets();

  if (!customer) {
    return (
      <View
        className="flex-1 items-center justify-center bg-canvas dark:bg-night-950"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator color="#8165CA" />
      </View>
    );
  }

  // Keyed by id so state re-initializes from a freshly loaded customer.
  return <ProfileForm key={customer.id} customer={customer} />;
}

function ProfileForm({ customer }: { customer: Customer }) {
  const insets = useSafeAreaInsets();
  const { replace, back } = useRouter();
  const { user, phoneVerified, refreshCustomer, signOut } = useAuth();

  const [fullName, setFullName] = useState(customer.full_name ?? '');
  const [phone, setPhone] = useState(customer.phone_number ?? '');
  const [address, setAddress] = useState(customer.address ?? '');
  const [saving, setSaving] = useState(false);

  async function onSave() {
    const parsed = profileSchema.safeParse({ fullName, phone, address });
    if (!parsed.success) {
      Alert.alert('Check your details', parsed.error.issues[0].message);
      return;
    }
    const normalizedPhone = normalizePhone(parsed.data.phone);
    setSaving(true);
    try {
      await updateCustomer(customer.id, {
        full_name: parsed.data.fullName,
        phone_number: normalizedPhone,
        address: parsed.data.address ? parsed.data.address : null,
      });
      await refreshCustomer();
      // Reflect the persisted/normalized values (the row id is unchanged, so the
      // key-based remount won't fire — sync local state explicitly).
      setFullName(parsed.data.fullName);
      setPhone(normalizedPhone);
      setAddress(parsed.data.address ?? '');
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e) {
      Alert.alert(
        'Could not save',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  function onSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-canvas dark:bg-night-950">
      <View
        className="flex-row items-center justify-between px-5 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => back()}
          className="py-1 active:opacity-70"
        >
          <Text className="font-sans text-base text-grape dark:text-grape-soft">
            Back
          </Text>
        </Pressable>
        <Text className="font-sans-semibold text-lg text-ink dark:text-cloud">
          Profile
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={onSave}
          className="py-1 active:opacity-70"
        >
          <Text className="font-sans-semibold text-base text-grape dark:text-grape-soft">
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title="Full name">
            <TextInput
              defaultValue={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholder="Your full name"
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Contact number">
            <TextInput
              defaultValue={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="09xx xxx xxxx"
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Address">
            <TextInput
              defaultValue={address}
              onChangeText={setAddress}
              multiline
              placeholder="Where we can reach you"
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Account">
            <ListItem supportingText={user?.email ?? '—'}>Email</ListItem>
            <ListItem
              supportingText={phoneVerified ? 'Verified' : 'Not verified'}
            >
              Phone verification
            </ListItem>
          </FieldGroup.Section>

          <FieldGroup.Section>
            <ListItem onPress={onSignOut}>Sign out</ListItem>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </View>
  );
}
