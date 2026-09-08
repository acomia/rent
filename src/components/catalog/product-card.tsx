import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { formatPeso, type Item } from '@/features/catalog/mock-data';
import { MUTED, tintClass } from './catalog-style';
import { Glyph } from './glyph';

/**
 * Grid product card: a tall photo panel, then the item name and its per-day
 * rate. The photograph is the only colour on the card — the panel behind it is
 * neutral and only shows when there is no photo yet.
 *
 * No corner action. The design board shows a heart, but a wishlist is v2
 * (project-scope.md), and an affordance that saves nothing is worse than none.
 * Tapping the card opens the item; dates are chosen there.
 */
export function ProductCard({
  product,
  onPress,
}: {
  product: Item;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={onPress}
      className="flex-1 gap-3 active:opacity-90"
    >
      <View
        className={`aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl ${tintClass[product.tint]}`}
      >
        {product.photos[0] ? (
          <Image
            source={{ uri: product.photos[0] }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
            accessibilityLabel={product.name}
          />
        ) : (
          <Glyph name={product.icon} size={56} color={MUTED} />
        )}
      </View>

      <View className="gap-1 px-0.5">
        <Text
          numberOfLines={1}
          className="font-display-semibold text-base text-ink"
        >
          {product.name}
        </Text>
        <Text className="font-sans-medium text-sm text-ink">
          {formatPeso(product.pricePerDay)}
          <Text className="font-sans text-xs text-muted"> / day</Text>
        </Text>
      </View>
    </Pressable>
  );
}
