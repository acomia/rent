/**
 * Booking data access (Phase 4).
 *
 * Reads fall back to a local approximation when Supabase is absent so the app
 * still demos offline (same pattern as `features/catalog/api.ts`); writes call
 * `requireDb()` and throw a clear error, because there is no meaningful mock for
 * reserving a real item (same pattern as `features/admin/api.ts`).
 *
 * The safety-critical logic deliberately lives in Postgres, not here:
 *   * `item_day_states()` computes the calendar across every unit of a design.
 *   * `pick_free_unit()` chooses a copy — RLS hides other customers' bookings,
 *     so the client cannot answer "is this free?" correctly on its own.
 *   * the `bookings_no_overlap` exclusion constraint is what actually prevents a
 *     double booking. A rejected insert here is expected, not exceptional.
 */

import { requireDb, supabase } from '@/lib/supabase';
import { dayState as localDayState, today } from './availability';
import { addDays, daysBetween, fromKey, toKey, type DayKey } from './dates';
import { quote } from './pricing';
import type { Booking, BookingStatus, FulfillmentType } from './types';

/** Postgres exclusion-constraint violation — the dates were taken first. */
const OVERLAP_CODE = '23P01';

export class SlotTakenError extends Error {
  constructor() {
    super('Those dates were just taken. Pick another range.');
    this.name = 'SlotTakenError';
  }
}

// --- Availability ------------------------------------------------------------

export type DayStateMap = Record<
  DayKey,
  'available' | 'unavailable' | 'cleaning'
>;

/**
 * Per-day calendar state for a design across the given window.
 * A day is available when at least one sellable unit is free that day.
 */
export async function fetchDayStates(
  itemId: string,
  from: Date,
  to: Date,
): Promise<DayStateMap> {
  if (!supabase) {
    // Offline demo: approximate from the deterministic local generator.
    const out: DayStateMap = {};
    const span = daysBetween(from, to);
    for (let i = 0; i <= span; i++) {
      const d = addDays(from, i);
      const s = localDayState(itemId, d, today());
      out[toKey(d)] =
        s === 'cleaning'
          ? 'cleaning'
          : s === 'available'
            ? 'available'
            : 'unavailable';
    }
    return out;
  }

  const { data, error } = await supabase.rpc('item_day_states', {
    p_item_id: itemId,
    p_from: toKey(from),
    p_to: toKey(to),
  });
  if (error) throw error;

  const out: DayStateMap = {};
  for (const row of (data ?? []) as { day: string; state: string }[]) {
    out[row.day] = row.state as DayStateMap[string];
  }
  return out;
}

// --- Reading bookings --------------------------------------------------------

const BOOKING_SELECT = `
  id, reference, item_id, unit_id, pickup_date, return_date,
  cleaning_buffer_days, status, fulfillment_type, fitting_at, fitting_status,
  created_at,
  items ( name, photos, rental_fee_per_day, deposit )
`;

type BookingRow = {
  id: string;
  reference: string;
  item_id: string;
  unit_id: string;
  pickup_date: string;
  return_date: string;
  cleaning_buffer_days: number;
  status: string;
  fulfillment_type: string;
  fitting_at: string | null;
  fitting_status: string | null;
  items: {
    name: string;
    photos: string[] | null;
    rental_fee_per_day: number;
    deposit: number;
  } | null;
};

/**
 * The database tracks the shop's full lifecycle; the customer's screens show a
 * coarser set. `hold` reads as pending because, to the customer, a slot being
 * held and a request awaiting the shop look the same.
 */
const STATUS_FROM_DB: Record<string, BookingStatus> = {
  hold: 'pending',
  pending: 'pending',
  approved: 'confirmed',
  rejected: 'cancelled',
  picked_up: 'outnow',
  rented: 'outnow',
  returned: 'returned',
  completed: 'completed',
  cancelled: 'cancelled',
};

function mapBooking(row: BookingRow): Booking {
  const days =
    daysBetween(fromKey(row.pickup_date), fromKey(row.return_date)) + 1;
  const pricePerDay = Number(row.items?.rental_fee_per_day ?? 0);
  const deposit = Number(row.items?.deposit ?? 0);
  const status = STATUS_FROM_DB[row.status] ?? 'pending';

  return {
    ref: row.reference,
    itemId: row.item_id,
    itemName: row.items?.name ?? 'Item',
    itemPhoto: row.items?.photos?.[0] ?? null,
    pickup: row.pickup_date,
    ret: row.return_date,
    cleaningDays: row.cleaning_buffer_days,
    fulfillment: row.fulfillment_type as FulfillmentType,
    fittingAt: row.fitting_at,
    status,
    // Payment state is NOT derivable from booking status — they are orthogonal.
    // Until `payments` lands in Phase 5 there is nothing to read, so this is a
    // placeholder: a booking the shop has approved has, in practice, paid its
    // deposit. Replace with a join on `payments`, do not extend this guess.
    payment: status === 'pending' ? 'unpaid' : 'deposit_paid',
    quote: quote({ pricePerDay, deposit, days }),
    paidOnline: status === 'pending' ? 0 : deposit,
  };
}

/** The signed-in customer's bookings, newest first. RLS scopes the rows. */
export async function fetchBookings(): Promise<Booking[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as BookingRow[]).map(mapBooking);
}

export async function fetchBooking(reference: string): Promise<Booking | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('reference', reference)
    .maybeSingle();
  if (error) throw error;
  return data ? mapBooking(data as unknown as BookingRow) : null;
}

// --- Writing -----------------------------------------------------------------

export type CreateBookingInput = {
  itemId: string;
  pickup: DayKey;
  ret: DayKey;
  fulfillment: FulfillmentType;
  fittingAt: string | null;
  size?: string | null;
};

/**
 * Reserves the dates.
 *
 * Inserted as 'pending' (awaiting the shop's approval), NOT as a paid booking:
 * only the PayMongo webhook may mark a deposit paid, and RLS deliberately gives
 * the client no path to self-approve. When Phase 5 lands this becomes a 'hold'
 * insert here plus a webhook that advances it — the screens do not change.
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<string> {
  const db = requireDb();

  const { data: userData, error: userError } = await db.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Sign in to reserve these dates.');
  }

  const { data: unitId, error: pickError } = await db.rpc('pick_free_unit', {
    p_item_id: input.itemId,
    p_pickup: input.pickup,
    p_return: input.ret,
    p_size: input.size ?? null,
  });
  if (pickError) throw pickError;
  if (!unitId) throw new SlotTakenError();

  const { data, error } = await db
    .from('bookings')
    .insert({
      customer_id: userData.user.id,
      item_id: input.itemId,
      unit_id: unitId as string,
      pickup_date: input.pickup,
      return_date: input.ret,
      status: 'pending',
      fulfillment_type: input.fulfillment,
      fitting_at: input.fittingAt,
      fitting_status: input.fittingAt ? 'requested' : null,
    })
    .select('reference')
    .single();

  // Another customer won the same unit between pick and insert. The constraint
  // is the arbiter, so this path is expected under load, not exceptional.
  if (error) {
    if (error.code === OVERLAP_CODE) throw new SlotTakenError();
    throw error;
  }
  return data.reference as string;
}

export async function cancelBooking(reference: string): Promise<void> {
  const db = requireDb();
  const { error } = await db
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('reference', reference);
  if (error) throw error;
}
