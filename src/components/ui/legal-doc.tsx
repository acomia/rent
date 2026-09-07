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
    <View className="flex-1 bg-canvas">
      <View
        className="flex-row items-center justify-between px-6 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Text className="font-sans-bold text-2xl text-ink">{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => back()}
          className="rounded-full bg-black/5 px-4 py-2 active:opacity-70"
        >
          <Text className="font-sans-medium text-bronze">Done</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerClassName="gap-5 px-6 pb-16 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-sans-semibold text-xs uppercase tracking-widest text-bronze">
          Version {TERMS_VERSION} · Draft
        </Text>
        <Text className="font-sans text-base leading-6 text-muted">
          {intro}
        </Text>
        {sections.map((s) => (
          <View key={s.heading} className="gap-1.5">
            <Text className="font-sans-semibold text-lg text-ink">
              {s.heading}
            </Text>
            <Text className="font-sans text-[15px] leading-6 text-muted">
              {s.body}
            </Text>
          </View>
        ))}
        <Text className="pt-4 font-sans text-xs italic text-muted">
          Placeholder copy — final legal text is added before launch (Phase 9).
        </Text>
      </ScrollView>
    </View>
  );
}
