/**
 * TanStack Query hooks for bookings (Phase 4).
 *
 * The in-progress draft is NOT here: it is client-only UI state and lives in
 * `booking-context.tsx`. Everything in this file is server state.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelBooking,
  createBooking,
  fetchBooking,
  fetchBookings,
  fetchDayStates,
  type CreateBookingInput,
} from './api';
import { toKey } from './dates';

export const bookingKeys = {
  all: ['bookings'] as const,
  one: (ref: string) => ['bookings', ref] as const,
  days: (itemId: string, from: string, to: string) =>
    ['bookings', 'days', itemId, from, to] as const,
};

export function useDayStates(itemId: string | undefined, from: Date, to: Date) {
  return useQuery({
    queryKey: bookingKeys.days(itemId ?? '', toKey(from), toKey(to)),
    queryFn: () => fetchDayStates(itemId as string, from, to),
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

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => createBooking(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all });
      qc.invalidateQueries({ queryKey: ['bookings', 'days'] });
    },
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
