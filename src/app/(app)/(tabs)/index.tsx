import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartButton } from '@/components/catalog/cart-button';
import { CLOUD, GRAPE } from '@/components/catalog/catalog-style';
import { CategoryTile } from '@/components/catalog/category-tile';
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
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { customer } = useAuth();
  const dark = useColorScheme() === 'dark';
  const firstName = (customer?.full_name ?? '').split(' ')[0];

  const [gender, setGender] = useState<Gender>('women');
  const [query, setQuery] = useState('');

  // Collapsing top bar: the pinned header slides up on scroll-down and back
  // down on scroll-up. `barHeight` is how far it travels to fully hide, and the
  // top padding the scroll content needs to clear it.
  const TOP_BAR_HEIGHT = 44; // the menu button is h-11 (44px)
  const barHeight = insets.top + TOP_BAR_HEIGHT + 20;

  const shown = useSharedValue(0); // 0 = fully shown, -barHeight = fully hidden
  const lastY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    const y = e.contentOffset.y;
    const dy = y - lastY.get();
    if (y < barHeight) {
      shown.set(withTiming(0, { duration: 200 })); // near top: always show
    } else if (dy > 4) {
      shown.set(withTiming(-barHeight, { duration: 200 })); // scrolling down: hide
    } else if (dy < -4) {
      shown.set(withTiming(0, { duration: 200 })); // scrolling up: reveal
    }
    lastY.set(y);
  });

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shown.get() }],
    opacity: interpolate(
      shown.get(),
      [-barHeight, 0],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

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
    router.navigate({ pathname: '/(app)/(tabs)/search', params: { q } });
  }

  const rows = chunkPairs(categories ?? []);

  return (
    <View className="flex-1 bg-canvas dark:bg-night-950">
      <Animated.ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-6"
        contentContainerStyle={{
          paddingTop: barHeight + 8,
          paddingBottom: tabBarHeight + 8,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={GRAPE}
            progressViewOffset={insets.top}
          />
        }
      >
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
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0 z-10 bg-canvas px-6 dark:bg-night-950"
        style={[{ paddingTop: insets.top + 8, paddingBottom: 12 }, headerStyle]}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account"
            onPress={() => router.navigate('/(app)/(tabs)/profile')}
            className="h-11 w-11 items-center justify-center rounded-full bg-lilac active:opacity-70 dark:bg-night-800"
          >
            <Feather name="menu" size={20} color={dark ? CLOUD : GRAPE} />
          </Pressable>
          <CartButton onPress={() => router.navigate('/(app)/(tabs)/bag')} />
        </View>
      </Animated.View>
    </View>
  );
}
