import { Feather } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';

import { AdminHeader } from '@/components/admin/admin-header';
import { BRONZE, MUTED } from '@/components/catalog/catalog-style';
import { TextField } from '@/components/ui/text-field';
import { useAdminItems } from '@/features/admin/hooks';
import { useAdminSlides, useSaveSlide } from '@/features/admin/home-hooks';
import {
  slideSchema,
  type SlideFormInput,
  type SlideFormValues,
} from '@/features/admin/schemas';

/**
 * Hero slide editor.
 *
 * The image is chosen from photos already on catalog items rather than
 * uploaded. That is what `0016`'s seed does and why — "slides borrow photos
 * from real stock so the imagery stays consistent with the catalog" — and it
 * keeps this screen free of a storage bucket, an upload path and a migration.
 * A slide advertising a gown the shop does not stock is not a case worth
 * building for.
 */

const EMPTY_FORM: SlideFormInput = {
  headline: '',
  subhead: '',
  ctaLabel: '',
  ctaRoute: '',
  imageUrl: '',
  sortOrder: '0',
  isActive: true,
};

export default function AdminSlideForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { back } = useRouter();

  const slides = useAdminSlides();
  const items = useAdminItems();
  const save = useSaveSlide(isNew ? 'create' : 'edit', id);
  const existing = isNew ? undefined : slides.data?.find((s) => s.id === id);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<SlideFormInput, unknown, SlideFormValues>({
    resolver: zodResolver(slideSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!existing) return;
    reset({
      headline: existing.headline,
      subhead: existing.subhead ?? '',
      ctaLabel: existing.ctaLabel ?? '',
      ctaRoute: existing.ctaRoute ?? '',
      imageUrl: existing.imageUrl ?? '',
      sortOrder: String(existing.sortOrder),
      isActive: existing.isActive,
    });
  }, [existing, reset]);

  // A new slide goes to the back of the carousel by default, so adding one
  // never silently displaces whatever the shop put first.
  useEffect(() => {
    if (!isNew || !slides.data) return;
    const next = slides.data.reduce((m, s) => Math.max(m, s.sortOrder), 0) + 1;
    setValue('sortOrder', String(next));
  }, [isNew, slides.data, setValue]);

  const photos = useMemo(
    () => [...new Set((items.data ?? []).flatMap((i) => i.photos))],
    [items.data],
  );
  // `useWatch`, not `watch()`: the latter returns a fresh function the React
  // Compiler cannot memoize, so it bails out of optimising the screen.
  const selectedImage = useWatch({ control, name: 'imageUrl' });

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

  if (!isNew && slides.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={BRONZE} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <AdminHeader
        title={isNew ? 'New slide' : 'Edit slide'}
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
          name="headline"
          render={({ field, fieldState }) => (
            <TextField
              label="Headline"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="Wear more moments"
              hint="Set large in the serif over the photo. A few words."
            />
          )}
        />

        <Controller
          control={control}
          name="subhead"
          render={({ field, fieldState }) => (
            <TextField
              label="Subhead"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="Gowns and costumes for life's special days"
            />
          )}
        />

        <Controller
          control={control}
          name="ctaLabel"
          render={({ field, fieldState }) => (
            <TextField
              label="Button label"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="Explore looks"
              hint="Leave empty for a slide with no button."
            />
          )}
        />

        <Controller
          control={control}
          name="ctaRoute"
          render={({ field, fieldState }) => (
            <TextField
              label="Button goes to"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="none"
              placeholder="/categories"
              hint="An in-app path, not a web link — e.g. /categories or /search."
            />
          )}
        />

        {/* Image ---------------------------------------------------------- */}
        <View className="gap-2">
          <Text className="font-sans-medium text-sm text-ink">Photo</Text>
          <Text className="font-sans text-xs text-muted">
            Pick from photos already on your items. A slide with no photo still
            shows its headline on the ivory ground.
          </Text>

          {items.isLoading ? (
            <ActivityIndicator color={BRONZE} />
          ) : photos.length === 0 ? (
            <Text className="font-sans text-sm text-muted">
              No item photos yet — add photos to an item first.
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {selectedImage ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  onPress={() => setValue('imageUrl', '')}
                  className="h-[92px] w-[68px] items-center justify-center rounded-xl border-hairline bg-canvas-subtle active:opacity-70"
                >
                  <Feather name="x" size={18} color={MUTED} />
                  <Text className="font-sans text-[10px] text-muted">None</Text>
                </Pressable>
              ) : null}
              {photos.map((url) => {
                const selected = selectedImage === url;
                return (
                  <Pressable
                    key={url}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel="Use this photo"
                    onPress={() => setValue('imageUrl', url)}
                    className={`overflow-hidden rounded-xl active:opacity-80 ${
                      selected ? 'border-2 border-charcoal' : 'border-hairline'
                    }`}
                  >
                    <Image
                      source={{ uri: url }}
                      style={{ width: 68, height: 92 }}
                      contentFit="cover"
                      transition={150}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Controller
          control={control}
          name="sortOrder"
          render={({ field, fieldState }) => (
            <TextField
              label="Order"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="numeric"
              hint="Lower numbers show first. The list screen's arrows change this too."
            />
          )}
        />

        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <View className="flex-row items-center justify-between rounded-2xl bg-canvas-subtle px-4 py-3">
              <View className="flex-1 pr-3">
                <Text className="font-sans-medium text-base text-ink">
                  Show on Home
                </Text>
                <Text className="font-sans text-xs text-muted">
                  Switched off, the slide stays saved but customers never see
                  it.
                </Text>
              </View>
              <Switch
                value={field.value}
                onValueChange={field.onChange}
                trackColor={{ true: BRONZE }}
              />
            </View>
          )}
        />
      </ScrollView>
    </View>
  );
}
