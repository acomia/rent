import { Feather } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INK, MUTED } from '@/components/catalog/catalog-style';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { RowGroup, SettingsRow, SwitchRow } from '@/components/ui/settings-row';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/features/auth/auth-context';
import { updateCustomer, uploadAvatar } from '@/features/auth/customer';
import {
  editProfileSchema,
  normalizePhone,
  type EditProfileForm,
} from '@/features/auth/schemas';

/** Strips the +63 / 0 prefix for display; `normalizePhone` puts it back. */
function localPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  return e164.startsWith('+63') ? `0${e164.slice(3)}` : e164;
}

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { customer, user, refreshCustomer } = useAuth();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(
    customer?.avatar_url ?? null,
  );
  const [marketing, setMarketing] = useState(
    customer?.marketing_opt_in ?? false,
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      fullName: customer?.full_name ?? '',
      phone: localPhone(customer?.phone_number),
      dateOfBirth: customer?.date_of_birth ?? '',
      address: customer?.address ?? '',
    },
  });

  async function pickAvatar() {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow photo access in Settings to change your picture.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const url = await uploadAvatar(
        user.id,
        result.assets[0].uri,
        result.assets[0].mimeType ?? 'image/jpeg',
      );
      setAvatar(url);
    } catch (e) {
      Alert.alert(
        'Upload failed',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: EditProfileForm) {
    if (!user) return;
    setSaving(true);
    try {
      await updateCustomer(user.id, {
        full_name: values.fullName,
        phone_number: normalizePhone(values.phone),
        date_of_birth: values.dateOfBirth ? values.dateOfBirth : null,
        address: values.address ? values.address : null,
        avatar_url: avatar,
        marketing_opt_in: marketing,
      });
      await refreshCustomer();
      router.back();
    } catch (e) {
      Alert.alert(
        'Couldn’t save',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  const changed =
    isDirty ||
    avatar !== (customer?.avatar_url ?? null) ||
    marketing !== (customer?.marketing_opt_in ?? false);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="flex-row items-center gap-3 px-5 pb-3"
        style={{ paddingTop: insets.top + 10 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface active:opacity-70"
        >
          <Feather name="chevron-left" size={19} color={INK} />
        </Pressable>
        <Text className="font-display-semibold text-xl text-ink">
          Edit profile
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-8"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center gap-3 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            onPress={pickAvatar}
            disabled={uploading}
            className="active:opacity-80"
          >
            <Avatar
              uri={avatar}
              name={customer?.full_name}
              size={104}
              badge={
                <View className="h-9 w-9 items-center justify-center rounded-full border-2 border-canvas bg-charcoal">
                  <Feather
                    name={uploading ? 'loader' : 'camera'}
                    size={15}
                    color="#FFFFFF"
                  />
                </View>
              }
            />
          </Pressable>
          <Text className="font-sans text-sm text-muted">
            {uploading ? 'Uploading…' : 'Tap to change photo'}
          </Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="fullName"
            render={({ field }) => (
              <TextField
                label="Full name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="words"
                error={errors.fullName?.message}
              />
            )}
          />

          {/*
            Email is read-only here. The column mirrors auth.users.email, so
            writing it alone would let the two drift and the customer would still
            sign in with the old address. A real change is
            supabase.auth.updateUser({ email }) plus re-verification — its own
            flow, not a text field.
          */}
          <View className="gap-2">
            <Text className="font-sans-medium text-sm text-ink">
              Email address
            </Text>
            <View className="flex-row items-center gap-2 rounded-2xl border border-hairline bg-canvas-subtle px-4 py-4">
              <Feather name="lock" size={14} color={MUTED} />
              <Text className="flex-1 font-sans text-base text-muted">
                {customer?.email ?? user?.email ?? '—'}
              </Text>
            </View>
            <Text className="font-sans text-xs text-muted">
              This is your sign-in address. Contact support to change it.
            </Text>
          </View>

          {/*
            A single fixed +63 rather than a country picker: the scope is the PH
            market only, and a dropdown with one option pretends otherwise.
          */}
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <View className="gap-2">
                <Text className="font-sans-medium text-sm text-ink">
                  Phone number
                </Text>
                <View className="flex-row items-center gap-2">
                  <View className="flex-row items-center gap-1.5 rounded-2xl border border-hairline bg-canvas-subtle px-3 py-4">
                    <Text className="text-base">🇵🇭</Text>
                    <Text className="font-sans-medium text-base text-ink">
                      +63
                    </Text>
                  </View>
                  <View className="flex-1">
                    <TextField
                      label=""
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      keyboardType="phone-pad"
                      placeholder="09xx xxx xxxx"
                      error={errors.phone?.message}
                    />
                  </View>
                </View>
              </View>
            )}
          />

          <Controller
            control={control}
            name="dateOfBirth"
            render={({ field }) => (
              <TextField
                label="Date of birth"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                error={errors.dateOfBirth?.message}
                hint="Optional"
              />
            )}
          />

          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <TextField
                label="Address"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                multiline
                error={errors.address?.message}
                hint="Optional — used for pickup reminders"
              />
            )}
          />
        </View>

        <RowGroup label="Preferences">
          <SettingsRow
            first
            label="Preferred language"
            value={
              customer?.preferred_language === 'fil' ? 'Filipino' : 'English'
            }
          />
          <SwitchRow
            label="Marketing communications"
            hint="Updates about new arrivals and promotions"
            value={marketing}
            onChange={setMarketing}
          />
        </RowGroup>

        <Button
          label="Save changes"
          disabled={!changed || uploading}
          loading={saving}
          onPress={handleSubmit(onSubmit)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
