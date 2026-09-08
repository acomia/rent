import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRONZE, MUTED } from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';
import { ProductCard } from '@/components/catalog/product-card';
import { SearchBar } from '@/components/catalog/search-bar';
import { CatalogError, CatalogLoading } from '@/components/catalog/states';
import { Button } from '@/components/ui/button';
import { useCategories, useItems } from '@/features/catalog/hooks';

/** How many pieces the Featured strip shows. */
const FEATURED = 4;

export default function Browse() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const categories = useCategories();
  const items = useItems();

  function submitSearch() {
    const q = query.trim();
    if (!q) return;
    router.navigate({ pathname: '/(app)/search', params: { q } });
  }

  // "Featured" is the newest active pieces rather than an editorial flag.
  // A `featured` column nobody can set from the admin app would be worse than
  // a derived list — when the shop wants to curate this, that is the change.
  const featured = (items.data ?? []).slice(0, FEATURED);
  const hero = featured[0];

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        contentContainerClassName="gap-7 px-5"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: tabBarHeight + 16,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={items.isRefetching}
            onRefresh={items.refetch}
            tintColor={BRONZE}
          />
        }
      >
        <Text className="font-display-bold text-3xl text-ink">Renta</Text>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={submitSearch}
        />

        {/* Hero: the shop's invitation, over the newest piece it has. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore the collection"
          onPress={() => router.push('/(app)/categories')}
          className="overflow-hidden rounded-3xl bg-canvas-subtle active:opacity-90"
        >
          <View className="aspect-[4/3] w-full">
            {hero?.photos[0] ? (
              <Image
                source={{ uri: hero.photos[0] }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
              />
            ) : null}
          </View>
          <View className="gap-4 p-5">
            <Text className="font-display-bold text-3xl leading-[1.15] text-ink">
              Made for your{'\n'}special moments
            </Text>
            <View className="self-start">
              <Button
                label="Explore now"
                onPress={() => router.push('/(app)/categories')}
              />
            </View>
          </View>
        </Pressable>

        {/* Category quick-row — the same four categories as the grid, one tap away. */}
        {categories.data ? (
          <View className="flex-row justify-between">
            {categories.data.map((c) => (
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
                className="flex-1 items-center gap-2 active:opacity-70"
              >
                <View className="h-14 w-14 items-center justify-center rounded-2xl border border-hairline bg-surface">
                  <Glyph name={c.icon} size={24} color={MUTED} />
                </View>
                <Text className="font-sans-medium text-xs text-ink">
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-display-semibold text-xl text-ink">
              Featured
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(app)/categories')}
              hitSlop={8}
              className="flex-row items-center gap-1 active:opacity-70"
            >
              <Text className="font-sans-medium text-sm text-bronze">
                See all
              </Text>
              <Feather name="chevron-right" size={15} color={BRONZE} />
            </Pressable>
          </View>

          {items.isLoading ? (
            <CatalogLoading />
          ) : items.isError ? (
            <CatalogError onRetry={items.refetch} />
          ) : (
            <View className="gap-6">
              {[0, 2].map((row) => (
                <View key={row} className="flex-row gap-4">
                  {featured.slice(row, row + 2).map((item) => (
                    <ProductCard
                      key={item.id}
                      product={item}
                      onPress={() =>
                        router.push({
                          pathname: '/(app)/product/[id]',
                          params: { id: item.id },
                        })
                      }
                    />
                  ))}
                  {featured.slice(row, row + 2).length === 1 ? (
                    <View className="flex-1" />
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
