import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GRAPE, INK, tintClass } from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';
import { CatalogError } from '@/components/catalog/states';
import { Button } from '@/components/ui/button';
import { useCart } from '@/features/catalog/cart-context';
import { useItem } from '@/features/catalog/hooks';
import { formatPeso, type Item } from '@/features/catalog/types';

const HERO_HEIGHT = 380;

export default function ProductDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { add, has } = useCart();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, isLoading, isError, refetch } = useItem(id);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-night-950">
        <ActivityIndicator color={GRAPE} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 justify-center bg-canvas px-6 dark:bg-night-950">
        <CatalogError onRetry={refetch} />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-6 dark:bg-night-950">
        <Text className="font-sans-semibold text-lg text-ink dark:text-cloud">
          Item not found
        </Text>
        <Pressable onPress={() => router.back()} className="mt-3">
          <Text className="font-sans-medium text-grape dark:text-grape-soft">
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  const added = has(product.id);

  function reserve() {
    add(product!.id);
    Alert.alert(
      'Added to your bag',
      `${product!.name} — ${formatPeso(product!.pricePerDay)} / day. Checkout arrives in the next phase.`,
    );
  }

  return (
    <View className="flex-1 bg-canvas dark:bg-night-950">
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
          <Text className="font-sans-medium text-sm text-muted">
            {product.designer}
          </Text>
          <Text className="font-sans-extrabold text-3xl text-ink dark:text-cloud">
            {product.name}
          </Text>
        </View>

        {product.swatches.length > 0 ? (
          <View className="flex-row items-center gap-3">
            <Text className="font-sans-medium text-sm text-ink dark:text-cloud">
              Colors
            </Text>
            <View className="flex-row gap-2">
              {product.swatches.map((hex) => (
                <View
                  key={hex}
                  className="h-6 w-6 rounded-full border border-black/10 dark:border-white/15"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View className="gap-2">
          <Text className="font-sans-medium text-sm text-ink dark:text-cloud">
            {product.sizes.length > 0 ? 'Available sizes' : 'Size'}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {product.sizes.length > 0 ? (
              product.sizes.map((size) => (
                <View
                  key={size}
                  className="rounded-full bg-canvas-subtle px-4 py-2 dark:bg-night-800"
                >
                  <Text className="font-sans-semibold text-sm text-ink dark:text-cloud">
                    {size}
                  </Text>
                </View>
              ))
            ) : (
              <View className="rounded-full bg-canvas-subtle px-4 py-2 dark:bg-night-800">
                <Text className="font-sans-semibold text-sm text-ink dark:text-cloud">
                  One size
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-2 rounded-2xl bg-lilac px-4 py-3 dark:bg-night-800">
          <Feather name="shield" size={16} color={GRAPE} />
          <Text className="font-sans-medium text-sm text-ink dark:text-cloud">
            {formatPeso(product.deposit)} refundable deposit
          </Text>
        </View>

        <Text className="font-sans text-[15px] leading-6 text-muted">
          {product.description}
        </Text>
      </ScrollView>

      <View
        className="flex-row items-center gap-4 border-t border-black/5 px-6 pt-4 dark:border-white/10"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View>
          <Text className="font-sans-bold text-2xl text-ink dark:text-cloud">
            {formatPeso(product.pricePerDay)}
          </Text>
          <Text className="font-sans-medium text-xs text-muted">per day</Text>
        </View>
        <View className="flex-1">
          <Button
            label={added ? 'In your bag' : 'Reserve'}
            variant={added ? 'secondary' : 'primary'}
            disabled={added}
            onPress={added ? undefined : reserve}
          />
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
            className={`h-2 rounded-full ${i === page ? 'w-6 bg-grape' : 'w-2 bg-ink/20'}`}
          />
        ))}
      </View>
    </View>
  );
}
