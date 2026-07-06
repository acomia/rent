import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { AdminHeader } from '@/components/admin/admin-header';
import {
  GRAPE,
  INK,
  tintAccent,
  tintClass,
} from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';
import { CatalogEmpty, CatalogError } from '@/components/catalog/states';
import { useAdminItems } from '@/features/admin/hooks';
import { formatPeso, type Item } from '@/features/catalog/types';

function ItemRow({ item, onPress }: { item: Item; onPress: () => void }) {
  const dark = useColorScheme() === 'dark';
  const inactive = item.isActive === false;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.name}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl bg-canvas-subtle p-3 active:opacity-80 dark:bg-night-900"
    >
      <View
        className={`h-16 w-16 items-center justify-center overflow-hidden rounded-xl dark:bg-night-800 ${tintClass[item.tint]}`}
      >
        {item.photos[0] ? (
          <Image
            source={{ uri: item.photos[0] }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <Glyph
            name={item.icon}
            size={30}
            color={dark ? tintAccent[item.tint] : INK}
          />
        )}
      </View>

      <View className="flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className="font-sans-semibold text-base text-ink dark:text-cloud"
        >
          {item.name}
        </Text>
        <Text numberOfLines={1} className="font-sans text-xs text-muted">
          {formatPeso(item.pricePerDay)}/day · {item.units.length} unit
          {item.units.length === 1 ? '' : 's'}
        </Text>
      </View>

      {inactive ? (
        <View className="rounded-full bg-night-700/10 px-2.5 py-1 dark:bg-night-700">
          <Text className="font-sans-medium text-xs text-muted">Hidden</Text>
        </View>
      ) : null}
      <Feather name="chevron-right" size={20} color="#6E6A7D" />
    </Pressable>
  );
}

export default function AdminItems() {
  const { back, push } = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useAdminItems();
  const items = data ?? [];

  return (
    <View className="flex-1 bg-canvas dark:bg-night-950">
      <AdminHeader
        title="Items"
        onBack={() => back()}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add item"
            onPress={() => push('/(app)/admin/items/new')}
            hitSlop={8}
            className="py-1 active:opacity-70"
          >
            <Text className="font-sans-semibold text-base text-grape dark:text-grape-soft">
              Add
            </Text>
          </Pressable>
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={GRAPE} />
        </View>
      ) : isError ? (
        <CatalogError onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerClassName="gap-3 px-5 pb-10"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={GRAPE}
            />
          }
        >
          {items.length === 0 ? (
            <CatalogEmpty message="No items yet. Tap Add to create your first one." />
          ) : (
            items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onPress={() =>
                  push({
                    pathname: '/(app)/admin/items/[id]',
                    params: { id: item.id },
                  })
                }
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
