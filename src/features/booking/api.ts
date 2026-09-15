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

import { invokeFunction, requireDb, supabase } from '@/lib/supabase';
import { dayState as localDayState, today } from './availability';
import { addDays, daysBetween, fromKey, toKey, type DayKey } from './dates';
import { quote } from './pricing';
import type {
  Booking,
  BookingStatus,
  FulfillmentType,
  PaymentRecord,
  PaymentState,
} from './types';

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
 *
 * A day is available when at least one sellable unit is free that day — of
 * `size`, when one is given. Passing the customer's chosen size matters: the
 * final insert calls `pick_free_unit` with that size, so an unscoped calendar
 * can offer a date that the insert then refuses.
 */
export async function fetchDayStates(
  itemId: string,
  from: Date,
  to: Date,
  size?: string | null,
): Promise<DayStateMap> {
  if (!supabase) {
    // Offline demo: approximate from the deterministic local generator. Size is
    // ignored here — the mock catalog has no per-unit inventory to narrow to.
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
    p_size: size ?? null,
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
  items ( name, photos, rental_fee_per_day, deposit ),
  payments ( type, status, created_at )
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
  payments: { type: string; status: string; created_at: string }[];
};

/** Payment states that mean money actually moved, as opposed to never charged. */
const DEPOSIT_WAS_CHARGED = new Set<PaymentRecord['status']>([
  'paid',
  'refunded',
  'forfeited',
]);

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

  // A booking can carry more than one 'deposit' payment row over its life (a
  // failed attempt followed by a retried, successful one — see
  // create-payment-intent's idempotent-reuse branch), and the nested embed's
  // row order is not guaranteed to be creation order. Sort by created_at so a
  // stale 'failed' attempt never shadows a since-succeeded 'paid' one — same
  // reasoning as `mapAdminBooking` in `features/admin/bookings-api.ts`.
  const depositPayment = [...(row.payments ?? [])]
    .filter((p) => p.type === 'deposit')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  const depositStatus = depositPayment?.status as
    PaymentRecord['status'] | undefined;
  const balancePaid = row.payments?.some(
    (p) => p.type === 'balance' && p.status === 'paid',
  );

  let payment: PaymentState;
  if (depositStatus === 'refunded') payment = 'refunded';
  else if (depositStatus === 'forfeited') payment = 'forfeited';
  else if (balancePaid) payment = 'settled';
  else if (depositStatus === 'paid') payment = 'deposit_paid';
  else payment = 'unpaid';

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
    payment,
    quote: quote({ pricePerDay, deposit, days }),
    paidOnline:
      depositStatus && DEPOSIT_WAS_CHARGED.has(depositStatus) ? deposit : 0,
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

export type CreateHoldInput = {
  itemId: string;
  pickup: DayKey;
  ret: DayKey;
  fulfillment: FulfillmentType;
  fittingAt: string | null;
  size?: string | null;
};

const HOLD_MINUTES = 15;

/**
 * Reserves the dates as a checkout hold, NOT a paid booking. Payment happens
 * next (`createPaymentIntent`); only the PayMongo webhook may advance this
 * past `hold` (see `reserve/processing.tsx`).
 */
export async function createHold(
  input: CreateHoldInput,
): Promise<{ id: string; reference: string; holdExpiresAt: string }> {
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

  const holdExpiresAt = new Date(
    Date.now() + HOLD_MINUTES * 60_000,
  ).toISOString();

  const { data, error } = await db
    .from('bookings')
    .insert({
      customer_id: userData.user.id,
      item_id: input.itemId,
      unit_id: unitId as string,
      pickup_date: input.pickup,
      return_date: input.ret,
      status: 'hold',
      hold_expires_at: holdExpiresAt,
      fulfillment_type: input.fulfillment,
      fitting_at: input.fittingAt,
      fitting_status: input.fittingAt ? 'requested' : null,
    })
    .select('id, reference, hold_expires_at')
    .single();

  if (error) {
    if (error.code === OVERLAP_CODE) throw new SlotTakenError();
    throw error;
  }
  return {
    id: data.id as string,
    reference: data.reference as string,
    holdExpiresAt: data.hold_expires_at as string,
  };
}

export async function createPaymentIntent(
  bookingId: string,
): Promise<{ clientKey: string; paymentIntentId: string }> {
  return invokeFunction('create-payment-intent', { body: { bookingId } });
}

/** Lightweight poll target for `reserve/processing.tsx` — status only. */
export async function fetchHoldStatus(bookingId: string): Promise<string> {
  const db = requireDb();
  const { data, error } = await db
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return 'gone';
  if (data.status !== 'hold') return data.status;

  // Still a hold — check whether the most recent deposit attempt failed, so
  // the customer sees "try again" promptly instead of waiting out the poll
  // timeout. The webhook deliberately leaves the booking at 'hold' on a
  // failed payment so the customer can retry before the countdown runs out.
  const { data: payment, error: paymentError } = await db
    .from('payments')
    .select('status')
    .eq('booking_id', bookingId)
    .eq('type', 'deposit')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (paymentError) throw paymentError;
  return payment?.status === 'failed' ? 'failed' : 'hold';
}

export async function cancelBooking(reference: string): Promise<void> {
  const db = requireDb();
  // Every `hold` row has a non-null `hold_expires_at` by construction, so
  // leaving it set while flipping status away from 'hold' violates
  // `bookings_hold_has_expiry` — same fix already applied in
  // `paymongo-webhook` and `admin-refund-booking`.
  const { error } = await db
    .from('bookings')
    .update({ status: 'cancelled', hold_expires_at: null })
    .eq('reference', reference);
  if (error) throw error;
}

// --- Payments (Phase 5) -------------------------------------------------------

export async function fetchPayments(
  reference: string,
): Promise<PaymentRecord[]> {
  if (!supabase) return [];
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id')
    .eq('reference', reference)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) return [];

  const { data, error } = await supabase
    .from('payments')
    .select('type, amount, status, paid_at, refunded_at')
    .eq('booking_id', booking.id)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    type: row.type as PaymentRecord['type'],
    amount: Number(row.amount),
    status: row.status as PaymentRecord['status'],
    paidAt: row.paid_at as string | null,
    refundedAt: row.refunded_at as string | null,
  }));
}
