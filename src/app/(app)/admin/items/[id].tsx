import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
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
import { Chip } from '@/components/admin/chip';
import { GRAPE, tintAccent } from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';
import { SegmentedToggle } from '@/components/catalog/segmented-toggle';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { deleteItemPhoto, uploadItemPhoto } from '@/features/admin/api';
import {
  useCreateItem,
  useDeleteItem,
  useUpdateItem,
} from '@/features/admin/hooks';
import {
  GENDERS,
  ICON_OPTIONS,
  itemSchema,
  TINTS,
  UNIT_STATUS_LABELS,
  UNIT_STATUSES,
  type ItemFormInput,
  type ItemFormValues,
} from '@/features/admin/schemas';
import { useCategories, useItem } from '@/features/catalog/hooks';
import { OCCASIONS, type Item, type Tint } from '@/features/catalog/types';

const EMPTY_FORM: ItemFormInput = {
  name: '',
  designer: '',
  category: '',
  gender: 'women',
  pricePerDay: '',
  deposit: '',
  cleaningBufferDays: '0',
  description: '',
  occasion: [],
  swatches: [],
  photos: [],
  icon: '',
  tint: 'lilac',
  isActive: true,
  units: [],
};

function itemToForm(item: Item): ItemFormInput {
  return {
    name: item.name,
    designer: item.designer,
    category: item.category,
    gender: item.gender,
    pricePerDay: String(item.pricePerDay),
    deposit: String(item.deposit),
    cleaningBufferDays: String(item.cleaningBufferDays),
    description: item.description,
    occasion: item.occasion,
    swatches: item.swatches,
    photos: item.photos,
    icon: item.icon,
    tint: item.tint,
    isActive: item.isActive ?? true,
    units: item.units.map((u) => ({
      id: u.id,
      size: u.size ?? '',
      color: u.color ?? '',
      status: u.status,
    })),
  };
}

/** Section wrapper: a labelled block with consistent spacing. */
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

export default function AdminItemForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { back } = useRouter();

  const existing = useItem(isNew ? undefined : id);
  const categories = useCategories();
  const create = useCreateItem();
  const update = useUpdateItem(id);
  const del = useDeleteItem();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<ItemFormInput, unknown, ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: EMPTY_FORM,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'units' });

  // Reactive subscriptions to the two array fields the UI renders directly.
  // `useWatch` (not `watch()`) so the React Compiler can track them safely.
  const photos = useWatch({ control, name: 'photos' });
  const occasion = useWatch({ control, name: 'occasion' });
  const [uploading, setUploading] = useState(false);

  // Seed the form once the existing item has loaded (edit mode).
  useEffect(() => {
    if (existing.data) reset(itemToForm(existing.data));
  }, [existing.data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isNew) await create.mutateAsync(values);
      else await update.mutateAsync(values);
      back();
    } catch (e) {
      Alert.alert(
        'Could not save',
        e instanceof Error ? e.message : 'Please try again.',
      );
    }
  });

  function onDelete() {
    Alert.alert('Delete item', 'This removes the item and its units.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync({ id, photoUrls: photos });
            back();
          } catch (e) {
            Alert.alert(
              'Could not delete',
              e instanceof Error ? e.message : 'Please try again.',
            );
          }
        },
      },
    ]);
  }

  async function onAddPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const asset of result.assets) {
        const url = await uploadItemPhoto(
          asset.uri,
          asset.mimeType ?? 'image/jpeg',
          isNew ? undefined : id,
        );
        uploaded.push(url);
      }
      setValue('photos', [...photos, ...uploaded], { shouldDirty: true });
    } catch (e) {
      Alert.alert(
        'Upload failed',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setUploading(false);
    }
  }

  function onRemovePhoto(url: string) {
    setValue(
      'photos',
      photos.filter((p) => p !== url),
      { shouldDirty: true },
    );
    // Best-effort storage cleanup; ignore failures (the URL is already gone).
    deleteItemPhoto(url).catch(() => {});
  }

  function movePhoto(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= photos.length) return;
    const reordered = [...photos];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setValue('photos', reordered, { shouldDirty: true });
  }

  function toggleOccasion(value: (typeof OCCASIONS)[number]) {
    setValue(
      'occasion',
      occasion.includes(value)
        ? occasion.filter((o) => o !== value)
        : [...occasion, value],
      { shouldDirty: true },
    );
  }

  if (!isNew && existing.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-night-950">
        <ActivityIndicator color={GRAPE} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas dark:bg-night-950">
      <AdminHeader
        title={isNew ? 'New item' : 'Edit item'}
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
        {/* Photos ------------------------------------------------------- */}
        <Field label="Photos">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3"
          >
            {photos.map((url, index) => (
              <View key={url} className="gap-1">
                <View className="h-28 w-24 overflow-hidden rounded-2xl bg-canvas-subtle dark:bg-night-800">
                  <Image
                    source={{ uri: url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
                    onPress={() => onRemovePhoto(url)}
                    hitSlop={6}
                    className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-ink/70"
                  >
                    <Feather name="x" size={14} color="#fff" />
                  </Pressable>
                </View>
                <View className="flex-row justify-between px-1">
                  <Pressable
                    accessibilityLabel="Move left"
                    onPress={() => movePhoto(index, -1)}
                    hitSlop={6}
                  >
                    <Feather name="chevron-left" size={18} color="#6E6A7D" />
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Move right"
                    onPress={() => movePhoto(index, 1)}
                    hitSlop={6}
                  >
                    <Feather name="chevron-right" size={18} color="#6E6A7D" />
                  </Pressable>
                </View>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add photos"
              onPress={onAddPhotos}
              disabled={uploading}
              className="h-28 w-24 items-center justify-center gap-1 rounded-2xl border border-dashed border-grape/40 dark:border-cloud/30"
            >
              {uploading ? (
                <ActivityIndicator color={GRAPE} />
              ) : (
                <>
                  <Feather name="plus" size={22} color={GRAPE} />
                  <Text className="font-sans text-xs text-muted">Add</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </Field>

        {/* Name / designer --------------------------------------------- */}
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
              placeholder="e.g. Ivory Ballgown"
              autoCapitalize="words"
            />
          )}
        />
        <Controller
          control={control}
          name="designer"
          render={({ field, fieldState }) => (
            <TextField
              label="Designer / brand"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="Optional"
              autoCapitalize="words"
            />
          )}
        />

        {/* Category ----------------------------------------------------- */}
        <Controller
          control={control}
          name="category"
          render={({ field, fieldState }) => (
            <Field label="Category">
              <View className="flex-row flex-wrap gap-2">
                {(categories.data ?? []).map((c) => (
                  <Chip
                    key={c.slug}
                    label={c.name}
                    selected={field.value === c.slug}
                    onPress={() => field.onChange(c.slug)}
                  />
                ))}
              </View>
              {fieldState.error ? (
                <Text className="font-sans text-xs text-red-500">
                  {fieldState.error.message}
                </Text>
              ) : null}
            </Field>
          )}
        />

        {/* Gender ------------------------------------------------------- */}
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <Field label="Gender">
              <SegmentedToggle
                options={GENDERS.map((g) => ({
                  label: g === 'women' ? 'Women' : 'Men',
                  value: g,
                }))}
                value={field.value}
                onChange={(v) => field.onChange(v)}
              />
            </Field>
          )}
        />

        {/* Pricing ------------------------------------------------------ */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="pricePerDay"
              render={({ field, fieldState }) => (
                <TextField
                  label="Rate / day (₱)"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  keyboardType="numeric"
                  placeholder="0"
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="deposit"
              render={({ field, fieldState }) => (
                <TextField
                  label="Deposit (₱)"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  keyboardType="numeric"
                  placeholder="0"
                />
              )}
            />
          </View>
        </View>
        <Controller
          control={control}
          name="cleaningBufferDays"
          render={({ field, fieldState }) => (
            <TextField
              label="Cleaning buffer (days)"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              hint="Days blocked after return before re-rental."
              keyboardType="numeric"
              placeholder="0"
            />
          )}
        />

        {/* Description -------------------------------------------------- */}
        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <TextField
              label="Description"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="Fabric, fit, rules…"
              multiline
            />
          )}
        />

        {/* Occasion ----------------------------------------------------- */}
        <Field label="Occasion tags">
          <View className="flex-row flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <Chip
                key={o}
                label={o[0].toUpperCase() + o.slice(1)}
                selected={occasion.includes(o)}
                onPress={() => toggleOccasion(o)}
              />
            ))}
          </View>
        </Field>

        {/* Icon --------------------------------------------------------- */}
        <Controller
          control={control}
          name="icon"
          render={({ field, fieldState }) => (
            <Field label="Icon (shown when no photo)">
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

        {/* Tint --------------------------------------------------------- */}
        <Controller
          control={control}
          name="tint"
          render={({ field }) => (
            <Field label="Card colour">
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

        {/* Active ------------------------------------------------------- */}
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <View className="flex-row items-center justify-between rounded-2xl bg-canvas-subtle px-4 py-3 dark:bg-night-900">
              <View className="flex-1 pr-3">
                <Text className="font-sans-medium text-base text-ink dark:text-cloud">
                  Visible in catalog
                </Text>
                <Text className="font-sans text-xs text-muted">
                  Hidden items stay saved but don&apos;t show to customers.
                </Text>
              </View>
              <Switch
                value={field.value}
                onValueChange={field.onChange}
                trackColor={{ true: GRAPE }}
              />
            </View>
          )}
        />

        {/* Units -------------------------------------------------------- */}
        <Field label="Units (physical copies)">
          <View className="gap-3">
            {fields.map((unitField, index) => (
              <View
                key={unitField.id}
                className="gap-3 rounded-2xl bg-canvas-subtle p-3 dark:bg-night-900"
              >
                <View className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name={`units.${index}.size`}
                      render={({ field }) => (
                        <TextField
                          label="Size"
                          value={field.value}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="e.g. M"
                        />
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name={`units.${index}.color`}
                      render={({ field }) => (
                        <TextField
                          label="Colour"
                          value={field.value}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Optional"
                        />
                      )}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove unit"
                    onPress={() => remove(index)}
                    hitSlop={6}
                    className="mt-6 h-10 w-10 items-center justify-center rounded-full bg-blush dark:bg-night-800"
                  >
                    <Feather name="trash-2" size={18} color="#ED5C9D" />
                  </Pressable>
                </View>

                <Controller
                  control={control}
                  name={`units.${index}.status`}
                  render={({ field }) => (
                    <View className="flex-row flex-wrap gap-2">
                      {UNIT_STATUSES.map((status) => (
                        <Chip
                          key={status}
                          label={UNIT_STATUS_LABELS[status]}
                          selected={field.value === status}
                          onPress={() => field.onChange(status)}
                        />
                      ))}
                    </View>
                  )}
                />
              </View>
            ))}

            <Button
              label="Add unit"
              variant="outline"
              onPress={() =>
                append({ size: '', color: '', status: 'available' })
              }
            />
          </View>
        </Field>

        {/* Delete (edit only) ------------------------------------------ */}
        {!isNew ? (
          <Pressable
            accessibilityRole="button"
            onPress={onDelete}
            className="items-center py-2 active:opacity-70"
          >
            <Text className="font-sans-semibold text-base text-red-500">
              Delete item
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
