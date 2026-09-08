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

export async function fetchShopSettings(): Promise<ShopSettings> {
  if (!supabase) return FALLBACK_SHOP;
  const { data, error } = await supabase
    .from('shop_settings')
    .select(
      'name,address_line,city,pickup_label,map_url,phone,pickup_from,pickup_to',
    )
    .maybeSingle();
  if (error) throw error;
  if (!data) return FALLBACK_SHOP;
  return {
    name: data.name,
    addressLine: data.address_line,
    city: data.city,
    pickupLabel: data.pickup_label,
    mapUrl: data.map_url,
    phone: data.phone,
    pickupFrom: data.pickup_from,
    pickupTo: data.pickup_to,
  };
}

export async function fetchHomeSlides(): Promise<HomeSlide[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('home_slides')
    .select('id,headline,subhead,cta_label,cta_route,image_url')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    headline: r.headline,
    subhead: r.subhead,
    ctaLabel: r.cta_label,
    ctaRoute: r.cta_route,
    imageUrl: r.image_url,
  }));
}

/** RLS already filters to announcements that are live right now. */
export async function fetchAnnouncements(): Promise<Announcement[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('announcements')
    .select('id,title,body,action_label,action_url')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    actionLabel: r.action_label,
    actionUrl: r.action_url,
  }));
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
