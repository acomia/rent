import { Feather } from '@expo/vector-icons';
import { Pressable, Switch, Text, View } from 'react-native';

import {
  BRONZE,
  HAIRLINE,
  INK,
  MUTED,
} from '@/components/catalog/catalog-style';

type FeatherName = keyof typeof Feather.glyphMap;

/**
 * Grouped list rows, the shape used across Profile and Settings.
 *
 * `RowGroup` owns the card and the hairlines between rows, so a group reads as
 * one object rather than a stack of separate cards — the difference between a
 * settings screen and a pile of buttons.
 */
export function RowGroup({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      {label ? (
        <Text className="px-1 font-sans-medium text-[11px] uppercase tracking-[2px] text-muted">
          {label}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-2xl border border-hairline bg-surface">
        {children}
      </View>
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  hint,
  value,
  destructive = false,
  first = false,
  onPress,
}: {
  icon?: FeatherName;
  label: string;
  /** Secondary line under the label. */
  hint?: string;
  /** Right-aligned current value, e.g. "English". */
  value?: string;
  destructive?: boolean;
  /** Suppresses the top divider on the first row of a group. */
  first?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-70"
      style={
        !first ? { borderTopWidth: 1, borderTopColor: HAIRLINE } : undefined
      }
    >
      {icon ? (
        <Feather name={icon} size={19} color={destructive ? '#A83232' : INK} />
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text
          className={`font-sans-medium text-base ${destructive ? 'text-overdue' : 'text-ink'}`}
        >
          {label}
        </Text>
        {hint ? (
          <Text className="font-sans text-xs text-muted">{hint}</Text>
        ) : null}
      </View>
      {value ? (
        <Text className="font-sans text-sm text-muted">{value}</Text>
      ) : null}
      {onPress ? (
        <Feather name="chevron-right" size={18} color={MUTED} />
      ) : null}
    </Pressable>
  );
}

/** A row whose control is a switch. Tapping the row toggles it, not just the switch. */
export function SwitchRow({
  icon,
  label,
  hint,
  value,
  onChange,
  first = false,
}: {
  icon?: FeatherName;
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  first?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-70"
      style={
        !first ? { borderTopWidth: 1, borderTopColor: HAIRLINE } : undefined
      }
    >
      {icon ? <Feather name={icon} size={19} color={INK} /> : null}
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-medium text-base text-ink">{label}</Text>
        {hint ? (
          <Text className="font-sans text-xs text-muted">{hint}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: HAIRLINE, true: BRONZE }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={HAIRLINE}
      />
    </Pressable>
  );
}
