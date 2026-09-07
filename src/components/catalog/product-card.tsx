import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { formatPeso, type Item } from '@/features/catalog/mock-data';
import { INK, MUTED, tintClass } from './catalog-style';
import { Glyph } from './glyph';

/**
 * Grid product card: a tall photo panel with a save affordance in the corner,
 * then the item name and its per-day rate. The photograph is the only colour on
 * the card — the panel behind it is neutral and only shows when there is no
 * photo yet.
 */
export function ProductCard({
  product,
  added,
  onPress,
  onAdd,
}: {
  product: Item;
  added: boolean;
  onPress?: () => void;
  onAdd?: () => void;
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={added ? 'In your bag' : `Add ${product.name}`}
          onPress={onAdd}
          hitSlop={8}
          className="absolute right-2.5 top-2.5 h-9 w-9 items-center justify-center rounded-full bg-surface/90 active:opacity-80"
        >
          <Feather
            name={added ? 'check' : 'heart'}
            size={17}
            color={added ? '#1F7A45' : INK}
          />
        </Pressable>
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
