/**
 * TanStack Query hooks for admin booking management (Phase 4).
 *
 * Every mutation invalidates the customer-facing booking queries too, so a
 * shop-side approval shows up on the customer's screens on their next read —
 * and the availability cache, because a rejection releases the dates.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import {
  fetchAdminBooking,
  fetchAdminBookings,
  markReturned,
  updateBookingStatus,
  updateFittingStatus,
} from './bookings-api';

export const adminBookingKeys = {
  all: ['admin', 'bookings'] as const,
  one: (ref: string) => ['admin', 'bookings', ref] as const,
};

function invalidateBookings(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: adminBookingKeys.all }),
    // The customer's own list and detail.
    client.invalidateQueries({ queryKey: ['bookings'] }),
    // A damaged unit changes what the calendar offers.
    client.invalidateQueries({ queryKey: ['catalog'] }),
  ]);
}

export function useAdminBookings() {
  return useQuery({
    queryKey: adminBookingKeys.all,
    queryFn: fetchAdminBookings,
  });
}

export function useAdminBooking(reference: string | undefined) {
  return useQuery({
    queryKey: adminBookingKeys.one(reference ?? ''),
    queryFn: () => fetchAdminBooking(reference as string),
    enabled: Boolean(reference),
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateBookingStatus,
    onSuccess: () => invalidateBookings(qc),
  });
}

export function useMarkReturned() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markReturned,
    onSuccess: () => invalidateBookings(qc),
  });
}

export function useUpdateFittingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateFittingStatus,
    onSuccess: () => invalidateBookings(qc),
  });
}
