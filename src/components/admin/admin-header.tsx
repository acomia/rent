import { Feather } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INK } from '@/components/catalog/catalog-style';

/**
 * Shared header for the admin screens: a Back affordance, a centred title, and
 * an optional right-side action (e.g. Save / Add).
 */
export function AdminHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center justify-between border-b border-hairline px-5 pb-3"
      style={{ paddingTop: insets.top + 12 }}
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full border-hairline bg-surface active:opacity-70"
        >
          <Feather name="chevron-left" size={19} color={INK} />
        </Pressable>
      ) : (
        <View className="h-10 w-10" />
      )}

      <Text
        numberOfLines={1}
        className="flex-1 text-center font-display-semibold text-xl text-ink"
      >
        {title}
      </Text>

      <View className="min-h-10 min-w-10 items-end justify-center">
        {right}
      </View>
    </View>
  );
}
