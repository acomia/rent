import { Pressable, Text, View } from 'react-native';

import { BRONZE } from '@/components/catalog/catalog-style';

/**
 * A radio-style option card: title, one line of explanation, and a filled ring
 * when chosen. Used for the fulfilment choice, where the second option has to
 * say plainly that it does not reserve the dates.
 */
export function SelectionCard({
  title,
  description,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-row items-start gap-3 rounded-2xl border p-4 active:opacity-90 ${
        selected
          ? 'border-bronze bg-bronze-soft/40'
          : 'border-hairline bg-surface'
      }`}
    >
      <View
        className="mt-0.5 h-5 w-5 items-center justify-center rounded-full border-2"
        style={{ borderColor: selected ? BRONZE : '#C9C0B1' }}
      >
        {selected ? (
          <View
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: BRONZE }}
          />
        ) : null}
      </View>
      <View className="flex-1 gap-1">
        <Text className="font-sans-semibold text-base text-ink">{title}</Text>
        <Text className="font-sans text-sm leading-5 text-muted">
          {description}
        </Text>
      </View>
    </Pressable>
  );
}
