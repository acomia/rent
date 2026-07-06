/**
 * Zod schemas + picker option lists for the admin catalog forms (Phase 3).
 *
 * The form values are the source shape; `api.ts` maps them onto DB rows. Native
 * text inputs hand back strings, so numeric fields are modelled as string INPUT
 * that validates and transforms to a number OUTPUT. react-hook-form is typed
 * with both: `…FormInput` (what the fields hold) and `…FormValues` (what
 * `handleSubmit`/`onSubmit` receives). `api.ts` consumes the number output.
 */

import { z } from 'zod';

import { OCCASIONS, type Occasion } from '@/features/catalog/types';

/** A required, non-negative amount typed as text → number (e.g. fees, deposit). */
function amountField() {
  return z
    .string()
    .trim()
    .refine(
      (v) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0,
      'Enter a valid amount (0 or more)',
    )
    .transform(Number);
}

/** An optional, non-negative whole number typed as text → number (empty = 0). */
function countField() {
  return z
    .string()
    .trim()
    .refine(
      (v) =>
        v === '' ||
        (Number.isFinite(Number(v)) &&
          Number(v) >= 0 &&
          Number.isInteger(Number(v))),
      'Whole numbers, 0 or more',
    )
    .transform((v) => (v === '' ? 0 : Number(v)));
}

// --- Option lists (fixed enums; categories are dynamic and fetched) ----------

export const TINTS = ['lilac', 'sky', 'blush', 'butter'] as const;
export const GENDERS = ['women', 'men'] as const;
export const UNIT_STATUSES = [
  'available',
  'reserved',
  'rented',
  'under_cleaning',
  'damaged',
  'unavailable',
] as const;

/** Human labels for the unit status chips. */
export const UNIT_STATUS_LABELS: Record<
  (typeof UNIT_STATUSES)[number],
  string
> = {
  available: 'Available',
  reserved: 'Reserved',
  rented: 'Rented',
  under_cleaning: 'Cleaning',
  damaged: 'Damaged',
  unavailable: 'Unavailable',
};

/**
 * Curated MaterialCommunityIcons glyphs offered in the item/category icon
 * picker. The catalog renders these when an item has no photo, so the set is
 * kept to garments/occasions that read well at the glyph size.
 */
export const ICON_OPTIONS = [
  'tshirt-crew',
  'hanger',
  'shoe-heel',
  'shoe-formal',
  'bag-personal',
  'purse',
  'diamond-stone',
  'crown',
  'party-popper',
  'ring',
  'sunglasses',
  'necklace',
  'hat-fedora',
  'guitar-electric',
] as const;

const occasionEnum = z.enum(OCCASIONS as [Occasion, ...Occasion[]]);

// --- Unit --------------------------------------------------------------------

export const unitSchema = z.object({
  // Present when the unit already exists in the DB; absent for a newly added one.
  id: z.string().optional(),
  size: z.string().trim().max(20),
  color: z.string().trim().max(40),
  status: z.enum(UNIT_STATUSES),
});

export type UnitFormValues = z.infer<typeof unitSchema>;

// --- Item --------------------------------------------------------------------

export const itemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  designer: z.string().trim().max(120),
  category: z.string().min(1, 'Pick a category'),
  gender: z.enum(GENDERS),
  pricePerDay: amountField(),
  deposit: amountField(),
  cleaningBufferDays: countField(),
  description: z.string().trim().max(2000),
  occasion: z.array(occasionEnum),
  swatches: z.array(z.string()),
  photos: z.array(z.string()),
  icon: z.string().trim().min(1, 'Pick an icon'),
  tint: z.enum(TINTS),
  isActive: z.boolean(),
  units: z.array(unitSchema),
});

export type ItemFormInput = z.input<typeof itemSchema>;
export type ItemFormValues = z.output<typeof itemSchema>;

// --- Category ----------------------------------------------------------------

export const categorySchema = z.object({
  // Slug is the primary key; editable only on create (renaming would orphan the
  // items that reference it). The edit form renders it read-only.
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only'),
  name: z.string().trim().min(1, 'Name is required').max(60),
  icon: z.string().trim().min(1, 'Pick an icon'),
  tint: z.enum(TINTS),
  sortOrder: countField(),
});

export type CategoryFormInput = z.input<typeof categorySchema>;
export type CategoryFormValues = z.output<typeof categorySchema>;
