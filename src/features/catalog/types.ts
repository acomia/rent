/**
 * Canonical catalog domain types (Phase 2).
 *
 * These are the shapes the UI consumes. `api.ts` maps Supabase rows onto them
 * (DB `brand` → `designer`, `rental_fee_per_day` → `pricePerDay`, etc.) and
 * `mock-data.ts` provides the same shapes for the offline fallback. Presentation
 * fields (`tint`, `icon`, `swatches`) ride along so the pastel/glyph look
 * survives until real photos land in Phase 3.
 */

export type Gender = 'women' | 'men';

export type Tint = 'lilac' | 'sky' | 'blush' | 'butter';

export type CategorySlug =
  'gowns' | 'costumes' | 'bags' | 'shoes' | 'accessories';

export type Occasion = 'wedding' | 'debut' | 'formal' | 'cosplay' | 'school';

export const OCCASIONS: Occasion[] = [
  'wedding',
  'debut',
  'formal',
  'cosplay',
  'school',
];

export type UnitStatus =
  | 'available'
  | 'reserved'
  | 'rented'
  | 'under_cleaning'
  | 'damaged'
  | 'unavailable';

export type Category = {
  slug: CategorySlug;
  name: string;
  /** MaterialCommunityIcons glyph name. */
  icon: string;
  tint: Tint;
  /** Active items in this category (from the embedded count query). */
  count: number;
};

export type ItemUnit = {
  id: string;
  size: string | null;
  color: string | null;
  status: UnitStatus;
};

export type Item = {
  id: string;
  name: string;
  /** Designer / brand (DB column `brand`). */
  designer: string;
  category: CategorySlug;
  gender: Gender;
  /** Rental rate per day, in PHP (DB `rental_fee_per_day`). */
  pricePerDay: number;
  /** Refundable deposit, in PHP. */
  deposit: number;
  /** Days blocked after return before re-rental (used by Phase 4). */
  cleaningBufferDays: number;
  tint: Tint;
  /** MaterialCommunityIcons glyph, shown when there are no photos. */
  icon: string;
  /** Hex swatches shown on the product detail. */
  swatches: string[];
  /** Photo URLs; empty in v1 (glyph placeholder). */
  photos: string[];
  occasion: Occasion[];
  description: string;
  /** Physical copies; populated from the DB, empty in the mock fallback. */
  units: ItemUnit[];
  /** Distinct sizes available across units — the size chips on detail + filter. */
  sizes: string[];
};

/** Filters accepted by the catalog listing query. */
export type ItemFilters = {
  category?: CategorySlug;
  gender?: Gender;
  /** Free-text query against name + description. */
  search?: string;
  occasion?: Occasion | null;
  size?: string | null;
  color?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  /** Price sort direction. */
  sort?: 'asc' | 'desc';
};

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH')}`;
}
