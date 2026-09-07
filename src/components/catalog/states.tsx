import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { MUTED } from './catalog-style';

/**
 * Shared loading / empty / error states for the catalog screens, so the three
 * screens render the same skeletons and messaging. The skeleton mimics the
 * product-card grid (aspect-[3/4] tiles).
 */

function SkeletonCard() {
  return (
    <View className="flex-1 gap-3">
      <View className="aspect-[3/4] rounded-2xl bg-canvas-subtle" />
      <View className="gap-1.5 px-0.5">
        <View className="h-4 w-3/4 rounded-full bg-canvas-subtle" />
        <View className="h-3 w-1/2 rounded-full bg-canvas-subtle" />
      </View>
    </View>
  );
}

/** A two-column skeleton grid shown while items load. */
export function CatalogLoading() {
  return (
    <View className="gap-6">
      {[0, 1, 2].map((row) => (
        <View key={row} className="flex-row gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ))}
    </View>
  );
}

export function CatalogEmpty({
  message = 'Nothing matches those filters yet.',
}: {
  message?: string;
}) {
  return (
    <View className="items-center gap-3 py-16">
      <View className="h-14 w-14 items-center justify-center rounded-full border border-hairline bg-canvas-subtle">
        <Feather name="search" size={22} color={MUTED} />
      </View>
      <Text className="px-8 text-center font-sans text-base text-muted">
        {message}
      </Text>
    </View>
  );
}

export function CatalogError({ onRetry }: { onRetry?: () => void }) {
  return (
    <View className="items-center gap-4 py-16">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-overdue-soft">
        <Feather name="wifi-off" size={22} color="#A83232" />
      </View>
      <Text className="px-8 text-center font-sans text-base text-muted">
        We couldn&apos;t load the catalog. Check your connection and try again.
      </Text>
      {onRetry ? (
        <View className="w-40">
          <Button label="Retry" variant="outline" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
