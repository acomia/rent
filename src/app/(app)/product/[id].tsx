import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BRONZE,
  INK,
  MUTED,
  tintClass,
} from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';
import { SimilarItems } from '@/components/catalog/similar-items';
import { CatalogError } from '@/components/catalog/states';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/features/booking/booking-context';
import { useItem } from '@/features/catalog/hooks';
import { formatPeso, type Item } from '@/features/catalog/types';

const HERO_HEIGHT = 380;

export default function ProductDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { startDraft } = useBooking();
  // Optional: null means "any copy". A chosen size narrows both the
  // availability calendar and which physical unit the shop assigns, so it has
  // to reach the draft rather than only tint a chip.
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, isLoading, isError, refetch } = useItem(id);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={BRONZE} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 justify-center bg-canvas px-6">
        <CatalogError onRetry={refetch} />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <Text className="font-sans-semibold text-lg text-ink">
          Item not found
        </Text>
        <Pressable onPress={() => router.back()} className="mt-3">
          <Text className="font-sans-medium text-bronze">Go back</Text>
        </Pressable>
      </View>
    );
  }

  function checkDates() {
    startDraft({
      id: product!.id,
      name: product!.name,
      photo: product!.photos[0] ?? null,
      pricePerDay: product!.pricePerDay,
      deposit: product!.deposit,
      cleaningBufferDays: product!.cleaningBufferDays,
      size: selectedSize,
    });
    router.push('/(app)/reserve/dates');
  }

  return (
    <View className="flex-1 bg-canvas">
      <Hero
        product={product}
        insetTop={insets.top}
        onBack={() => router.back()}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <Text className="font-sans-medium text-[11px] uppercase tracking-[2px] text-muted">
            {product.designer}
          </Text>
          <Text className="font-display-bold text-3xl text-ink">
            {product.name}
          </Text>
        </View>

        {product.swatches.length > 0 ? (
          <View className="flex-row items-center gap-3">
            <Text className="font-sans-medium text-sm text-ink">Colors</Text>
            <View className="flex-row gap-2">
              {product.swatches.map((hex) => (
                <View
                  key={hex}
                  className="h-6 w-6 rounded-full border border-black/10"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View className="gap-2">
          <Text className="font-sans-medium text-sm text-ink">
            {product.sizes.length > 0 ? 'Sizes' : 'Size'}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {product.sizes.length > 0 ? (
              product.sizes.map((size) => {
                const selected = selectedSize === size;
                return (
                  <Pressable
                    key={size}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Size ${size}`}
                    // Tapping the chosen size again clears it, which is how a
                    // customer gets back to "any size" — the calendar then
                    // shows every copy of the design again.
                    onPress={() => setSelectedSize(selected ? null : size)}
                    className={`h-10 min-w-10 items-center justify-center rounded-full px-4 active:opacity-80 ${
                      selected ? 'bg-charcoal' : 'border-hairline bg-surface'
                    }`}
                  >
                    <Text
                      className={`font-sans-semibold text-sm ${
                        selected ? 'text-white' : 'text-ink'
                      }`}
                    >
                      {size}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <View className="h-10 items-center justify-center rounded-full border-hairline bg-surface px-4">
                <Text className="font-sans-semibold text-sm text-ink">
                  One size
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-2 rounded-2xl bg-canvas-subtle px-4 py-3">
          <Feather name="shield" size={16} color={BRONZE} />
          <Text className="font-sans-medium text-sm text-ink">
            {formatPeso(product.deposit)} refundable deposit
          </Text>
        </View>

        <Text className="font-sans text-[15px] leading-6 text-muted">
          {product.description}
        </Text>

        {/*
          Shop promises, not item data — the same for every piece, so they are
          stated here rather than stored per item. If any of these stops being
          true for some items, it becomes a column.
        */}
        <View className="gap-3 border-t-hairline pt-5">
          {[
            { icon: 'award' as const, label: 'Designer inspired' },
            { icon: 'check-circle' as const, label: 'Premium quality' },
            { icon: 'droplet' as const, label: 'Dry cleaning included' },
            {
              icon: 'scissors' as const,
              label: 'Free alterations (selected sizes)',
            },
          ].map((f) => (
            <View key={f.label} className="flex-row items-center gap-3">
              <Feather name={f.icon} size={16} color={MUTED} />
              <Text className="font-sans text-sm text-ink">{f.label}</Text>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(app)/size-guide')}
          className="flex-row items-center gap-3 rounded-2xl border-hairline bg-surface p-4 active:opacity-80"
        >
          <Feather name="maximize-2" size={17} color={INK} />
          <View className="flex-1">
            <Text className="font-sans-medium text-base text-ink">
              Size guide
            </Text>
            <Text className="font-sans text-xs text-muted">
              Measurements, and how alterations work
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={MUTED} />
        </Pressable>

        <SimilarItems item={product} />
      </ScrollView>

      <View
        className="flex-row items-center gap-4 border-t-hairline bg-canvas px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="gap-0.5">
          <Text className="font-sans-semibold text-base text-ink">
            {formatPeso(product.pricePerDay)}
            <Text className="font-sans text-xs text-muted"> / day</Text>
          </Text>
          <Text className="font-sans text-xs text-muted">
            + {formatPeso(product.deposit)} deposit
          </Text>
        </View>
        <View className="flex-1">
          <Button label="Check dates" variant="commit" onPress={checkDates} />
        </View>
      </View>
    </View>
  );
}

/**
 * Pastel hero. Shows a swipeable photo carousel when the item has photos;
 * otherwise the on-brand glyph placeholder (v1 — real photos land in Phase 3).
 */
function Hero({
  product,
  insetTop,
  onBack,
}: {
  product: Item;
  insetTop: number;
  onBack: () => void;
}) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const hasPhotos = product.photos.length > 0;
  const dotCount = hasPhotos ? product.photos.length : 4;

  return (
    <View style={{ height: HERO_HEIGHT }}>
      {hasPhotos ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setPage(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          className="rounded-b-[40px]"
        >
          {product.photos.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={{ width, height: HERO_HEIGHT }}
              contentFit="cover"
              transition={200}
            />
          ))}
        </ScrollView>
      ) : (
        <View
          className={`flex-1 items-center justify-center rounded-b-[40px] ${tintClass[product.tint]}`}
          style={{ paddingTop: insetTop + 8 }}
        >
          <Glyph name={product.icon} size={140} color={INK} />
        </View>
      )}

      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-6"
        style={{ top: insetTop + 8 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/70 active:opacity-70"
        >
          <Feather name="chevron-left" size={22} color={INK} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save"
          className="h-11 w-11 items-center justify-center rounded-full bg-white/70 active:opacity-70"
        >
          <Feather name="heart" size={20} color={INK} />
        </Pressable>
      </View>

      <View className="absolute bottom-6 left-0 right-0 flex-row justify-center gap-2">
        {Array.from({ length: dotCount }).map((_, i) => (
          <View
            key={i}
            className={`h-2 rounded-full ${i === page ? 'w-6 bg-bronze' : 'w-2 bg-ink/20'}`}
          />
        ))}
      </View>
    </View>
  );
}
