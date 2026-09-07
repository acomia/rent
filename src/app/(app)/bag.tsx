import { Feather } from '@expo/vector-icons';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRONZE } from '@/components/catalog/catalog-style';
import { ProductCard } from '@/components/catalog/product-card';
import { CatalogError, CatalogLoading } from '@/components/catalog/states';
import { useCart } from '@/features/catalog/cart-context';
import { useItems } from '@/features/catalog/hooks';
import type { Item } from '@/features/catalog/types';

function chunkPairs(items: Item[]): Item[][] {
  const rows: Item[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

export default function Bag() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { items, count, has, add } = useCart();

  // The cart holds product IDs; pull the full catalog and keep the ones in it.
  const { data, isLoading, isError, refetch, isRefetching } = useItems();
  const inBag = (data ?? []).filter((product) => items.includes(product.id));
  const rows = chunkPairs(inBag);

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-6 px-6"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: tabBarHeight + 8,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={BRONZE}
        />
      }
    >
      <View className="gap-1">
        <Text className="font-display-bold text-3xl text-ink">Your bag</Text>
        <Text className="font-sans text-base text-muted">
          {count === 0
            ? 'Nothing here yet'
            : `${count} item${count === 1 ? '' : 's'} · checkout arrives in the next phase`}
        </Text>
      </View>

      {isLoading ? (
        <CatalogLoading />
      ) : isError ? (
        <CatalogError onRetry={refetch} />
      ) : count === 0 ? (
        <View className="items-center gap-3 py-16">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-canvas-subtle">
            <Feather name="shopping-bag" size={26} color={BRONZE} />
          </View>
          <Text className="px-8 text-center font-sans text-base text-muted">
            Your bag is empty. Browse the catalog and tap the pink button to add
            pieces here.
          </Text>
        </View>
      ) : (
        <View className="gap-6">
          {rows.map((row, i) => (
            <View key={i} className="flex-row gap-4">
              {row.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  added={has(product.id)}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/product/[id]',
                      params: { id: product.id },
                    })
                  }
                  onAdd={() => add(product.id)}
                />
              ))}
              {row.length === 1 ? <View className="flex-1" /> : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
