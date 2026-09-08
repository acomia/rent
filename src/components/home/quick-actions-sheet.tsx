import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MUTED } from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';
import type { Category } from '@/features/catalog/types';

/**
 * "What are you looking for?" — the pull-up from the design board.
 *
 * A category shortcut that does NOT leave Home: the point is to choose a
 * direction without losing the greeting, the upcoming booking and the hero
 * behind it. Uses a plain RN Modal rather than a sheet library — the app has no
 * bottom-sheet dependency, and this is one static list.
 */
const BLURB: Record<string, string> = {
  gowns: 'For formal occasions',
  costumes: 'Themed collections',
  shoes: 'Complete the look',
  accessories: 'Finishing touches',
};

export function QuickActionsSheet({
  visible,
  categories,
  coverFor,
  onSelect,
  onClose,
}: {
  visible: boolean;
  categories: Category[];
  coverFor: (c: Category) => string | null;
  onSelect: (c: Category) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Tapping the dimmed area behind the sheet closes it. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        className="flex-1 bg-ink/45"
      />
      <View
        className="rounded-t-3xl bg-canvas px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="mb-4 h-1 w-10 self-center rounded-full bg-hairline" />
        <Text className="mb-4 font-display-bold text-2xl text-ink">
          What are you looking for?
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-3 pb-2">
            {categories.map((c) => {
              const cover = coverFor(c);
              return (
                <Pressable
                  key={c.slug}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}, ${c.count} items`}
                  onPress={() => onSelect(c)}
                  className="flex-row items-center gap-3 rounded-2xl border-hairline bg-surface p-3 active:opacity-85"
                >
                  <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-canvas-subtle">
                    {cover ? (
                      <Image
                        source={{ uri: cover }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <Glyph name={c.icon} size={24} color={MUTED} />
                    )}
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="font-display-semibold text-lg text-ink">
                      {c.name}
                    </Text>
                    <Text className="font-sans text-xs text-muted">
                      {BLURB[c.slug] ?? `${c.count} items`}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={MUTED} />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
