import { Pressable, Text } from 'react-native';

/**
 * A selectable pill used across the admin forms for single- and multi-select
 * choices (occasion tags, tint, icon, unit status). Charcoal fill when selected,
 * hairline chip otherwise — the same language as the catalog filter pills.
 */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full px-4 py-2 active:opacity-80 ${
        selected ? 'bg-charcoal' : 'border border-hairline bg-surface'
      }`}
    >
      <Text
        className={`text-sm ${
          selected
            ? 'font-sans-semibold text-white'
            : 'font-sans-medium text-ink'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
