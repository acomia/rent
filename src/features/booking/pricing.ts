import { daysBetween, fromKey, type DayKey } from './dates';
import type { Quote } from './types';

/**
 * v1 pricing is a flat per-day rate (Open Item #2 is still open — weekend tiers
 * and long-rental discounts would add a line here, not change the shape).
 *
 * The deposit is refundable and is paid online to hold the dates; the rental fee
 * is settled in person at pickup. Total charged now is therefore the deposit
 * alone, and the balance at pickup is the rental fee.
 */
export function quote({
  pricePerDay,
  deposit,
  days,
}: {
  pricePerDay: number;
  deposit: number;
  days: number;
}): Quote {
  const rentalFee = pricePerDay * days;
  return {
    days,
    rentalFee,
    deposit,
    totalNow: deposit,
    balanceAtPickup: rentalFee,
  };
}

/**
 * The quote for an in-progress draft.
 *
 * Three reserve screens each derived `days` and called `quote()` themselves, so
 * an inclusive/exclusive change — or any future minimum-rental rule — had to be
 * made in three places, and one of them showing a different total than the next
 * screen is a payment dispute. `days` is inclusive of both endpoints.
 */
export function quoteFromDraft(draft: {
  pricePerDay: number;
  deposit: number;
  pickup: DayKey | null;
  ret: DayKey | null;
}): (Quote & { days: number }) | null {
  if (!draft.pickup || !draft.ret) return null;
  const days = daysBetween(fromKey(draft.pickup), fromKey(draft.ret)) + 1;
  return quote({
    pricePerDay: draft.pricePerDay,
    deposit: draft.deposit,
    days,
  });
}
