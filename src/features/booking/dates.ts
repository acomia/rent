/**
 * Date helpers for the booking flow. Everything the customer sees is a plain
 * calendar day in Manila time — never a UTC instant — so dates are carried
 * around as 'YYYY-MM-DD' keys and only turned into Date objects for arithmetic.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** A calendar-day key, e.g. '2025-06-16'. */
export type DayKey = string;

export function toKey(d: Date): DayKey {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(startOfDay(d).getTime() + n * DAY_MS);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS,
  );
}

export function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** 'Jun 16, 2025' */
export function formatDate(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** 'Jun 16' */
export function formatDayMonth(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** 'Jun 16 – Jun 19, 2025' — the year is stated once. */
export function formatRange(a: Date, b: Date): string {
  const year = b.getFullYear();
  return `${formatDayMonth(a)} – ${formatDayMonth(b)}, ${year}`;
}

/** 'June 2025' */
export function formatMonth(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

/** '2:00 PM' */
export function formatTime(d: Date): string {
  const h = d.getHours();
  const m = `${d.getMinutes()}`.padStart(2, '0');
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

/**
 * The grid for one month: six rows of seven, padded with nulls so the first of
 * the month lands on its real weekday.
 */
export function monthMatrix(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();

  const cells: (Date | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}
