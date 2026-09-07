import type { DayKey } from './dates';

/**
 * Booking status and payment state are ORTHOGONAL (project-scope.md #12) and
 * must never be merged into one value or one badge. A booking can be confirmed
 * and still owe money; a completed booking can still hold a deposit.
 */
export type BookingStatus =
  'pending' | 'confirmed' | 'outnow' | 'returned' | 'completed' | 'cancelled';

/** Tracked separately from BookingStatus — never folded into it. */
export type PaymentState =
  'unpaid' | 'deposit_paid' | 'settled' | 'refunded' | 'forfeited';

/** v1 ships shop pickup and in-shop fittings. Delivery is v1.1. */
export type FulfillmentType = 'pickup' | 'fitting';

/** How a single calendar day reads to a customer choosing dates. */
export type DayState =
  'available' | 'unavailable' | 'cleaning' | 'past' | 'selected' | 'endpoint';

/**
 * The money block, always presented in this order so a customer can compare it
 * across screens: rental fee, refundable deposit, what is paid now, and what is
 * owed at the counter.
 */
export type Quote = {
  days: number;
  rentalFee: number;
  /** Refundable — labelled as such every time it is shown. */
  deposit: number;
  /** Paid online to hold the dates. */
  totalNow: number;
  balanceAtPickup: number;
};

export type Booking = {
  /** Customer-facing reference, e.g. 'HRM-00123'. */
  ref: string;
  itemId: string;
  itemName: string;
  itemPhoto: string | null;
  pickup: DayKey;
  ret: DayKey;
  cleaningDays: number;
  fulfillment: FulfillmentType;
  /** ISO datetime of the fitting, if one was booked. Never holds the dates. */
  fittingAt: string | null;
  status: BookingStatus;
  payment: PaymentState;
  quote: Quote;
  paidOnline: number;
};

/** The in-progress booking, filled in screen by screen. */
export type BookingDraft = {
  itemId: string;
  itemName: string;
  itemPhoto: string | null;
  pricePerDay: number;
  deposit: number;
  cleaningDays: number;
  pickup: DayKey | null;
  ret: DayKey | null;
  fulfillment: FulfillmentType | null;
  fittingAt: string | null;
  /** Chosen size, narrowing which physical unit the shop assigns. */
  size: string | null;
};
