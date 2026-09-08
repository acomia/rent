import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AdminHeader } from '@/components/admin/admin-header';
import { BRONZE, INK } from '@/components/catalog/catalog-style';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAdminBookings } from '@/features/admin/bookings-hooks';
import { today as todayFn } from '@/features/booking/availability';
import {
  WEEKDAYS,
  addDays,
  formatMonth,
  formatTime,
  sameDay,
  toKey,
} from '@/features/booking/dates';

/**
 * The shop's fitting day-view.
 *
 * A fitting is an appointment, not a rental, so this is a diary — one day at a
 * time, in time order. It reads from the same bookings the rental screens use,
 * because in v1 a fitting is always attached to a booking; a standalone fitting
 * (someone trying things on before choosing) would need its own table.
 */
export default function AdminFittings() {
  const router = useRouter();
  const today = todayFn();
  const [selected, setSelected] = useState(today);
  const { data = [], isLoading, refetch, isRefetching } = useAdminBookings();

  // The week containing the selected day, Sunday first.
  const week = useMemo(() => {
    const start = addDays(selected, -selected.getDay());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selected]);

  // One pass over the data instead of a scan per weekday cell plus another for
  // the day's rows: each of those re-parsed every `fittingAt` string, so a
  // week view cost ~8 full scans with a fresh Date per booking per scan.
  const byDay = useMemo(() => {
    const map = new Map<string, typeof data>();
    for (const b of data) {
      if (!b.fittingAt || b.fittingStatus === 'cancelled') continue;
      const key = toKey(new Date(b.fittingAt));
      const bucket = map.get(key);
      if (bucket) bucket.push(b);
      else map.set(key, [b]);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.fittingAt!.localeCompare(b.fittingAt!));
    }
    return map;
  }, [data]);

  const rows = byDay.get(toKey(selected)) ?? [];

  return (
    <View className="flex-1 bg-canvas">
      <AdminHeader title="Fittings" onBack={() => router.back()} />

      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={BRONZE}
          />
        }
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-display-semibold text-xl text-ink">
            {formatMonth(selected.getFullYear(), selected.getMonth())}
          </Text>
          <View className="flex-row gap-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous week"
              onPress={() => setSelected(addDays(selected, -7))}
              hitSlop={6}
              className="h-9 w-9 items-center justify-center rounded-full border-hairline active:opacity-70"
            >
              <Feather name="chevron-left" size={17} color={INK} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next week"
              onPress={() => setSelected(addDays(selected, 7))}
              hitSlop={6}
              className="h-9 w-9 items-center justify-center rounded-full border-hairline active:opacity-70"
            >
              <Feather name="chevron-right" size={17} color={INK} />
            </Pressable>
          </View>
        </View>

        <View className="flex-row">
          {week.map((d) => {
            const active = sameDay(d, selected);
            const isToday = sameDay(d, today);
            return (
              <Pressable
                key={d.toISOString()}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSelected(d)}
                className="flex-1 items-center gap-1.5 py-1"
              >
                <Text className="font-sans text-[11px] text-muted">
                  {WEEKDAYS[d.getDay()]}
                </Text>
                <View
                  className={`h-10 w-10 items-center justify-center rounded-full ${
                    active ? 'bg-charcoal' : isToday ? 'border border-ink' : ''
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      active
                        ? 'font-sans-semibold text-white'
                        : 'font-sans-medium text-ink'
                    }`}
                  >
                    {d.getDate()}
                  </Text>
                </View>
                <View
                  className={`h-1.5 w-1.5 rounded-full ${
                    byDay.has(toKey(d)) && !active
                      ? 'bg-bronze'
                      : 'bg-transparent'
                  }`}
                />
              </Pressable>
            );
          })}
        </View>

        {isLoading ? null : rows.length === 0 ? (
          <View className="items-center py-14">
            <Text className="text-center font-sans text-base text-muted">
              No fittings booked for this day.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {rows.map((b) => {
              const at = new Date(b.fittingAt!);
              const confirmed = b.fittingStatus === 'confirmed';
              return (
                <Pressable
                  key={b.ref}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatTime(at)}, ${b.customerName}`}
                  onPress={() =>
                    router.push({
                      pathname: '/admin/booking/[ref]',
                      params: { ref: b.ref },
                    })
                  }
                  className="flex-row items-center gap-3 rounded-2xl border-hairline bg-surface p-4 active:opacity-90"
                >
                  <Text className="w-20 font-sans-semibold text-sm text-ink">
                    {formatTime(at)}
                  </Text>
                  <View className="flex-1 gap-0.5">
                    <Text
                      numberOfLines={1}
                      className="font-sans-semibold text-base text-ink"
                    >
                      {b.customerName}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="font-sans text-xs text-muted"
                    >
                      {b.itemName}
                    </Text>
                  </View>
                  <StatusBadge
                    status={confirmed ? 'confirmed' : 'pending'}
                    label={confirmed ? 'Confirmed' : 'Pending'}
                  />
                </Pressable>
              );
            })}
          </View>
        )}

        <Text className="font-sans text-xs leading-5 text-muted">
          A fitting never holds the rental dates — confirming one here does not
          reserve the item. Open the booking to confirm or cancel an
          appointment.
        </Text>
      </ScrollView>
    </View>
  );
}
