import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';

/**
 * Shared loading / empty / error states for the catalog screens, so the three
 * screens render the same skeletons and messaging. Colors come from the pastel
 * tokens; the skeleton mimics the product-card grid (aspect-[3/4] tiles).
 */

function SkeletonCard() {
  return (
    <View className="flex-1 gap-3">
      <View className="aspect-[3/4] rounded-3xl bg-canvas-subtle dark:bg-night-800" />
      <View className="gap-1.5 px-1">
        <View className="h-4 w-3/4 rounded-full bg-canvas-subtle dark:bg-night-800" />
        <View className="h-3 w-1/2 rounded-full bg-canvas-subtle dark:bg-night-800" />
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
      <View className="h-16 w-16 items-center justify-center rounded-full bg-lilac dark:bg-night-800">
        <Feather name="search" size={26} color="#8165CA" />
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
      <View className="h-16 w-16 items-center justify-center rounded-full bg-blush dark:bg-night-800">
        <Feather name="wifi-off" size={26} color="#ED5C9D" />
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
