import { daysBetween, startOfDay, toKey } from './dates';
import type { DayState } from './types';

/**
 * Offline approximation of a design's calendar.
 *
 * Real availability comes from Postgres — `item_day_states()` computes it across
 * every unit of a design, and the `bookings_no_overlap` exclusion constraint is
 * what actually protects a slot. This file exists only so the app still renders
 * a plausible calendar when Supabase is unconfigured (the same offline-demo
 * pattern as `features/catalog/mock-data.ts`).
 *
 * It is deterministic: the same item always shows the same days, so a demo does
 * not reshuffle between renders.
 */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function dayState(itemId: string, date: Date, today: Date): DayState {
  if (daysBetween(today, date) < 0) return 'past';
  const n = hash(`${itemId}:${toKey(date)}`) % 19;
  if (n === 0 || n === 1) return 'unavailable';
  if (n === 2) return 'cleaning';
  return 'available';
}

/** Today in the device's timezone. The server equivalent is `today_manila()`. */
export function today(): Date {
  return startOfDay(new Date());
}
