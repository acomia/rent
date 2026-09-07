/**
 * Admin booking management data access (Phase 4).
 *
 * Kept separate from `features/booking/api.ts` because the two see different
 * data through the same table: the customer file is scoped by RLS to its own
 * rows, this one relies on `is_admin()` to see every booking and — since
 * `0013_admin_reads_customers.sql` — the customer behind it.
 *
 * Every transition here is a write, so there is no mock fallback: `requireDb()`
 * throws a clear error instead (the pattern from `features/admin/api.ts`).
 */

import { daysBetween, fromKey } from '@/features/booking/dates';
import { quote } from '@/features/booking/pricing';
import type { FulfillmentType } from '@/features/booking/types';
import { supabase } from '@/lib/supabase';

function requireDb() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_* to .env.',
    );
  }
  return supabase;
}

/**
 * The shop's view of a booking's lifecycle — the full ramp, not the coarser set
 * the customer sees. `hold` is included because an abandoned checkout is
 * something the shop may need to see before the sweeper removes it.
 */
export type AdminBookingStatus =
  | 'hold'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'picked_up'
  | 'rented'
  | 'returned'
  | 'completed'
  | 'cancelled';

export type AdminBooking = {
  ref: string;
  status: AdminBookingStatus;
  customerName: string;
  customerPhone: string | null;
  itemName: string;
  itemPhoto: string | null;
  unitSize: string | null;
  pickup: string;
  ret: string;
  cleaningDays: number;
  days: number;
  fulfillment: FulfillmentType;
  fittingAt: string | null;
  fittingStatus: string | null;
  rejectionReason: string | null;
  rentalFee: number;
  deposit: number;
  createdAt: string;
};

const ADMIN_BOOKING_SELECT = `
  reference, status, pickup_date, return_date, cleaning_buffer_days,
  fulfillment_type, fitting_at, fitting_status, rejection_reason, created_at,
  customers ( full_name, phone_number ),
  items ( name, photos, rental_fee_per_day, deposit ),
  item_units ( size )
`;

type Row = {
  reference: string;
  status: string;
  pickup_date: string;
  return_date: string;
  cleaning_buffer_days: number;
  fulfillment_type: string;
  fitting_at: string | null;
  fitting_status: string | null;
  rejection_reason: string | null;
  created_at: string;
  customers: { full_name: string; phone_number: string | null } | null;
  items: {
    name: string;
    photos: string[] | null;
    rental_fee_per_day: number;
    deposit: number;
  } | null;
  item_units: { size: string | null } | null;
};

function mapAdminBooking(row: Row): AdminBooking {
  const days =
    daysBetween(fromKey(row.pickup_date), fromKey(row.return_date)) + 1;
  const pricePerDay = Number(row.items?.rental_fee_per_day ?? 0);
  const deposit = Number(row.items?.deposit ?? 0);
  const q = quote({ pricePerDay, deposit, days });

  return {
    ref: row.reference,
    status: row.status as AdminBookingStatus,
    // A null name means the admin select policy is missing, not that the
    // customer is anonymous — worth showing plainly rather than as a blank.
    customerName: row.customers?.full_name ?? 'Unknown customer',
    customerPhone: row.customers?.phone_number ?? null,
    itemName: row.items?.name ?? 'Item',
    itemPhoto: row.items?.photos?.[0] ?? null,
    unitSize: row.item_units?.size ?? null,
    pickup: row.pickup_date,
    ret: row.return_date,
    cleaningDays: row.cleaning_buffer_days,
    days,
    fulfillment: row.fulfillment_type as FulfillmentType,
    fittingAt: row.fitting_at,
    fittingStatus: row.fitting_status,
    rejectionReason: row.rejection_reason,
    rentalFee: q.rentalFee,
    deposit: q.deposit,
    createdAt: row.created_at,
  };
}

/**
 * Every booking, newest first. Ordered so the ones needing a decision surface
 * first: pending, then approved, then everything else.
 */
export async function fetchAdminBookings(): Promise<AdminBooking[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bookings')
    .select(ADMIN_BOOKING_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as Row[]).map(mapAdminBooking);
}

export async function fetchAdminBooking(
  reference: string,
): Promise<AdminBooking | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('bookings')
    .select(ADMIN_BOOKING_SELECT)
    .eq('reference', reference)
    .maybeSingle();
  if (error) throw error;
  return data ? mapAdminBooking(data as unknown as Row) : null;
}

/**
 * The transitions the shop can make from this screen.
 *
 * Returns are handled by their own flow (they also set the cleaning window), so
 * they are deliberately absent here — this screen decides whether a booking
 * happens, not what state the garment came back in.
 */
export type AdminAction = 'approve' | 'reject' | 'cancel' | 'mark_picked_up';

const TRANSITIONS: Record<AdminAction, AdminBookingStatus> = {
  approve: 'approved',
  reject: 'rejected',
  cancel: 'cancelled',
  mark_picked_up: 'picked_up',
};

/** Which actions are legal from a given state — drives which buttons render. */
export function actionsFor(status: AdminBookingStatus): AdminAction[] {
  switch (status) {
    case 'hold':
    case 'pending':
      return ['approve', 'reject'];
    case 'approved':
      return ['mark_picked_up', 'cancel'];
    default:
      return [];
  }
}

export async function updateBookingStatus(input: {
  reference: string;
  action: AdminAction;
  /** Required when rejecting — it becomes customer-facing text. */
  reason?: string;
}): Promise<void> {
  const db = requireDb();
  const status = TRANSITIONS[input.action];

  if (input.action === 'reject' && !input.reason?.trim()) {
    throw new Error('Add a reason so the customer knows why.');
  }

  const patch: Record<string, unknown> = { status };
  if (input.action === 'reject') patch.rejection_reason = input.reason!.trim();
  // Approving clears any hold: the slot is the shop's decision now, not a timer.
  if (input.action === 'approve') patch.hold_expires_at = null;

  const { error } = await db
    .from('bookings')
    .update(patch)
    .eq('reference', input.reference);
  if (error) throw error;
}

/**
 * Take an item back.
 *
 * Sets the booking to `completed`: the transaction with the customer is finished
 * at the counter, and the cleaning days are already blocked by the booking's
 * `blocked_range`, so nothing further has to hold them. The `returned` status is
 * left unused in v1 — it exists for the richer cleaning queue in v2.
 *
 * A garment flagged as needing attention also marks its physical unit `damaged`,
 * which takes that copy out of `item_day_states` until someone clears it. This is
 * the minimum honest version of damage handling; photographs and costs are v2.
 */
export async function markReturned(input: {
  reference: string;
  needsAttention: boolean;
}): Promise<void> {
  const db = requireDb();

  const { data: row, error: readError } = await db
    .from('bookings')
    .select('unit_id')
    .eq('reference', input.reference)
    .single();
  if (readError) throw readError;

  const { error } = await db
    .from('bookings')
    .update({ status: 'completed' })
    .eq('reference', input.reference);
  if (error) throw error;

  if (input.needsAttention && row?.unit_id) {
    const { error: unitError } = await db
      .from('item_units')
      .update({ status: 'damaged' })
      .eq('id', row.unit_id as string);
    if (unitError) throw unitError;
  }
}

export async function updateFittingStatus(input: {
  reference: string;
  status: 'confirmed' | 'cancelled';
}): Promise<void> {
  const db = requireDb();
  const { error } = await db
    .from('bookings')
    .update({ fitting_status: input.status })
    .eq('reference', input.reference);
  if (error) throw error;
}
