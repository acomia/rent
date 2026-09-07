import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRONZE } from '@/components/catalog/catalog-style';
import { ProductCard } from '@/components/catalog/product-card';
import { SearchBar } from '@/components/catalog/search-bar';
import {
  CatalogEmpty,
  CatalogError,
  CatalogLoading,
} from '@/components/catalog/states';
import { useCart } from '@/features/catalog/cart-context';
import { useItems } from '@/features/catalog/hooks';
import type { Item } from '@/features/catalog/types';

function chunkPairs(items: Item[]): Item[][] {
  const rows: Item[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

export default function Search() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { add, has } = useCart();
  const { q } = useLocalSearchParams<{ q?: string }>();

  // `query` is the live text field; `term` is the committed search (on submit).
  const [query, setQuery] = useState(q ?? '');
  const [term, setTerm] = useState((q ?? '').trim());

  // As a tab root this screen stays mounted, so arriving with a fresh `q` (e.g.
  // submitting from the Home search bar) must update the committed search.
  // Adjust during render on param change (React's prop-change pattern) rather
  // than in an effect; only a non-empty query applies, so tabbing back in never
  // clears a live search.
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    const next = (q ?? '').trim();
    if (next) {
      setQuery(q ?? '');
      setTerm(next);
    }
  }

  const { data, isLoading, isError, refetch, isRefetching } = useItems({
    search: term || undefined,
  });

  const products = data ?? [];
  const rows = chunkPairs(products);

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-6 px-6"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: tabBarHeight + 8,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={BRONZE}
        />
      }
    >
      <SearchBar
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        autoFocus={!term}
        onSubmitEditing={() => setTerm(query.trim())}
      />

      {term ? (
        <Text className="font-sans text-base text-muted">
          Results for{' '}
          <Text className="font-sans-semibold text-ink">“{term}”</Text>
        </Text>
      ) : null}

      {isLoading ? (
        <CatalogLoading />
      ) : isError ? (
        <CatalogError onRetry={refetch} />
      ) : products.length === 0 ? (
        <CatalogEmpty
          message={`No items match “${term}”. Try another search.`}
        />
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
