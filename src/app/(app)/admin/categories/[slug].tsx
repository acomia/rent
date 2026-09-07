import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { IconPicker } from '@/components/admin/icon-picker';
import { TintPicker } from '@/components/admin/tint-picker';
import { BRONZE } from '@/components/catalog/catalog-style';
import { TextField } from '@/components/ui/text-field';
import { useAdminCategories, useSaveCategory } from '@/features/admin/hooks';
import {
  categorySchema,
  type CategoryFormInput,
  type CategoryFormValues,
} from '@/features/admin/schemas';

const EMPTY_FORM: CategoryFormInput = {
  slug: '',
  name: '',
  icon: '',
  tint: 'lilac',
  sortOrder: '0',
};

export default function AdminCategoryForm() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const isNew = slug === 'new';
  const { back } = useRouter();

  const categories = useAdminCategories();
  const save = useSaveCategory(isNew ? 'create' : 'edit');
  const existing = isNew
    ? undefined
    : categories.data?.find((c) => c.slug === slug);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CategoryFormInput, unknown, CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (existing) {
      reset({
        slug: existing.slug,
        name: existing.name,
        icon: existing.icon,
        tint: existing.tint,
        sortOrder: String(existing.sortOrder),
      });
    }
  }, [existing, reset]);

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

  // Edit mode but the category list hasn't loaded yet.
  if (!isNew && categories.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={BRONZE} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <AdminHeader
        title={isNew ? 'New category' : 'Edit category'}
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
          name="slug"
          render={({ field, fieldState }) => (
            <TextField
              label="Slug"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              editable={isNew}
              autoCapitalize="none"
              placeholder="e.g. gowns"
              hint={
                isNew
                  ? 'Lowercase id used in links; cannot be changed later.'
                  : 'The slug cannot be changed after creation.'
              }
            />
          )}
        />
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label="Name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="words"
              placeholder="e.g. Gowns"
            />
          )}
        />

        <Controller
          control={control}
          name="icon"
          render={({ field, fieldState }) => (
            <IconPicker
              label="Icon"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="tint"
          render={({ field }) => (
            <TintPicker
              label="Colour"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="sortOrder"
          render={({ field, fieldState }) => (
            <TextField
              label="Sort order"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="numeric"
              hint="Lower numbers appear first."
              placeholder="0"
            />
          )}
        />
      </ScrollView>
    </View>
  );
}
