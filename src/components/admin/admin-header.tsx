import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Shared header for the admin screens: a Back affordance, a centred title, and
 * an optional right-side action (e.g. Save / Add). Mirrors the custom header on
 * the Profile screen so the admin area feels part of the same app rather than a
 * stock navigation bar.
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
      className="flex-row items-center justify-between px-5 pb-3"
      style={{ paddingTop: insets.top + 12 }}
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          hitSlop={8}
          className="min-w-16 py-1 active:opacity-70"
        >
          <Text className="font-sans text-base text-grape dark:text-grape-soft">
            Back
          </Text>
        </Pressable>
      ) : (
        <View className="min-w-16" />
      )}

      <Text
        numberOfLines={1}
        className="flex-1 text-center font-sans-semibold text-lg text-ink dark:text-cloud"
      >
        {title}
      </Text>

      <View className="min-w-16 items-end">{right}</View>
    </View>
  );
}
