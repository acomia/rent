import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
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
import { useAuth } from '@/features/auth/auth-context';
import {
  CATEGORIES,
  categoryCount,
  type Gender,
} from '@/features/catalog/mock-data';

// Two per row; a trailing spacer keeps a lone last tile from stretching wide.
const ROWS = [
  CATEGORIES.slice(0, 2),
  CATEGORIES.slice(2, 4),
  CATEGORIES.slice(4),
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { customer } = useAuth();
  const dark = useColorScheme() === 'dark';
  const firstName = (customer?.full_name ?? '').split(' ')[0];

  const [gender, setGender] = useState<Gender>('women');
  const [query, setQuery] = useState('');

  return (
    <ScrollView
      className="flex-1 bg-canvas dark:bg-night-950"
      contentContainerClassName="gap-7 px-6"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
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

      <SearchBar value={query} onChangeText={setQuery} returnKeyType="search" />

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
        {ROWS.map((row, i) => (
          <View key={i} className="flex-row gap-4">
            {row.map((category) => (
              <CategoryTile
                key={category.slug}
                category={category}
                count={categoryCount(category.slug)}
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
        ))}
      </View>
    </ScrollView>
  );
}
