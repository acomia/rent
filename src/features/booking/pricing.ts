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
