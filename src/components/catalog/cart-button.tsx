import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { useCart } from '@/features/catalog/cart-context';
import { INK } from './catalog-style';

/**
 * Top-bar shopping bag with a live count badge. Purely presentational for the
 * restyle — checkout lands in Phase 5 — so it takes an optional `onPress`.
 */
export function CartButton({ onPress }: { onPress?: () => void }) {
  const { count } = useCart();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Bag, ${count} item${count === 1 ? '' : 's'}`}
      onPress={onPress}
      className="active:opacity-70"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full border border-hairline bg-surface">
        <Feather name="shopping-bag" size={19} color={INK} />
      </View>
      {count > 0 ? (
        <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-bronze px-1">
          <Text className="font-sans-bold text-[11px] leading-none text-white">
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
