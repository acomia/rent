import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AdminHeader } from '@/components/admin/admin-header';
import { BRONZE } from '@/components/catalog/catalog-style';
import { CatalogError } from '@/components/catalog/states';
import { TextField } from '@/components/ui/text-field';
import {
  useAdminShopSettings,
  useSaveShopSettings,
} from '@/features/admin/home-hooks';
import {
  shopSettingsSchema,
  type ShopSettingsFormInput,
  type ShopSettingsFormValues,
} from '@/features/admin/schemas';

/**
 * Shop details — the one row of `shop_settings`.
 *
 * Small screen, disproportionate reach: before `0016` the app had no record of
 * the shop itself, so "Pick up at Makati", "Visit store" and the pickup hours
 * on an upcoming booking had nowhere to read from. Every field here surfaces
 * somewhere a customer acts on it, so each one says where.
 */

const EMPTY_FORM: ShopSettingsFormInput = {
  name: '',
  addressLine: '',
  city: '',
  pickupLabel: '',
  mapUrl: '',
  phone: '',
  pickupFrom: '',
  pickupTo: '',
};

export default function AdminShopSettings() {
  const { back } = useRouter();
  const shop = useAdminShopSettings();
  const save = useSaveShopSettings();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ShopSettingsFormInput, unknown, ShopSettingsFormValues>({
    resolver: zodResolver(shopSettingsSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    const s = shop.data;
    if (!s) return;
    reset({
      name: s.name,
      addressLine: s.addressLine ?? '',
      city: s.city ?? '',
      pickupLabel: s.pickupLabel ?? '',
      mapUrl: s.mapUrl ?? '',
      phone: s.phone ?? '',
      // Stored as `time`, which Postgres hands back as 'HH:MM:SS'. The field
      // edits 'HH:MM'; seconds were never meaningful for a shop's opening time.
      pickupFrom: (s.pickupFrom ?? '').slice(0, 5),
      pickupTo: (s.pickupTo ?? '').slice(0, 5),
    });
  }, [shop.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      back();
    } catch (e) {
      Alert.alert(
        'Could not save',
        e instanceof Error ? e.message : 'Please try again.',
      );
    }
  });

  if (shop.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={BRONZE} />
      </View>
    );
  }

  if (shop.isError) {
    return (
      <View className="flex-1 bg-canvas">
        <AdminHeader title="Shop details" onBack={() => back()} />
        <CatalogError onRetry={() => shop.refetch()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <AdminHeader
        title="Shop details"
        onBack={() => back()}
        right={
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={onSubmit}
            hitSlop={8}
            className="py-1 active:opacity-70"
          >
            <Text className="font-sans-semibold text-base text-bronze">
              {isSubmitting ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-16"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label="Shop name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="words"
              placeholder="Renta"
            />
          )}
        />

        <Controller
          control={control}
          name="addressLine"
          render={({ field, fieldState }) => (
            <TextField
              label="Address"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="Glorietta 3, Ayala Center"
              hint="Shown on the store details."
            />
          )}
        />

        <Controller
          control={control}
          name="city"
          render={({ field, fieldState }) => (
            <TextField
              label="City"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="words"
              placeholder="Makati"
            />
          )}
        />

        <Controller
          control={control}
          name="pickupLabel"
          render={({ field, fieldState }) => (
            <TextField
              label="Short pickup label"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="words"
              placeholder="Makati"
              hint="Used inline on a booking, as “Pick up at …”. Keep it to a word or two."
            />
          )}
        />

        <Controller
          control={control}
          name="mapUrl"
          render={({ field, fieldState }) => (
            <TextField
              label="Map link"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://maps.google.com/?q=…"
              hint="Opens the customer's maps app from “Visit store” on Home. Leave empty to hide that action."
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <TextField
              label="Phone"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="phone-pad"
              placeholder="+63 2 8123 4567"
            />
          )}
        />

        <View className="gap-2">
          <Text className="font-sans-medium text-sm text-ink">
            Pickup window
          </Text>
          <Text className="font-sans text-xs text-muted">
            The hours a customer can collect. Shown on an upcoming booking as
            “from 10:00 AM”. 24-hour time; leave both empty to show nothing.
          </Text>
        </View>

        <Controller
          control={control}
          name="pickupFrom"
          render={({ field, fieldState }) => (
            <TextField
              label="Opens"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="none"
              placeholder="10:00"
            />
          )}
        />

        <Controller
          control={control}
          name="pickupTo"
          render={({ field, fieldState }) => (
            <TextField
              label="Closes"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="none"
              placeholder="19:00"
            />
          )}
        />
      </ScrollView>
    </View>
  );
}
