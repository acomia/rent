import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AdminHeader } from '@/components/admin/admin-header';
import { BRONZE, INK, MUTED } from '@/components/catalog/catalog-style';
import { CatalogError } from '@/components/catalog/states';
import {
  useAdminSlides,
  useDeleteSlide,
  useSwapSlideOrder,
} from '@/features/admin/home-hooks';
import type { AdminHomeSlide } from '@/features/admin/home-api';

/**
 * Hero slides — the carousel at the top of Home.
 *
 * Ordering is `sort_order`, moved with up/down rather than a drag gesture: a
 * shop has a handful of slides, and a gesture dependency for one admin screen
 * is not worth it.
 */

function OrderButton({
  icon,
  disabled,
  onPress,
  label,
}: {
  icon: 'chevron-up' | 'chevron-down';
  disabled: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      className={`h-8 w-8 items-center justify-center rounded-full border-hairline bg-surface ${
        disabled ? 'opacity-30' : 'active:opacity-70'
      }`}
    >
      <Feather name={icon} size={15} color={INK} />
    </Pressable>
  );
}

export default function AdminSlides() {
  const { back, push } = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useAdminSlides();
  const del = useDeleteSlide();
  const swap = useSwapSlideOrder();
  const slides = data ?? [];

  function onDelete(slide: AdminHomeSlide) {
    Alert.alert('Delete slide', `Delete “${slide.headline}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync(slide.id);
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

  async function move(index: number, delta: -1 | 1) {
    const a = slides[index];
    const b = slides[index + delta];
    if (!a || !b) return;
    try {
      await swap.mutateAsync({
        a: { id: a.id, sortOrder: a.sortOrder },
        b: { id: b.id, sortOrder: b.sortOrder },
      });
    } catch (e) {
      Alert.alert(
        'Could not reorder',
        e instanceof Error ? e.message : 'Please try again.',
      );
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={BRONZE} />
      </View>
    );
  }

  const activeCount = slides.filter((s) => s.isActive).length;

  return (
    <View className="flex-1 bg-canvas">
      <AdminHeader
        title="Hero slides"
        onBack={() => back()}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add slide"
            onPress={() => push('/admin/slides/new')}
            hitSlop={8}
            className="py-1 active:opacity-70"
          >
            <Feather name="plus" size={22} color={BRONZE} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerClassName="gap-3 px-5 pb-16"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={BRONZE}
          />
        }
      >
        {isError ? <CatalogError onRetry={() => refetch()} /> : null}

        {/*
          An empty or all-inactive list is not a neutral state: Home falls back
          to rendering no hero at all, silently. Say so here, because nothing
          else in the app will.
        */}
        {!isError && slides.length === 0 ? (
          <View className="items-center gap-3 py-16">
            <View className="h-14 w-14 items-center justify-center rounded-full border-hairline bg-canvas-subtle">
              <Feather name="image" size={22} color={MUTED} />
            </View>
            <Text className="px-8 text-center font-sans text-base text-muted">
              No slides yet. Home shows no hero at all until you add one.
            </Text>
          </View>
        ) : null}

        {!isError && slides.length > 0 && activeCount === 0 ? (
          <View className="rounded-2xl bg-pending-soft p-4">
            <Text className="font-sans text-sm text-pending">
              Every slide is switched off, so Home is showing no hero.
            </Text>
          </View>
        ) : null}

        {slides.map((slide, i) => (
          <View
            key={slide.id}
            className="flex-row items-center gap-3 rounded-2xl border-hairline bg-surface p-3"
          >
            {slide.imageUrl ? (
              <Image
                source={{ uri: slide.imageUrl }}
                style={{ width: 56, height: 72, borderRadius: 12 }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View className="h-[72px] w-14 items-center justify-center rounded-xl bg-canvas-subtle">
                <Feather name="image" size={18} color={MUTED} />
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => push(`/admin/slides/${slide.id}`)}
              className="flex-1 gap-1 active:opacity-70"
            >
              <Text
                numberOfLines={1}
                className="font-sans-semibold text-base text-ink"
              >
                {slide.headline}
              </Text>
              {slide.subhead ? (
                <Text
                  numberOfLines={1}
                  className="font-sans text-xs text-muted"
                >
                  {slide.subhead}
                </Text>
              ) : null}
              <Text className="font-sans text-xs text-muted">
                {slide.isActive ? 'Live' : 'Off'} · order {slide.sortOrder}
              </Text>
            </Pressable>

            <View className="gap-1.5">
              <OrderButton
                icon="chevron-up"
                label="Move up"
                disabled={i === 0 || swap.isPending}
                onPress={() => move(i, -1)}
              />
              <OrderButton
                icon="chevron-down"
                label="Move down"
                disabled={i === slides.length - 1 || swap.isPending}
                onPress={() => move(i, 1)}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${slide.headline}`}
              onPress={() => onDelete(slide)}
              hitSlop={6}
              className="h-8 w-8 items-center justify-center active:opacity-70"
            >
              <Feather name="trash-2" size={16} color={MUTED} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
