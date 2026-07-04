import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartButton } from '@/components/catalog/cart-button';
import { CLOUD, INK } from '@/components/catalog/catalog-style';
import { FilterPill } from '@/components/catalog/filter-pill';
import { ProductCard } from '@/components/catalog/product-card';
import { useCart } from '@/features/catalog/cart-context';
import {
  getCategory,
  productsByCategory,
  type CategorySlug,
  type Gender,
} from '@/features/catalog/mock-data';

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
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

  // Normalize once so the header and the grid can never disagree.
  const categorySlug = (slug ?? 'gowns') as CategorySlug;
  const category = getCategory(categorySlug);
  // 'high' → priced high-to-low; toggled by the Price pill.
  const [sortDesc, setSortDesc] = useState(false);
  // Seeded from the route param, then toggled locally by the section pill.
  const [genderFilter, setGenderFilter] = useState<Gender>(gender ?? 'women');

  const products = useMemo(() => {
    const base = productsByCategory(categorySlug).filter(
      (p) => p.gender === genderFilter,
    );
    return [...base].sort((a, b) =>
      sortDesc ? b.pricePerDay - a.pricePerDay : a.pricePerDay - b.pricePerDay,
    );
  }, [categorySlug, genderFilter, sortDesc]);

  const rows = chunkPairs(products);

  return (
    <ScrollView
      className="flex-1 bg-canvas dark:bg-night-950"
      contentContainerClassName="gap-6 px-6"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
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
        {category?.name ?? 'Catalog'}
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
      </View>

      {products.length === 0 ? (
        <Text className="font-sans text-base text-muted">
          Nothing here yet — try the other section.
        </Text>
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
