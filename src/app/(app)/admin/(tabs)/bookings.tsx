import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { AdminHeader } from '@/components/admin/admin-header';
import { BookingRow } from '@/components/admin/booking-row';
import { BRONZE } from '@/components/catalog/catalog-style';
import { FilterPill } from '@/components/catalog/filter-pill';
import { CatalogError } from '@/components/catalog/states';
import {
  needsAction,
  type AdminBookingStatus,
} from '@/features/admin/bookings-api';
import { useAdminBookings } from '@/features/admin/bookings-hooks';

/**
 * Admin booking management — the shop's decision queue.
 *
 * Ordered by what needs a decision rather than by date: anything awaiting the
 * shop floats to the top, because a booking nobody has looked at is the only
 * kind that costs the shop a customer.
 */

type FilterKey = 'needs_action' | 'all' | 'pending' | 'confirmed' | 'outnow';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'needs_action', label: 'Needs action' },
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'outnow', label: 'Out now' },
];

const MATCHES: Record<FilterKey, (s: AdminBookingStatus) => boolean> = {
  needs_action: (s) => needsAction({ status: s }),
  all: () => true,
  pending: (s) => needsAction({ status: s }),
  confirmed: (s) => s === 'approved',
  outnow: (s) => s === 'picked_up' || s === 'rented',
};

/** Undecided first, then live rentals, then everything settled. */
const PRIORITY: Record<AdminBookingStatus, number> = {
  pending: 0,
  hold: 1,
  approved: 2,
  picked_up: 3,
  rented: 3,
  returned: 4,
  completed: 5,
  rejected: 6,
  cancelled: 6,
};

export default function AdminBookings() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('needs_action');
  const {
    data = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useAdminBookings();

  // Filtering and sorting ran on every render — including each refetch flip.
  const rows = useMemo(
    () =>
      data
        .filter((b) => MATCHES[filter](b.status))
        .sort((a, b) => {
          const p = PRIORITY[a.status] - PRIORITY[b.status];
          return p !== 0 ? p : a.pickup.localeCompare(b.pickup);
        }),
    [data, filter],
  );

  const awaiting = useMemo(() => data.filter(needsAction).length, [data]);

  return (
    <View className="flex-1 bg-canvas">
      <AdminHeader title="Bookings" onBack={() => router.back()} />

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
        {awaiting > 0 ? (
          <View className="rounded-2xl bg-pending-soft p-4">
            <Text className="font-sans-medium text-sm text-pending">
              {awaiting} {awaiting === 1 ? 'booking is' : 'bookings are'}{' '}
              waiting on you.
            </Text>
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          {FILTERS.map((f) => (
            <FilterPill
              key={f.key}
              label={f.label}
              active={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>

        {isError ? (
          <CatalogError onRetry={refetch} />
        ) : isLoading ? null : rows.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-center font-sans text-base text-muted">
              {filter === 'needs_action'
                ? 'Nothing is waiting on you right now.'
                : 'No bookings here yet.'}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {rows.map((b) => (
              <BookingRow
                key={b.ref}
                customerName={b.customerName}
                itemName={b.itemName}
                itemPhoto={b.itemPhoto}
                pickup={b.pickup}
                ret={b.ret}
                amount={b.rentalFee}
                status={b.status}
                onPress={() =>
                  router.push({
                    pathname: '/admin/booking/[ref]',
                    params: { ref: b.ref },
                  })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
