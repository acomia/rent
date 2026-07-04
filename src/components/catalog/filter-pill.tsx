import { Feather } from '@expo/vector-icons';
import { Pressable, Text, useColorScheme } from 'react-native';

import { CLOUD, INK } from './catalog-style';

type FeatherName = keyof typeof Feather.glyphMap;

/**
 * Rounded filter pill for the listing header. `active` fills it with grape; an
 * optional leading icon or trailing chevron matches the two pill styles in the
 * reference (a solid "Price" filter and an outlined "Rent" dropdown).
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
  const dark = useColorScheme() === 'dark';
  const fg = active ? CLOUD : dark ? CLOUD : INK;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`h-12 flex-row items-center gap-2 rounded-full px-5 active:opacity-80 ${
        active
          ? 'bg-grape dark:bg-grape-soft'
          : 'bg-canvas-subtle dark:bg-night-800'
      }`}
    >
      {icon ? <Feather name={icon} size={16} color={fg} /> : null}
      <Text className="font-sans-semibold text-sm" style={{ color: fg }}>
        {label}
      </Text>
      {chevron ? <Feather name="chevron-down" size={16} color={fg} /> : null}
    </Pressable>
  );
}
