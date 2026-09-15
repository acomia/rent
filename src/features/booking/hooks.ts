/**
 * TanStack Query hooks for bookings (Phase 4).
 *
 * The in-progress draft is NOT here: it is client-only UI state and lives in
 * `booking-context.tsx`. Everything in this file is server state.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelBooking,
  createHold,
  createPaymentIntent,
  fetchBooking,
  fetchBookings,
  fetchDayStates,
  fetchHoldStatus,
  fetchPayments,
  type CreateHoldInput,
} from './api';
import { toKey } from './dates';

export const bookingKeys = {
  all: ['bookings'] as const,
  one: (ref: string) => ['bookings', ref] as const,
  days: (itemId: string, from: string, to: string, size: string | null) =>
    ['bookings', 'days', itemId, from, to, size ?? 'any'] as const,
};

export function useDayStates(
  itemId: string | undefined,
  from: Date,
  to: Date,
  size?: string | null,
) {
  return useQuery({
    // `size` is part of the key: a design's calendar differs per size, and
    // serving the all-sizes answer to a customer who picked M would offer dates
    // the final insert refuses.
    queryKey: bookingKeys.days(
      itemId ?? '',
      toKey(from),
      toKey(to),
      size ?? null,
    ),
    queryFn: () => fetchDayStates(itemId as string, from, to, size),
    enabled: Boolean(itemId),
    // Availability must not go stale while the screen sits open — someone else
    // may take the slot. But the window overlaps by two months as the customer
    // steps through the calendar, so `0` refetched months it had just loaded.
    // A few seconds keeps stepping cheap without ever serving a stale answer to
    // a fresh visit; the exclusion constraint is the real arbiter regardless.
    staleTime: 15_000,
  });
}

export function useBookings() {
  return useQuery({ queryKey: bookingKeys.all, queryFn: fetchBookings });
}

export function useBookingByRef(reference: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.one(reference ?? ''),
    queryFn: () => fetchBooking(reference as string),
    enabled: Boolean(reference),
  });
}

export function useCreateHold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHoldInput) => createHold(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all });
      qc.invalidateQueries({ queryKey: ['bookings', 'days'] });
    },
  });
}

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: (bookingId: string) => createPaymentIntent(bookingId),
  });
}

/** Polls a hold's status while waiting for the webhook to advance it. */
export function useHoldStatus(
  bookingId: string | null,
  opts: { enabled: boolean },
) {
  return useQuery({
    queryKey: ['bookings', 'hold-status', bookingId ?? ''],
    queryFn: () => fetchHoldStatus(bookingId as string),
    enabled: opts.enabled && Boolean(bookingId),
    refetchInterval: (query) => (query.state.data === 'hold' ? 2000 : false),
    staleTime: 0,
  });
}

export function usePayments(reference: string | undefined) {
  return useQuery({
    queryKey: ['bookings', 'payments', reference ?? ''],
    queryFn: () => fetchPayments(reference as string),
    enabled: Boolean(reference),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reference: string) => cancelBooking(reference),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all });
      qc.invalidateQueries({ queryKey: ['bookings', 'days'] });
    },
  });
}
