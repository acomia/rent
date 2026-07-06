import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AdminHeader } from '@/components/admin/admin-header';
import { tintAccent, tintClass } from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';
import type { Tint } from '@/features/catalog/types';
import { useAdminCategories, useAdminItems } from '@/features/admin/hooks';

type CardProps = {
  title: string;
  subtitle: string;
  icon: string;
  tint: Tint;
  onPress: () => void;
};

function DashboardCard({ title, subtitle, icon, tint, onPress }: CardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className={`flex-1 gap-4 rounded-3xl p-5 active:opacity-90 dark:bg-night-800 ${tintClass[tint]}`}
    >
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/60 dark:bg-night-900">
        <Glyph name={icon} size={26} color={tintAccent[tint]} />
      </View>
      <View className="gap-0.5">
        <Text className="font-sans-bold text-lg text-ink dark:text-cloud">
          {title}
        </Text>
        <Text className="font-sans text-sm text-muted">{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function AdminDashboard() {
  const { back, push } = useRouter();
  const items = useAdminItems();
  const categories = useAdminCategories();

  const itemCount = items.data?.length ?? 0;
  const activeCount = items.data?.filter((i) => i.isActive).length ?? 0;
  const categoryCount = categories.data?.length ?? 0;

  return (
    <View className="flex-1 bg-canvas dark:bg-night-950">
      <AdminHeader title="Admin" onBack={() => back()} />

      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-sans text-base text-muted">
          Manage your catalog and inventory.
        </Text>

        <View className="flex-row gap-4">
          <DashboardCard
            title="Items"
            subtitle={
              items.isLoading
                ? 'Loading…'
                : `${itemCount} total · ${activeCount} active`
            }
            icon="hanger"
            tint="lilac"
            onPress={() => push('/(app)/admin/items')}
          />
          <DashboardCard
            title="Categories"
            subtitle={categories.isLoading ? 'Loading…' : `${categoryCount}`}
            icon="shape"
            tint="sky"
            onPress={() => push('/(app)/admin/categories')}
          />
        </View>
      </ScrollView>
    </View>
  );
}
