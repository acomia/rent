/**
 * Admin writes for the editorial home content — shop details, hero slides and
 * announcements (`0016_home_content.sql`).
 *
 * Split by area rather than by layer, the way `bookings-api.ts` is: this has
 * nothing to do with the catalog forms in `api.ts` and would only make that
 * file harder to hold in one piece.
 *
 * Every function here writes, or reads rows a customer is not allowed to see,
 * so all of them call `requireDb()` — there is no meaningful mock for a
 * mutation, and no reason to render an admin screen without a database.
 *
 * The admin reads deliberately do NOT reuse `features/home/api.ts`'s fetchers.
 * Those are scoped by RLS to what a *customer* may see — active slides, and
 * announcements that are live right now — which is precisely the wrong set for
 * an editor. The `*_write_admin` policies are `for all`, and permissive
 * policies OR together, so an admin selecting these tables sees every row
 * including the inactive and the scheduled. Row mapping is still shared.
 */

import { requireDb } from '@/lib/supabase';
import {
  ANNOUNCEMENT_SELECT,
  SHOP_SELECT,
  SLIDE_SELECT,
  mapAnnouncement,
  mapShop,
  mapSlide,
  type Announcement,
  type HomeSlide,
  type ShopSettings,
} from '@/features/home/api';
import type {
  AnnouncementFormValues,
  ShopSettingsFormValues,
  SlideFormValues,
} from './schemas';

/** A slide as the editor sees it: the customer shape plus its ordering flags. */
export type AdminHomeSlide = HomeSlide & {
  sortOrder: number;
  isActive: boolean;
};

/** An announcement plus the window RLS hides from customers. */
export type AdminAnnouncement = Announcement & {
  isActive: boolean;
  /** ISO timestamps, or null for "no bound". */
  startsAt: string | null;
  endsAt: string | null;
};

// --- Shop details ------------------------------------------------------------

export async function fetchAdminShopSettings(): Promise<ShopSettings | null> {
  const db = requireDb();
  const { data, error } = await db
    .from('shop_settings')
    .select(SHOP_SELECT)
    .maybeSingle();
  if (error) throw error;
  return data ? mapShop(data) : null;
}

/**
 * `shop_settings` is a one-row singleton keyed `id = true`, so this is an
 * upsert rather than an update: the row is seeded by the migration, but a
 * project restored without the seed should still be editable rather than
 * silently saving nothing.
 */
export async function saveShopSettings(
  values: ShopSettingsFormValues,
): Promise<void> {
  const db = requireDb();
  const { error } = await db.from('shop_settings').upsert({
    id: true,
    name: values.name,
    address_line: values.addressLine || null,
    city: values.city || null,
    pickup_label: values.pickupLabel || null,
    map_url: values.mapUrl || null,
    phone: values.phone || null,
    pickup_from: values.pickupFrom || null,
    pickup_to: values.pickupTo || null,
  });
  if (error) throw error;
}

// --- Hero slides -------------------------------------------------------------

export async function fetchAdminSlides(): Promise<AdminHomeSlide[]> {
  const db = requireDb();
  const { data, error } = await db
    .from('home_slides')
    .select(`${SLIDE_SELECT},sort_order,is_active`)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...mapSlide(r),
    sortOrder: r.sort_order,
    isActive: r.is_active,
  }));
}

function slideRow(values: SlideFormValues) {
  return {
    headline: values.headline,
    subhead: values.subhead || null,
    cta_label: values.ctaLabel || null,
    cta_route: values.ctaRoute || null,
    image_url: values.imageUrl || null,
    sort_order: values.sortOrder,
    is_active: values.isActive,
  };
}

export async function createSlide(values: SlideFormValues): Promise<void> {
  const db = requireDb();
  const { error } = await db.from('home_slides').insert(slideRow(values));
  if (error) throw error;
}

export async function updateSlide(
  id: string,
  values: SlideFormValues,
): Promise<void> {
  const db = requireDb();
  const { error } = await db
    .from('home_slides')
    .update(slideRow(values))
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSlide(id: string): Promise<void> {
  const db = requireDb();
  const { error } = await db.from('home_slides').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Swap two slides' `sort_order`. Two independent updates, so they go in
 * parallel — but note they are NOT atomic: a failure between them leaves both
 * slides on the same order value, which the list still renders (Postgres just
 * breaks the tie arbitrarily) and which the next swap fixes. Worth a single
 * DB function if reordering ever gets heavier than a shop's three slides.
 */
export async function swapSlideOrder(
  a: { id: string; sortOrder: number },
  b: { id: string; sortOrder: number },
): Promise<void> {
  const db = requireDb();
  const [first, second] = await Promise.all([
    db.from('home_slides').update({ sort_order: b.sortOrder }).eq('id', a.id),
    db.from('home_slides').update({ sort_order: a.sortOrder }).eq('id', b.id),
  ]);
  if (first.error) throw first.error;
  if (second.error) throw second.error;
}

// --- Announcements -----------------------------------------------------------

export async function fetchAdminAnnouncements(): Promise<AdminAnnouncement[]> {
  const db = requireDb();
  const { data, error } = await db
    .from('announcements')
    .select(`${ANNOUNCEMENT_SELECT},is_active,starts_at,ends_at`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...mapAnnouncement(r),
    isActive: r.is_active,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
  }));
}

function announcementRow(values: AnnouncementFormValues) {
  return {
    title: values.title,
    body: values.body || null,
    action_label: values.actionLabel || null,
    action_url: values.actionUrl || null,
    is_active: values.isActive,
    starts_at: values.startsAt,
    ends_at: values.endsAt,
  };
}

export async function createAnnouncement(
  values: AnnouncementFormValues,
): Promise<void> {
  const db = requireDb();
  const { error } = await db
    .from('announcements')
    .insert(announcementRow(values));
  if (error) throw error;
}

export async function updateAnnouncement(
  id: string,
  values: AnnouncementFormValues,
): Promise<void> {
  const db = requireDb();
  const { error } = await db
    .from('announcements')
    .update(announcementRow(values))
    .eq('id', id);
  if (error) throw error;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const db = requireDb();
  const { error } = await db.from('announcements').delete().eq('id', id);
  if (error) throw error;
}
