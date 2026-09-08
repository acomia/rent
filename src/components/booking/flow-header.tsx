import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INK } from '@/components/catalog/catalog-style';

/** Back arrow and a centred title, shared by every screen in the reserve flow. */
export function FlowHeader({
  title,
  onBack,
}: {
  title?: string;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View
      className="flex-row items-center gap-3 px-5 pb-3"
      style={{ paddingTop: insets.top + 8 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack ?? (() => router.back())}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-full border-hairline bg-surface active:opacity-70"
      >
        <Feather name="chevron-left" size={19} color={INK} />
      </Pressable>
      {title ? (
        <Text className="font-display-semibold text-xl text-ink">{title}</Text>
      ) : null}
    </View>
  );
}

/**
 * Shown when a reserve screen is reached without a draft — a deep link, or a
 * reload mid-flow. Four screens carried a private copy of this block.
 */
export function NoDraft({
  message = 'Choose your dates first.',
}: {
  message?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center bg-canvas px-8">
      <Text className="text-center font-sans text-base text-muted">
        {message}
      </Text>
    </View>
  );
}
