import { Feather } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';

import { INK, MUTED, OVERDUE } from '@/components/catalog/catalog-style';

type FeatherName = keyof typeof Feather.glyphMap;

/** A quiet navigation row used down the booking detail. */
export function DisclosureRow({
  icon,
  label,
  value,
  destructive = false,
  onPress,
}: {
  icon: FeatherName;
  label: string;
  value?: string;
  destructive?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl border p-4 active:opacity-80 ${
        destructive
          ? 'border-overdue-soft bg-overdue-soft/50'
          : 'border-hairline bg-surface'
      }`}
    >
      <Feather name={icon} size={18} color={destructive ? OVERDUE : INK} />
      <Text
        className={`flex-1 font-sans-medium text-base ${
          destructive ? 'text-overdue' : 'text-ink'
        }`}
      >
        {label}
      </Text>
      {value ? (
        <Text className="font-sans text-sm text-muted">{value}</Text>
      ) : null}
      {destructive ? null : (
        <Feather name="chevron-right" size={18} color={MUTED} />
      )}
    </Pressable>
  );
}
