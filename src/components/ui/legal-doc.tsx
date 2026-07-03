import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TERMS_VERSION } from '@/features/auth/schemas';

/**
 * Placeholder legal document screen. Final PH Data Privacy Act–compliant copy
 * lands in Phase 9; for now this captures the structure and the version stamp
 * so the acceptance flow is real end-to-end.
 */
export function LegalDoc({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
}) {
  const insets = useSafeAreaInsets();
  const { back } = useRouter();
  return (
    <View className="flex-1 bg-blush dark:bg-plum-950">
      <View
        className="flex-row items-center justify-between px-6 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Text className="text-2xl font-semibold text-ink dark:text-cream">
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => back()}
          className="rounded-full bg-black/5 px-4 py-2 active:opacity-70 dark:bg-white/10"
        >
          <Text className="font-medium text-wine dark:text-cream">Done</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerClassName="gap-5 px-6 pb-16 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-xs uppercase tracking-widest text-champagne">
          Version {TERMS_VERSION} · Draft
        </Text>
        <Text className="text-base leading-6 text-muted">{intro}</Text>
        {sections.map((s) => (
          <View key={s.heading} className="gap-1.5">
            <Text className="text-lg font-semibold text-ink dark:text-cream">
              {s.heading}
            </Text>
            <Text className="text-[15px] leading-6 text-muted">{s.body}</Text>
          </View>
        ))}
        <Text className="pt-4 text-xs italic text-muted">
          Placeholder copy — final legal text is added before launch (Phase 9).
        </Text>
      </ScrollView>
    </View>
  );
}
