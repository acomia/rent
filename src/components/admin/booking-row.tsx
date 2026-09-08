import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { MUTED } from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';
import { StatusBadge, type Status } from '@/components/ui/status-badge';
import type { AdminBookingStatus } from '@/features/admin/bookings-api';
import { formatRange, fromKey } from '@/features/booking/dates';
import { formatPeso } from '@/features/catalog/types';

/**
 * The shop's nine lifecycle states collapse onto the six status colours. `hold`
 * borrows the pending tint because both mean "nothing decided yet", but it keeps
 * its own word so the two are never confused.
 */
export const ADMIN_STATUS: Record<
  AdminBookingStatus,
  { tone: Status; label: string }
> = {
  hold: { tone: 'pending', label: 'Hold' },
  pending: { tone: 'pending', label: 'Pending' },
  approved: { tone: 'confirmed', label: 'Confirmed' },
  rejected: { tone: 'overdue', label: 'Rejected' },
  picked_up: { tone: 'outnow', label: 'Out now' },
  rented: { tone: 'outnow', label: 'Out now' },
  returned: { tone: 'cleaning', label: 'Returned' },
  completed: { tone: 'settled', label: 'Completed' },
  cancelled: { tone: 'settled', label: 'Cancelled' },
};

/** One booking in the admin list: who, what, when, how much, and its state. */
export function BookingRow({
  customerName,
  itemName,
  itemPhoto,
  pickup,
  ret,
  amount,
  status,
  onPress,
}: {
  customerName: string;
  itemName: string;
  itemPhoto: string | null;
  pickup: string;
  ret: string;
  amount: number;
  status: AdminBookingStatus;
  onPress?: () => void;
}) {
  const s = ADMIN_STATUS[status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${customerName}, ${itemName}, ${s.label}`}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border-hairline bg-surface p-3 active:opacity-90"
    >
      <View className="h-14 w-12 items-center justify-center overflow-hidden rounded-xl bg-canvas-subtle">
        {itemPhoto ? (
          <Image
            source={{ uri: itemPhoto }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
            accessibilityLabel={itemName}
          />
        ) : (
          <Glyph name="hanger" size={20} color={MUTED} />
        )}
      </View>

      <View className="flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className="font-sans-semibold text-base text-ink"
        >
          {customerName}
        </Text>
        <Text numberOfLines={1} className="font-sans text-xs text-muted">
          {itemName}
        </Text>
        <Text className="font-sans text-xs text-muted">
          {formatRange(fromKey(pickup), fromKey(ret))}
        </Text>
      </View>

      <View className="items-end gap-1.5">
        <StatusBadge status={s.tone} label={s.label} />
        <Text className="font-sans-bold text-sm text-ink">
          {formatPeso(amount)}
        </Text>
      </View>
    </Pressable>
  );
}
