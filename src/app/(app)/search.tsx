import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLOUD, GRAPE, INK } from '@/components/catalog/catalog-style';
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
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const { add, has } = useCart();
  const { q } = useLocalSearchParams<{ q?: string }>();

  // `query` is the live text field; `term` is the committed search (on submit).
  const [query, setQuery] = useState(q ?? '');
  const [term, setTerm] = useState((q ?? '').trim());

  const { data, isLoading, isError, refetch, isRefetching } = useItems({
    search: term || undefined,
  });

  const products = data ?? [];
  const rows = chunkPairs(products);

  return (
    <ScrollView
      className="flex-1 bg-canvas dark:bg-night-950"
      contentContainerClassName="gap-6 px-6"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={GRAPE}
        />
      }
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full bg-lilac active:opacity-70 dark:bg-night-800"
        >
          <Feather name="chevron-left" size={22} color={dark ? CLOUD : INK} />
        </Pressable>
        <View className="flex-1">
          <SearchBar
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoFocus={!term}
            onSubmitEditing={() => setTerm(query.trim())}
          />
        </View>
      </View>

      {term ? (
        <Text className="font-sans text-base text-muted">
          Results for{' '}
          <Text className="font-sans-semibold text-ink dark:text-cloud">
            “{term}”
          </Text>
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
