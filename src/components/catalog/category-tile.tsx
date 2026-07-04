import { Pressable, Text, View, useColorScheme } from 'react-native';

import type { Category } from '@/features/catalog/mock-data';
import { CLOUD, INK, tintAccent, tintClass } from './catalog-style';
import { Glyph } from './glyph';

/**
 * Pastel category tile: oversized line icon over a name and item count. In dark
 * mode the pastel fill drops to a night surface and the icon takes the tint's
 * accent color so each category still reads distinctly.
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
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const iconColor = dark ? tintAccent[category.tint] : INK;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${count} items`}
      onPress={onPress}
      className={`min-h-[150px] flex-1 justify-between rounded-3xl p-5 active:opacity-90 dark:bg-night-800 ${tintClass[category.tint]}`}
    >
      <Glyph name={category.icon} size={40} color={iconColor} />
      <View>
        <Text
          className="font-sans-bold text-lg text-ink"
          style={dark ? { color: CLOUD } : undefined}
        >
          {category.name}
        </Text>
        <Text
          className="font-sans-medium text-sm text-ink/60"
          style={dark ? { color: '#8A8698' } : undefined}
        >
          {count} items
        </Text>
      </View>
    </Pressable>
  );
}
