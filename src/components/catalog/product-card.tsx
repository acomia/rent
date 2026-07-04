import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View, useColorScheme } from 'react-native';

import { formatPeso, type Item } from '@/features/catalog/mock-data';
import { CLOUD, INK, tintAccent, tintClass } from './catalog-style';
import { Glyph } from './glyph';

/**
 * Grid product card: a pastel image panel with the item glyph, then name,
 * designer, per-day price, and an add-to-bag button. `added` swaps the plus for
 * a check so the cart state reads at a glance.
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
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={onPress}
      className="flex-1 gap-3 active:opacity-90"
    >
      <View
        className={`aspect-[3/4] items-center justify-center overflow-hidden rounded-3xl dark:bg-night-800 ${tintClass[product.tint]}`}
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
          <Glyph
            name={product.icon}
            size={64}
            color={dark ? tintAccent[product.tint] : INK}
          />
        )}
      </View>

      <View className="gap-0.5 px-1">
        <Text
          numberOfLines={1}
          className="font-sans-semibold text-base text-ink dark:text-cloud"
        >
          {product.name}
        </Text>
        <Text numberOfLines={1} className="font-sans text-xs text-muted">
          {product.designer}
        </Text>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="font-sans-bold text-base text-grape dark:text-grape-soft">
            {formatPeso(product.pricePerDay)}
            <Text className="font-sans-medium text-xs text-muted"> / day</Text>
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={added ? 'In your bag' : `Add ${product.name}`}
            onPress={onAdd}
            hitSlop={8}
            className={`h-9 w-9 items-center justify-center rounded-full active:opacity-80 ${
              added ? 'bg-grape dark:bg-grape-soft' : 'bg-bubblegum'
            }`}
          >
            <Feather
              name={added ? 'check' : 'plus'}
              size={18}
              color={dark && added ? INK : CLOUD}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
