import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MUTED } from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';
import { CatalogError, CatalogLoading } from '@/components/catalog/states';
import { FlowHeader } from '@/components/booking/flow-header';
import { useCategories, useItems } from '@/features/catalog/hooks';
import type { Category } from '@/features/catalog/types';

/** One line of shop-voice copy per category — what it is actually for. */
const BLURB: Record<string, string> = {
  gowns: 'For formal occasions',
  costumes: 'Themed collections',
  shoes: 'Complete the look',
  accessories: 'Finishing touches',
};

export default function Categories() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useCategories();
  const items = useItems();

  /** First photo of any item in the category — the card's face. */
  function coverFor(c: Category): string | null {
    const match = (items.data ?? []).find(
      (i) => i.category === c.slug && i.photos[0],
    );
    return match?.photos[0] ?? null;
  }

  const rows: Category[][] = [];
  for (let i = 0; i < (data?.length ?? 0); i += 2) {
    rows.push((data ?? []).slice(i, i + 2));
  }

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader title="Categories" />
      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-10 pt-1"
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <CatalogLoading />
        ) : isError ? (
          <CatalogError onRetry={refetch} />
        ) : (
          rows.map((row, i) => (
            <View key={i} className="flex-row gap-4">
              {row.map((c) => {
                const cover = coverFor(c);
                return (
                  <Pressable
                    key={c.slug}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.name}, ${c.count} items`}
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/category/[slug]',
                        params: { slug: c.slug },
                      })
                    }
                    className="flex-1 gap-3 active:opacity-90"
                  >
                    <View className="aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border-hairline bg-canvas-subtle">
                      {cover ? (
                        <Image
                          source={{ uri: cover }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                          transition={200}
                          accessibilityLabel={c.name}
                        />
                      ) : (
                        <Glyph name={c.icon} size={38} color={MUTED} />
                      )}
                    </View>
                    <View className="gap-0.5 px-0.5">
                      <Text className="font-display-semibold text-base text-ink">
                        {c.name}
                      </Text>
                      <Text className="font-sans text-xs text-muted">
                        {BLURB[c.slug] ?? `${c.count} items`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {row.length === 1 ? <View className="flex-1" /> : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
