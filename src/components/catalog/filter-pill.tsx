import { Feather } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';

import { INK, MUTED } from './catalog-style';

type FeatherName = keyof typeof Feather.glyphMap;

/**
 * Filter chip in its two states: a hairline chip at rest, and an ink-filled chip
 * when selected. Selection is carried by fill and weight, not colour alone.
 */
export function FilterPill({
  label,
  icon,
  chevron,
  active = false,
  onPress,
}: {
  label: string;
  icon?: FeatherName;
  chevron?: boolean;
  active?: boolean;
  onPress?: () => void;
}) {
  const fg = active ? '#FFFFFF' : INK;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`h-10 flex-row items-center gap-2 rounded-full px-4 active:opacity-80 ${
        active ? 'bg-charcoal' : 'border-hairline bg-surface'
      }`}
    >
      {icon ? <Feather name={icon} size={15} color={fg} /> : null}
      <Text
        className={`text-sm ${active ? 'font-sans-semibold' : 'font-sans-medium'}`}
        style={{ color: fg }}
      >
        {label}
      </Text>
      {chevron ? (
        <Feather
          name="chevron-down"
          size={15}
          color={active ? '#FFFFFF' : MUTED}
        />
      ) : null}
    </Pressable>
  );
}
