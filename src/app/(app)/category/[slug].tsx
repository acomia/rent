import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartButton } from '@/components/catalog/cart-button';
import { CLOUD, GRAPE, INK } from '@/components/catalog/catalog-style';
import {
  EMPTY_SHEET_FILTERS,
  FilterSheet,
  type SheetFilters,
} from '@/components/catalog/filter-sheet';
import { FilterPill } from '@/components/catalog/filter-pill';
import { ProductCard } from '@/components/catalog/product-card';
import {
  CatalogEmpty,
  CatalogError,
  CatalogLoading,
} from '@/components/catalog/states';
import { useCart } from '@/features/catalog/cart-context';
import { useItems } from '@/features/catalog/hooks';
import type { CategorySlug, Gender, Item } from '@/features/catalog/types';

function chunkPairs(items: Item[]): Item[][] {
  const rows: Item[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

function hasActiveFilters(f: SheetFilters): boolean {
  return (
    f.occasion !== null ||
    f.size !== null ||
    f.minPrice !== null ||
    f.maxPrice !== null
  );
}

export default function CategoryListing() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const { add, has } = useCart();
  const { slug, gender } = useLocalSearchParams<{
    slug: CategorySlug;
    gender?: Gender;
  }>();

  const categorySlug = (slug ?? 'gowns') as CategorySlug;
  const category = useMemo(
    () => CATEGORY_NAMES[categorySlug] ?? 'Catalog',
    [categorySlug],
  );

  // 'high' → priced high-to-low; toggled by the Price pill.
  const [sortDesc, setSortDesc] = useState(false);
  const [genderFilter, setGenderFilter] = useState<Gender>(gender ?? 'women');
  const [sheet, setSheet] = useState<SheetFilters>(EMPTY_SHEET_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useItems({
    category: categorySlug,
    gender: genderFilter,
    sort: sortDesc ? 'desc' : 'asc',
    occasion: sheet.occasion,
    size: sheet.size,
    minPrice: sheet.minPrice,
    maxPrice: sheet.maxPrice,
  });

  // Size chips reflect every size in this category/gender, independent of the
  // other filters, so selecting a size never empties the size list.
  const sizePool = useItems({ category: categorySlug, gender: genderFilter });
  const sizeOptions = useMemo(
    () => [...new Set((sizePool.data ?? []).flatMap((i) => i.sizes))],
    [sizePool.data],
  );

  const products = data ?? [];
  const rows = chunkPairs(products);

  return (
    <ScrollView
      className="flex-1 bg-canvas dark:bg-night-950"
      contentContainerClassName="gap-6 px-6"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={GRAPE}
        />
      }
    >
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full bg-lilac active:opacity-70 dark:bg-night-800"
        >
          <Feather name="chevron-left" size={22} color={dark ? CLOUD : INK} />
        </Pressable>
        <CartButton />
      </View>

      <Text className="font-sans-extrabold text-4xl text-ink dark:text-cloud">
        {category}
      </Text>

      <View className="flex-row gap-3">
        <FilterPill
          label={sortDesc ? 'Price: high' : 'Price: low'}
          icon="sliders"
          active
          onPress={() => setSortDesc((v) => !v)}
        />
        <FilterPill
          label={genderFilter === 'men' ? 'Men' : 'Women'}
          chevron
          onPress={() =>
            setGenderFilter((g) => (g === 'men' ? 'women' : 'men'))
          }
        />
        <FilterPill
          label="Filters"
          icon="filter"
          active={hasActiveFilters(sheet)}
          onPress={() => setSheetOpen(true)}
        />
      </View>

      {isLoading ? (
        <CatalogLoading />
      ) : isError ? (
        <CatalogError onRetry={refetch} />
      ) : products.length === 0 ? (
        <CatalogEmpty message="Nothing here yet — try another section or filter." />
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

      <FilterSheet
        visible={sheetOpen}
        value={sheet}
        sizes={sizeOptions}
        onApply={setSheet}
        onClose={() => setSheetOpen(false)}
      />
    </ScrollView>
  );
}

const CATEGORY_NAMES: Record<CategorySlug, string> = {
  gowns: 'Gowns',
  costumes: 'Costumes',
  shoes: 'Shoes',
  accessories: 'Accessories',
};
