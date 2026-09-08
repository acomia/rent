import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingCard } from '@/components/booking/booking-card';
import { RentalBand } from '@/components/booking/rental-band';
import { SegmentedToggle } from '@/components/catalog/segmented-toggle';
import { BRONZE } from '@/components/catalog/catalog-style';
import { CUSTOMER_STATUS, StatusBadge } from '@/components/ui/status-badge';
import { today as todayFn } from '@/features/booking/availability';
import { useBookings } from '@/features/booking/hooks';
import {
  daysBetween,
  formatDate,
  formatTime,
  fromKey,
} from '@/features/booking/dates';
import { formatPeso } from '@/features/catalog/types';

/**
 * Screen 18 — My bookings.
 *
 * Grouped by what the customer has to do next rather than reverse-chronological,
 * so the thing that needs attention is always at the top.
 */
export default function Bookings() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const {
    data: bookings = [],
    isLoading,
    refetch,
    isRefetching,
  } = useBookings();
  const today = todayFn();
  const [tab, setTab] = useState('upcoming');

  // Four passes over the same array on every render, one of them redundant
  // (`active` was only ever split again) — now one pass, on data change.
  const { past, upcoming, returning } = useMemo(() => {
    const groups = {
      past: [] as typeof bookings,
      upcoming: [] as typeof bookings,
      returning: [] as typeof bookings,
    };
    for (const b of bookings) {
      if (b.status === 'completed' || b.status === 'cancelled')
        groups.past.push(b);
      else if (b.status === 'outnow') groups.returning.push(b);
      else if (b.status === 'confirmed' || b.status === 'pending')
        groups.upcoming.push(b);
    }
    return groups;
  }, [bookings]);

  const shown =
    tab === 'upcoming'
      ? [
          { title: 'Upcoming pickup', rows: upcoming },
          { title: 'Returning soon', rows: returning },
        ]
      : [{ title: 'Past bookings', rows: past }];

  return (
    <View className="flex-1 bg-canvas">
      <View className="gap-4 px-5 pb-4" style={{ paddingTop: insets.top + 12 }}>
        <Text className="font-display-bold text-3xl text-ink">My bookings</Text>
        <SegmentedToggle
          options={[
            { label: 'Upcoming', value: 'upcoming' },
            { label: 'Past', value: 'past' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView
        contentContainerClassName="gap-6 px-5"
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={BRONZE}
          />
        }
      >
        {isLoading ? null : shown.every((s) => s.rows.length === 0) ? (
          <View className="items-center gap-2 py-16">
            <Text className="text-center font-sans text-base text-muted">
              {tab === 'upcoming'
                ? 'No bookings yet. Find a piece and check its dates.'
                : 'Nothing here yet.'}
            </Text>
          </View>
        ) : null}

        {shown.map((section) =>
          section.rows.length === 0 ? null : (
            <View key={section.title} className="gap-3">
              <Text className="font-sans-medium text-[11px] uppercase tracking-[2px] text-muted">
                {section.title}
              </Text>
              {section.rows.map((b) => {
                const days = daysBetween(fromKey(b.pickup), fromKey(b.ret)) + 1;
                const untilReturn = daysBetween(today, fromKey(b.ret));
                return (
                  <Pressable
                    key={b.ref}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.itemName} booking`}
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/bookings/[id]',
                        params: { id: b.ref },
                      })
                    }
                    className="gap-3 rounded-2xl border-hairline bg-surface p-3 active:opacity-90"
                  >
                    <BookingCard
                      name={b.itemName}
                      photo={b.itemPhoto}
                      pickup={b.pickup}
                      ret={b.ret}
                      days={days}
                      right={<StatusBadge status={CUSTOMER_STATUS[b.status]} />}
                    />
                    <RentalBand
                      pickup={fromKey(b.pickup)}
                      ret={fromKey(b.ret)}
                      cleaningDays={b.cleaningDays}
                      today={today}
                      size="sm"
                    />
                    <View className="flex-row items-end justify-between">
                      <View className="gap-0.5">
                        {b.fittingAt ? (
                          <>
                            <Text className="font-sans text-[11px] uppercase tracking-[1.5px] text-muted">
                              Fitting
                            </Text>
                            <Text className="font-sans-medium text-xs text-ink">
                              {formatDate(new Date(b.fittingAt))},{' '}
                              {formatTime(new Date(b.fittingAt))}
                            </Text>
                          </>
                        ) : b.status === 'outnow' ? (
                          <Text className="font-sans-medium text-xs text-ink">
                            {untilReturn <= 0
                              ? 'Return today'
                              : `Return in ${untilReturn} ${untilReturn === 1 ? 'day' : 'days'}`}
                          </Text>
                        ) : null}
                      </View>
                      {b.payment === 'deposit_paid' ? (
                        <View className="items-end gap-0.5">
                          <Text className="font-sans text-[11px] uppercase tracking-[1.5px] text-muted">
                            Balance due
                          </Text>
                          <Text className="font-sans-bold text-sm text-ink">
                            {formatPeso(b.quote.balanceAtPickup)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ),
        )}
      </ScrollView>
    </View>
  );
}
