import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRONZE, INK } from '@/components/catalog/catalog-style';
import { FilterPill } from '@/components/catalog/filter-pill';
import {
  EMPTY_SHEET_FILTERS,
  FilterSheet,
  type SheetFilters,
} from '@/components/catalog/filter-sheet';
import { ProductCard } from '@/components/catalog/product-card';
import {
  CatalogEmpty,
  CatalogError,
  CatalogLoading,
} from '@/components/catalog/states';
import { useCategories, useItems } from '@/features/catalog/hooks';
import type { Gender, Item } from '@/features/catalog/types';

/** null = both genders. */
type GenderFilter = Gender | null;

const GENDER_LABEL: Record<'all' | Gender, string> = {
  all: 'All genders',
  women: 'Women',
  men: 'Men',
};

function nextGender(g: GenderFilter): GenderFilter {
  return g === null ? 'women' : g === 'women' ? 'men' : null;
}

function chunkPairs(items: Item[]): Item[][] {
  const rows: Item[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

function hasActiveFilters(f: SheetFilters): boolean {
  return (
    f.category !== null ||
    f.occasion !== null ||
    f.size !== null ||
    f.minPrice !== null ||
    f.maxPrice !== null
  );
}

/** The full catalog, filterable by category, gender, and price (plus occasion/size). */
export default function AllItems() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sortDesc, setSortDesc] = useState(false);
  const [gender, setGender] = useState<GenderFilter>(null);
  const [sheet, setSheet] = useState<SheetFilters>(EMPTY_SHEET_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const categories = useCategories();

  const { data, isLoading, isError, refetch, isRefetching } = useItems({
    category: sheet.category ?? undefined,
    gender: gender ?? undefined,
    sort: sortDesc ? 'desc' : 'asc',
    occasion: sheet.occasion,
    size: sheet.size,
    minPrice: sheet.minPrice,
    maxPrice: sheet.maxPrice,
  });

  // Size chips reflect every size in the current category/gender slice,
  // independent of the other filters, so picking a size never empties the list.
  const sizePool = useItems({
    category: sheet.category ?? undefined,
    gender: gender ?? undefined,
  });
  const sizeOptions = useMemo(
    () => [...new Set((sizePool.data ?? []).flatMap((i) => i.sizes))],
    [sizePool.data],
  );

  const products = data ?? [];
  const rows = chunkPairs(products);

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-6 px-6"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={BRONZE}
        />
      }
    >
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full bg-canvas-subtle active:opacity-70"
        >
          <Feather name="chevron-left" size={22} color={INK} />
        </Pressable>
      </View>

      <Text className="font-display-bold text-4xl text-ink">All items</Text>

      <View className="flex-row flex-wrap gap-3">
        <FilterPill
          label={sortDesc ? 'Price: high' : 'Price: low'}
          icon="sliders"
          active
          onPress={() => setSortDesc((v) => !v)}
        />
        <FilterPill
          label={GENDER_LABEL[gender ?? 'all']}
          chevron
          onPress={() => setGender((g) => nextGender(g))}
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
        <CatalogEmpty message="Nothing matches those filters yet — try loosening one." />
      ) : (
        <View className="gap-6">
          {rows.map((row, i) => (
            <View key={i} className="flex-row gap-4">
              {row.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/product/[id]',
                      params: { id: product.id },
                    })
                  }
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
        categories={categories.data ?? []}
        onApply={setSheet}
        onClose={() => setSheetOpen(false)}
      />
    </ScrollView>
  );
}
