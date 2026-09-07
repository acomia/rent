import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { AdminHeader } from '@/components/admin/admin-header';
import { BookingRow } from '@/components/admin/booking-row';
import { BRONZE } from '@/components/catalog/catalog-style';
import { isOut, isOverdue } from '@/features/admin/bookings-api';
import { useAdminBookings } from '@/features/admin/bookings-hooks';
import { today as todayFn } from '@/features/booking/availability';
import { daysBetween, fromKey, toKey } from '@/features/booking/dates';

/**
 * What is currently out, ordered by how late it is.
 *
 * Overdue first, then due today, then the rest — the same principle as the
 * booking queue: the list is sorted by what will cost the shop something, not by
 * when it was created.
 */
export default function AdminReturns() {
  const router = useRouter();
  const today = todayFn();
  const { data = [], isLoading, refetch, isRefetching } = useAdminBookings();

  const todayKey = toKey(today);
  const out = useMemo(
    () => data.filter(isOut).sort((a, b) => a.ret.localeCompare(b.ret)),
    [data],
  );
  const overdueCount = useMemo(
    () => out.filter((b) => isOverdue(b, today)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [out, todayKey],
  );

  return (
    <View className="flex-1 bg-canvas">
      <AdminHeader title="Returns" onBack={() => router.back()} />

      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={BRONZE}
          />
        }
      >
        {overdueCount > 0 ? (
          <View className="rounded-2xl bg-overdue-soft p-4">
            <Text className="font-sans-medium text-sm text-overdue">
              {overdueCount} {overdueCount === 1 ? 'item is' : 'items are'} past
              their return date.
            </Text>
          </View>
        ) : null}

        {isLoading ? null : out.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-center font-sans text-base text-muted">
              Nothing is out right now.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {out.map((b) => {
              const late = daysBetween(today, fromKey(b.ret));
              return (
                <View key={b.ref} className="gap-1">
                  <BookingRow
                    customerName={b.customerName}
                    itemName={b.itemName}
                    itemPhoto={b.itemPhoto}
                    pickup={b.pickup}
                    ret={b.ret}
                    amount={b.rentalFee}
                    status={b.status}
                    onPress={() =>
                      router.push({
                        pathname: '/admin/return/[ref]',
                        params: { ref: b.ref },
                      })
                    }
                  />
                  <Text
                    className={`px-1 font-sans text-xs ${late < 0 ? 'text-overdue' : 'text-muted'}`}
                  >
                    {late < 0
                      ? `${Math.abs(late)} ${Math.abs(late) === 1 ? 'day' : 'days'} overdue`
                      : late === 0
                        ? 'Due back today'
                        : `Due back in ${late} ${late === 1 ? 'day' : 'days'}`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
