import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AdminHeader } from '@/components/admin/admin-header';
import { GRAPE, tintAccent } from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';
import { CatalogEmpty, CatalogError } from '@/components/catalog/states';
import { useAdminCategories, useDeleteCategory } from '@/features/admin/hooks';
import type { Tint } from '@/features/catalog/types';

export default function AdminCategories() {
  const { back, push } = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } =
    useAdminCategories();
  const del = useDeleteCategory();
  const categories = data ?? [];

  function onDelete(slug: string, name: string) {
    Alert.alert('Delete category', `Delete “${name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync(slug);
          } catch (e) {
            // The FK-guard throws a friendly message when items still reference it.
            Alert.alert(
              'Could not delete',
              e instanceof Error ? e.message : 'Please try again.',
            );
          }
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-canvas dark:bg-night-950">
      <AdminHeader
        title="Categories"
        onBack={() => back()}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add category"
            onPress={() => push('/(app)/admin/categories/new')}
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
          {categories.length === 0 ? (
            <CatalogEmpty message="No categories yet. Tap Add to create one." />
          ) : (
            categories.map((c) => (
              <Pressable
                key={c.slug}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${c.name}`}
                onPress={() =>
                  push({
                    pathname: '/(app)/admin/categories/[slug]',
                    params: { slug: c.slug },
                  })
                }
                className="flex-row items-center gap-3 rounded-2xl bg-canvas-subtle p-3 active:opacity-80 dark:bg-night-900"
              >
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-white/60 dark:bg-night-800">
                  <Glyph
                    name={c.icon}
                    size={24}
                    color={tintAccent[c.tint as Tint]}
                  />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="font-sans-semibold text-base text-ink dark:text-cloud">
                    {c.name}
                  </Text>
                  <Text className="font-sans text-xs text-muted">
                    {c.slug} · {c.count} item{c.count === 1 ? '' : 's'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${c.name}`}
                  onPress={() => onDelete(c.slug, c.name)}
                  hitSlop={8}
                  className="h-10 w-10 items-center justify-center rounded-full bg-blush dark:bg-night-800"
                >
                  <Feather name="trash-2" size={18} color="#ED5C9D" />
                </Pressable>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
