import { Pressable, Text, View } from 'react-native';

import type { Category } from '@/features/catalog/mock-data';
import { MUTED } from './catalog-style';
import { Glyph } from './glyph';

/**
 * Category tile: a tall neutral panel carrying the category glyph, with the name
 * and item count set beneath it on the ivory ground. No decorative fill — in
 * this design the photography is the only colour, so the panel stays quiet.
 */
export function CategoryTile({
  category,
  count,
  onPress,
}: {
  category: Category;
  count: number;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${count} items`}
      onPress={onPress}
      className="flex-1 gap-3 active:opacity-90"
    >
      <View className="aspect-[4/3] items-center justify-center rounded-2xl border-hairline bg-canvas-subtle">
        <Glyph name={category.icon} size={38} color={MUTED} />
      </View>
      <View className="gap-0.5 px-0.5">
        <Text className="font-sans-semibold text-base text-ink">
          {category.name}
        </Text>
        <Text className="font-sans text-xs text-muted">{count} items</Text>
      </View>
    </Pressable>
  );
}
