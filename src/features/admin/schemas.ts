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

// --- Home content (0016_home_content.sql) ------------------------------------

/** Optional free text: trimmed, capped, and empty-string means "unset". */
function optionalText(max: number) {
  return z.string().trim().max(max);
}

/**
 * A shop opening/closing time as `HH:MM` text.
 *
 * Deliberately not a native time picker: `@expo/ui`'s is platform-split, and
 * DESIGN.md rules out depending on an iOS-only affordance. Empty means "not
 * set", which Home already renders as nothing (`formatShopTime` is null-safe).
 */
function timeField() {
  return z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
      'Use 24-hour HH:MM, e.g. 10:00 or 19:30',
    );
}

export const shopSettingsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  addressLine: optionalText(160),
  city: optionalText(80),
  pickupLabel: optionalText(40),
  mapUrl: optionalText(500),
  phone: optionalText(40),
  pickupFrom: timeField(),
  pickupTo: timeField(),
});

export type ShopSettingsFormInput = z.input<typeof shopSettingsSchema>;
export type ShopSettingsFormValues = z.output<typeof shopSettingsSchema>;

/**
 * `cta_route` is an in-app Expo Router path, not a URL — the hero button
 * navigates rather than opening a browser. Constrained to a leading slash so a
 * pasted `https://…` fails here instead of silently doing nothing on tap.
 */
export const slideSchema = z.object({
  headline: z.string().trim().min(1, 'Headline is required').max(80),
  subhead: optionalText(160),
  ctaLabel: optionalText(40),
  ctaRoute: optionalText(120).refine(
    (v) => v === '' || v.startsWith('/'),
    'An in-app path starting with “/”, e.g. /categories',
  ),
  imageUrl: optionalText(500),
  sortOrder: countField(),
  isActive: z.boolean(),
});

export type SlideFormInput = z.input<typeof slideSchema>;
export type SlideFormValues = z.output<typeof slideSchema>;

/**
 * `actionUrl` IS an external URL (the seeded announcement opens a maps link),
 * which is why it is validated differently from a slide's `ctaRoute`.
 *
 * The window is stored as nullable ISO timestamps. RLS enforces it, so a
 * scheduled announcement is invisible to customers until it starts — the whole
 * point of the column, per the migration.
 */
export const announcementSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(80),
    body: optionalText(400),
    actionLabel: optionalText(40),
    actionUrl: optionalText(500),
    isActive: z.boolean(),
    startsAt: z.string().nullable(),
    endsAt: z.string().nullable(),
  })
  .refine(
    (v) =>
      !v.startsAt || !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt),
    {
      message: 'The end date must be after the start date',
      path: ['endsAt'],
    },
  )
  .refine((v) => !v.actionUrl || Boolean(v.actionLabel), {
    message:
      'A link needs a button label, or the customer sees no way to open it',
    path: ['actionLabel'],
  });

export type AnnouncementFormInput = z.input<typeof announcementSchema>;
export type AnnouncementFormValues = z.output<typeof announcementSchema>;
