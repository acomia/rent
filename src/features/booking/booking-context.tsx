import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { BookingDraft, FulfillmentType } from './types';

/**
 * The in-progress booking, as the customer moves through the reserve flow.
 *
 * This is client-only UI state and belongs in context — it is not server state
 * and must not be cached by TanStack Query. Everything that IS server state
 * (the customer's bookings, availability) lives in `hooks.ts`.
 *
 * The draft is one object rather than a chain of route params because the flow
 * branches (a fitting is optional) and going back must not lose earlier answers.
 */

type BookingContextValue = {
  draft: BookingDraft | null;
  startDraft: (item: {
    id: string;
    name: string;
    photo: string | null;
    pricePerDay: number;
    deposit: number;
    cleaningBufferDays: number;
    /** Null means "any copy" — the calendar and unit pick stay unnarrowed. */
    size?: string | null;
  }) => void;
  setRange: (pickup: string, ret: string) => void;
  setFulfillment: (f: FulfillmentType) => void;
  setFitting: (iso: string | null) => void;
  setSize: (size: string | null) => void;
  clearDraft: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft | null>(null);

  const startDraft = useCallback<BookingContextValue['startDraft']>((item) => {
    setDraft({
      itemId: item.id,
      itemName: item.name,
      itemPhoto: item.photo,
      pricePerDay: item.pricePerDay,
      deposit: item.deposit,
      cleaningDays: item.cleaningBufferDays,
      pickup: null,
      ret: null,
      fulfillment: null,
      fittingAt: null,
      // Carried in at creation rather than set immediately afterwards: the size
      // decides which days the calendar may offer, so it must be there before
      // the dates screen's first availability fetch.
      size: item.size ?? null,
    });
  }, []);

  const setRange = useCallback((pickup: string, ret: string) => {
    setDraft((d) => (d ? { ...d, pickup, ret } : d));
  }, []);

  const setFulfillment = useCallback((fulfillment: FulfillmentType) => {
    setDraft((d) => (d ? { ...d, fulfillment } : d));
  }, []);

  const setFitting = useCallback((fittingAt: string | null) => {
    setDraft((d) => (d ? { ...d, fittingAt } : d));
  }, []);

  const setSize = useCallback((size: string | null) => {
    setDraft((d) => (d ? { ...d, size } : d));
  }, []);

  const clearDraft = useCallback(() => setDraft(null), []);

  const value = useMemo(
    () => ({
      draft,
      startDraft,
      setRange,
      setFulfillment,
      setFitting,
      setSize,
      clearDraft,
    }),
    [
      draft,
      startDraft,
      setRange,
      setFulfillment,
      setFitting,
      setSize,
      clearDraft,
    ],
  );

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within a BookingProvider');
  return ctx;
}
