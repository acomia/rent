import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { ProductCard } from '@/components/catalog/product-card';
import { useItems } from '@/features/catalog/hooks';
import type { Item } from '@/features/catalog/types';

/**
 * Other pieces in the same category. Reuses the catalog query rather than
 * adding a "similar" endpoint — with a single shop's inventory, same-category
 * IS the useful notion of similar.
 */
export function SimilarItems({
  item,
  limit = 4,
}: {
  item: Item;
  limit?: number;
}) {
  const router = useRouter();
  const { data } = useItems({ category: item.category });

  const similar = (data ?? []).filter((i) => i.id !== item.id).slice(0, limit);
  if (similar.length === 0) return null;

  const rows: Item[][] = [];
  for (let i = 0; i < similar.length; i += 2)
    rows.push(similar.slice(i, i + 2));

  return (
    <View className="gap-4">
      <Text className="font-display-semibold text-xl text-ink">
        You might also like
      </Text>
      <View className="gap-6">
        {rows.map((row, i) => (
          <View key={i} className="flex-row gap-4">
            {row.map((s) => (
              <ProductCard
                key={s.id}
                product={s}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/product/[id]',
                    params: { id: s.id },
                  })
                }
              />
            ))}
            {row.length === 1 ? <View className="flex-1" /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}
