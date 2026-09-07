import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { formatRange, fromKey } from '@/features/booking/dates';
import { MUTED } from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';

/**
 * The item-and-dates card repeated across the reserve flow, so the customer sees
 * the same object confirmed back to them at every step.
 */
export function BookingCard({
  name,
  photo,
  pickup,
  ret,
  days,
  right,
}: {
  name: string;
  photo: string | null;
  pickup: string;
  ret: string;
  days: number;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-hairline bg-surface p-3">
      <View className="h-16 w-14 items-center justify-center overflow-hidden rounded-xl bg-canvas-subtle">
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
            accessibilityLabel={name}
          />
        ) : (
          <Glyph name="hanger" size={22} color={MUTED} />
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className="font-display-semibold text-base text-ink"
        >
          {name}
        </Text>
        <Text className="font-sans text-xs text-muted">
          {formatRange(fromKey(pickup), fromKey(ret))}
        </Text>
        <Text className="font-sans text-xs text-muted">
          {days} {days === 1 ? 'day' : 'days'}
        </Text>
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}
