/**
 * Home screen content (shop identity, hero slides, announcements).
 *
 * Read-only and public: a customer sees the hero before signing in, so these
 * fall back to sensible defaults when Supabase is absent rather than erroring
 * (the pattern from `features/catalog/api.ts`). Writes are admin-only and land
 * with the shop-settings admin screen.
 */

import { supabase } from '@/lib/supabase';

export type ShopSettings = {
  name: string;
  addressLine: string | null;
  city: string | null;
  /** Short label used inline, e.g. "Pick up at Makati". */
  pickupLabel: string | null;
  mapUrl: string | null;
  phone: string | null;
  /** The shop's standard pickup window, as 'HH:MM:SS' or null. */
  pickupFrom: string | null;
  pickupTo: string | null;
};

export type HomeSlide = {
  id: string;
  headline: string;
  subhead: string | null;
  ctaLabel: string | null;
  ctaRoute: string | null;
  imageUrl: string | null;
};

export type Announcement = {
  id: string;
  title: string;
  body: string | null;
  actionLabel: string | null;
  actionUrl: string | null;
};

/** Used when Supabase is unconfigured, so the hero is never a blank rectangle. */
const FALLBACK_SHOP: ShopSettings = {
  name: 'Renta',
  addressLine: null,
  city: null,
  pickupLabel: null,
  mapUrl: null,
  phone: null,
  pickupFrom: null,
  pickupTo: null,
};

/**
 * Column lists and row mappers are exported because the admin side reads the
 * same tables with extra columns (`is_active`, `sort_order`, the announcement
 * window). Reusing the mapper keeps one snake_case -> camelCase translation per
 * table, the way `features/admin/api.ts` reuses `mapItem`/`ITEM_SELECT`.
 */
export const SHOP_SELECT =
  'name,address_line,city,pickup_label,map_url,phone,pickup_from,pickup_to';
export const SLIDE_SELECT = 'id,headline,subhead,cta_label,cta_route,image_url';
export const ANNOUNCEMENT_SELECT = 'id,title,body,action_label,action_url';

type ShopRow = {
  name: string;
  address_line: string | null;
  city: string | null;
  pickup_label: string | null;
  map_url: string | null;
  phone: string | null;
  pickup_from: string | null;
  pickup_to: string | null;
};

export function mapShop(r: ShopRow): ShopSettings {
  return {
    name: r.name,
    addressLine: r.address_line,
    city: r.city,
    pickupLabel: r.pickup_label,
    mapUrl: r.map_url,
    phone: r.phone,
    pickupFrom: r.pickup_from,
    pickupTo: r.pickup_to,
  };
}

type SlideRow = {
  id: string;
  headline: string;
  subhead: string | null;
  cta_label: string | null;
  cta_route: string | null;
  image_url: string | null;
};

export function mapSlide(r: SlideRow): HomeSlide {
  return {
    id: r.id,
    headline: r.headline,
    subhead: r.subhead,
    ctaLabel: r.cta_label,
    ctaRoute: r.cta_route,
    imageUrl: r.image_url,
  };
}

type AnnouncementRow = {
  id: string;
  title: string;
  body: string | null;
  action_label: string | null;
  action_url: string | null;
};

export function mapAnnouncement(r: AnnouncementRow): Announcement {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    actionLabel: r.action_label,
    actionUrl: r.action_url,
  };
}

export async function fetchShopSettings(): Promise<ShopSettings> {
  if (!supabase) return FALLBACK_SHOP;
  const { data, error } = await supabase
    .from('shop_settings')
    .select(SHOP_SELECT)
    .maybeSingle();
  if (error) throw error;
  if (!data) return FALLBACK_SHOP;
  return mapShop(data);
}

export async function fetchHomeSlides(): Promise<HomeSlide[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('home_slides')
    .select(SLIDE_SELECT)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map(mapSlide);
}

/** RLS already filters to announcements that are live right now. */
export async function fetchAnnouncements(): Promise<Announcement[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('announcements')
    .select(ANNOUNCEMENT_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAnnouncement);
}

/** '10:00:00' -> '10:00 AM'. Null-safe so a shop with no hours set renders nothing. */
export function formatShopTime(value: string | null): string | null {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${`${m}`.padStart(2, '0')} ${suffix}`;
}
