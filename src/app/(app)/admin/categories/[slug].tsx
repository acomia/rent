import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
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
import { GRAPE, tintAccent } from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';
import { TextField } from '@/components/ui/text-field';
import { useAdminCategories, useSaveCategory } from '@/features/admin/hooks';
import {
  categorySchema,
  ICON_OPTIONS,
  TINTS,
  type CategoryFormInput,
  type CategoryFormValues,
} from '@/features/admin/schemas';
import type { Tint } from '@/features/catalog/types';

const EMPTY_FORM: CategoryFormInput = {
  slug: '',
  name: '',
  icon: '',
  tint: 'lilac',
  sortOrder: '0',
};

/** Labelled block, matching the item form's field spacing. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="font-sans-medium text-sm text-ink dark:text-cloud">
        {label}
      </Text>
      {children}
    </View>
  );
}

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
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-night-950">
        <ActivityIndicator color={GRAPE} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas dark:bg-night-950">
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
            <Text className="font-sans-semibold text-base text-grape dark:text-grape-soft">
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
            <Field label="Icon">
              <View className="flex-row flex-wrap gap-2">
                {ICON_OPTIONS.map((glyph) => {
                  const selected = field.value === glyph;
                  return (
                    <Pressable
                      key={glyph}
                      accessibilityRole="button"
                      accessibilityLabel={glyph}
                      accessibilityState={{ selected }}
                      onPress={() => field.onChange(glyph)}
                      className={`h-12 w-12 items-center justify-center rounded-2xl ${
                        selected
                          ? 'bg-grape dark:bg-grape-soft'
                          : 'bg-canvas-subtle dark:bg-night-800'
                      }`}
                    >
                      <Glyph
                        name={glyph}
                        size={22}
                        color={selected ? '#fff' : '#6E6A7D'}
                      />
                    </Pressable>
                  );
                })}
              </View>
              {fieldState.error ? (
                <Text className="font-sans text-xs text-red-500">
                  {fieldState.error.message}
                </Text>
              ) : null}
            </Field>
          )}
        />

        <Controller
          control={control}
          name="tint"
          render={({ field }) => (
            <Field label="Colour">
              <View className="flex-row gap-3">
                {TINTS.map((tint) => {
                  const selected = field.value === tint;
                  return (
                    <Pressable
                      key={tint}
                      accessibilityRole="button"
                      accessibilityLabel={tint}
                      accessibilityState={{ selected }}
                      onPress={() => field.onChange(tint)}
                      className={`h-11 w-11 items-center justify-center rounded-full ${
                        selected ? 'border-2 border-grape' : ''
                      }`}
                      style={{ backgroundColor: tintAccent[tint as Tint] }}
                    >
                      {selected ? (
                        <Feather name="check" size={18} color="#fff" />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </Field>
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
