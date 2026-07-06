import { Pressable, Text } from 'react-native';

/**
 * A selectable pill used across the admin forms for single- and multi-select
 * choices (occasion tags, tint, icon, unit status). Grape fill when selected,
 * subtle surface otherwise — the same visual language as the catalog filter pills.
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
        selected
          ? 'bg-grape dark:bg-grape-soft'
          : 'bg-canvas-subtle dark:bg-night-800'
      }`}
    >
      <Text
        className={`font-sans-medium text-sm ${
          selected ? 'text-white' : 'text-ink dark:text-cloud'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
