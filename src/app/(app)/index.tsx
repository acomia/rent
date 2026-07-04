import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartButton } from '@/components/catalog/cart-button';
import { CategoryTile } from '@/components/catalog/category-tile';
import { CLOUD, GRAPE } from '@/components/catalog/catalog-style';
import { SearchBar } from '@/components/catalog/search-bar';
import { SegmentedToggle } from '@/components/catalog/segmented-toggle';
import { CatalogError, CatalogLoading } from '@/components/catalog/states';
import { useAuth } from '@/features/auth/auth-context';
import { useCategories } from '@/features/catalog/hooks';
import type { Category, Gender } from '@/features/catalog/types';

// Two tiles per row; a trailing spacer keeps a lone last tile from stretching.
function chunkPairs(items: Category[]): Category[][] {
  const rows: Category[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { customer } = useAuth();
  const dark = useColorScheme() === 'dark';
  const firstName = (customer?.full_name ?? '').split(' ')[0];

  const [gender, setGender] = useState<Gender>('women');
  const [query, setQuery] = useState('');

  const {
    data: categories,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useCategories();

  function submitSearch() {
    const q = query.trim();
    if (!q) return;
    router.push({ pathname: '/(app)/search', params: { q } });
  }

  const rows = chunkPairs(categories ?? []);

  return (
    <ScrollView
      className="flex-1 bg-canvas dark:bg-night-950"
      contentContainerClassName="gap-7 px-6"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 48 }}
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
          accessibilityLabel="Account"
          onPress={() => router.push('/(app)/profile')}
          className="h-11 w-11 items-center justify-center rounded-full bg-lilac active:opacity-70 dark:bg-night-800"
        >
          <Feather name="menu" size={20} color={dark ? CLOUD : GRAPE} />
        </Pressable>
        <CartButton
          onPress={() =>
            Alert.alert('Your bag', 'Checkout arrives in the next phase.')
          }
        />
      </View>

      <View className="gap-1">
        <Text className="font-sans text-base text-muted">
          {firstName ? `Hi ${firstName},` : 'Hi there,'}
        </Text>
        <Text className="font-sans-extrabold text-4xl leading-[1.1] text-ink dark:text-cloud">
          What item are you looking for?
        </Text>
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        onSubmitEditing={submitSearch}
      />

      <SegmentedToggle
        options={[
          { label: 'Women', value: 'women' },
          { label: 'Men', value: 'men' },
        ]}
        value={gender}
        onChange={(v) => setGender(v as Gender)}
      />

      <View className="gap-4">
        <Text className="font-sans-bold text-xl text-ink dark:text-cloud">
          Categories
        </Text>
        {isLoading ? (
          <CatalogLoading />
        ) : isError ? (
          <CatalogError onRetry={refetch} />
        ) : (
          rows.map((row, i) => (
            <View key={i} className="flex-row gap-4">
              {row.map((category) => (
                <CategoryTile
                  key={category.slug}
                  category={category}
                  count={category.count}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/category/[slug]',
                      params: { slug: category.slug, gender },
                    })
                  }
                />
              ))}
              {row.length === 1 ? <View className="flex-1" /> : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
