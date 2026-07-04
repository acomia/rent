/**
 * Catalog data access (Phase 2).
 *
 * Fetchers read from Supabase when it's configured, and fall back to the static
 * `mock-data.ts` when it isn't (no `.env`) so the app still renders a full
 * catalog for offline demos — the same philosophy as the auth DEV bypass.
 *
 * DB rows are mapped onto the `types.ts` domain shapes here so screens never see
 * snake_case columns (`brand` → `designer`, `rental_fee_per_day` → `pricePerDay`).
 */

import { supabase } from '@/lib/supabase';
import { CATEGORIES, PRODUCTS } from '@/features/catalog/mock-data';
import type {
  Category,
  Item,
  ItemFilters,
  ItemUnit,
} from '@/features/catalog/types';

// Columns selected for an item, with its physical units embedded.
const ITEM_SELECT =
  'id,name,brand,category_slug,gender,rental_fee_per_day,deposit,' +
  'cleaning_buffer_days,description,occasion,swatches,photos,icon,tint,' +
  'item_units(id,size,color,status)';

type UnitRow = {
  id: string;
  size: string | null;
  color: string | null;
  status: ItemUnit['status'];
};

type ItemRow = {
  id: string;
  name: string;
  brand: string | null;
  category_slug: Item['category'];
  gender: Item['gender'];
  rental_fee_per_day: number | string;
  deposit: number | string;
  cleaning_buffer_days: number;
  description: string | null;
  occasion: Item['occasion'] | null;
  swatches: string[] | null;
  photos: string[] | null;
  icon: string;
  tint: Item['tint'];
  item_units: UnitRow[] | null;
};

function mapUnit(row: UnitRow): ItemUnit {
  return {
    id: row.id,
    size: row.size,
    color: row.color,
    status: row.status,
  };
}

function mapItem(row: ItemRow): Item {
  const units = (row.item_units ?? []).map(mapUnit);
  // Distinct sizes that a customer could actually rent right now.
  const sizes = [
    ...new Set(
      units
        .filter((u) => u.status === 'available' && u.size)
        .map((u) => u.size as string),
    ),
  ];
  return {
    id: row.id,
    name: row.name,
    designer: row.brand ?? '',
    category: row.category_slug,
    gender: row.gender,
    pricePerDay: Number(row.rental_fee_per_day),
    deposit: Number(row.deposit),
    cleaningBufferDays: row.cleaning_buffer_days,
    tint: row.tint,
    icon: row.icon,
    swatches: row.swatches ?? [],
    photos: row.photos ?? [],
    occasion: row.occasion ?? [],
    description: row.description ?? '',
    units,
    sizes,
  };
}

// --- Client-side predicates (shared by the mock path + the size post-filter) --

function matchesFilters(item: Item, f: ItemFilters): boolean {
  if (f.category && item.category !== f.category) return false;
  if (f.gender && item.gender !== f.gender) return false;
  if (f.occasion && !item.occasion.includes(f.occasion)) return false;
  if (f.size && !item.sizes.includes(f.size)) return false;
  if (f.minPrice != null && item.pricePerDay < f.minPrice) return false;
  if (f.maxPrice != null && item.pricePerDay > f.maxPrice) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    const hay = `${item.name} ${item.description}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function sortByPrice(items: Item[], sort: ItemFilters['sort']): Item[] {
  if (!sort) return items;
  return [...items].sort((a, b) =>
    sort === 'desc'
      ? b.pricePerDay - a.pricePerDay
      : a.pricePerDay - b.pricePerDay,
  );
}

// --- Public fetchers ---------------------------------------------------------

export async function fetchCategories(): Promise<Category[]> {
  if (!supabase) return CATEGORIES;

  // `items(count)` embeds the number of items per category. It counts all items
  // for now (all seeded items are active); revisit filtering to is_active once
  // the admin availability toggle exists in Phase 3.
  const { data, error } = await supabase
    .from('categories')
    .select('slug,name,icon,tint,items(count)')
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    slug: row.slug as Category['slug'],
    name: row.name,
    icon: row.icon,
    tint: row.tint as Category['tint'],
    count: row.items?.[0]?.count ?? 0,
  }));
}

export async function fetchItems(filters: ItemFilters = {}): Promise<Item[]> {
  if (!supabase) {
    const items = PRODUCTS.filter((p) => matchesFilters(p, filters));
    return sortByPrice(items, filters.sort);
  }

  let query = supabase.from('items').select(ITEM_SELECT).eq('is_active', true);

  if (filters.category) query = query.eq('category_slug', filters.category);
  if (filters.gender) query = query.eq('gender', filters.gender);
  if (filters.occasion) query = query.contains('occasion', [filters.occasion]);
  if (filters.minPrice != null)
    query = query.gte('rental_fee_per_day', filters.minPrice);
  if (filters.maxPrice != null)
    query = query.lte('rental_fee_per_day', filters.maxPrice);
  if (filters.search) {
    const q = filters.search.replace(/[%,()]/g, ' ').trim();
    if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }
  query = query.order('rental_fee_per_day', {
    ascending: filters.sort !== 'desc',
  });

  const { data, error } = await query;
  if (error) throw error;

  // Size lives on units, so it's applied after mapping rather than in SQL.
  let items = (data as unknown as ItemRow[]).map(mapItem);
  if (filters.size)
    items = items.filter((i) => i.sizes.includes(filters.size!));
  return items;
}

export async function fetchItem(id: string): Promise<Item | null> {
  if (!supabase) return PRODUCTS.find((p) => p.id === id) ?? null;

  const { data, error } = await supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapItem(data as unknown as ItemRow) : null;
}
