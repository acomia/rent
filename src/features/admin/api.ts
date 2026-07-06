/**
 * Admin catalog data access (Phase 3).
 *
 * Unlike the customer catalog (`features/catalog/api.ts`) there is NO mock
 * fallback: every function here writes, and writes require a configured Supabase
 * project + an admin session (RLS enforces `is_admin()`). `requireDb()` throws a
 * clear error when Supabase is absent so screens can surface a setup hint.
 *
 * Row shapes are mapped with the catalog's `mapItem` so the admin and customer
 * sides never diverge; the reverse mapping (form → row) lives here.
 */

import { ITEM_SELECT, mapItem, type ItemRow } from '@/features/catalog/api';
import type { Category, Item } from '@/features/catalog/types';
import { supabase } from '@/lib/supabase';

import type { CategoryFormValues, ItemFormValues } from './schemas';
import type { Admin } from './types';

const BUCKET = 'item-photos';

function requireDb() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_* to .env.',
    );
  }
  return supabase;
}

// --- Admin identity ----------------------------------------------------------

export async function fetchAdmin(userId: string): Promise<Admin | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('admins')
    .select('id,role,created_at')
    .eq('id', userId)
    .maybeSingle();
  // A non-admin simply has no row; the select policy also hides the table from
  // non-admins, so treat any error here as "not an admin" rather than throwing.
  if (error) return null;
  return (data as Admin | null) ?? null;
}

// --- Categories --------------------------------------------------------------

/** Admin category with its item count (for the FK-guard) and sort order. */
export type AdminCategory = Category & { sortOrder: number };

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  const db = requireDb();
  const { data, error } = await db
    .from('categories')
    .select('slug,name,icon,tint,sort_order,items(count)')
    .order('sort_order', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    slug: row.slug as Category['slug'],
    name: row.name,
    icon: row.icon,
    tint: row.tint as Category['tint'],
    count: row.items?.[0]?.count ?? 0,
    sortOrder: row.sort_order ?? 0,
  }));
}

function categoryValuesToRow(v: CategoryFormValues) {
  return {
    slug: v.slug,
    name: v.name,
    icon: v.icon,
    tint: v.tint,
    sort_order: v.sortOrder,
  };
}

export async function createCategory(v: CategoryFormValues): Promise<void> {
  const db = requireDb();
  const { error } = await db.from('categories').insert(categoryValuesToRow(v));
  if (error) throw error;
}

export async function updateCategory(
  slug: string,
  v: CategoryFormValues,
): Promise<void> {
  const db = requireDb();
  // Slug is the PK and is not renamed here (would orphan referencing items).
  const { slug: _slug, ...row } = categoryValuesToRow(v);
  void _slug;
  const { error } = await db.from('categories').update(row).eq('slug', slug);
  if (error) throw error;
}

export async function deleteCategory(slug: string): Promise<void> {
  const db = requireDb();
  // FK-guard: items.category_slug references categories(slug) with no cascade,
  // so a delete would fail at the DB. Pre-check for a friendly message.
  const { count, error: countError } = await db
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('category_slug', slug);
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error(
      `This category still has ${count} item${count === 1 ? '' : 's'}. Move or delete them first.`,
    );
  }
  const { error } = await db.from('categories').delete().eq('slug', slug);
  if (error) throw error;
}

// --- Items -------------------------------------------------------------------

export async function fetchAdminItems(): Promise<Item[]> {
  const db = requireDb();
  // No is_active filter — the admin list shows inactive items too.
  const { data, error } = await db
    .from('items')
    .select(ITEM_SELECT)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data as unknown as ItemRow[]).map(mapItem);
}

function itemValuesToRow(v: ItemFormValues) {
  return {
    name: v.name,
    brand: v.designer ? v.designer : null,
    category_slug: v.category,
    gender: v.gender,
    rental_fee_per_day: v.pricePerDay,
    deposit: v.deposit,
    cleaning_buffer_days: v.cleaningBufferDays,
    description: v.description ? v.description : null,
    occasion: v.occasion,
    swatches: v.swatches,
    photos: v.photos,
    icon: v.icon,
    tint: v.tint,
    is_active: v.isActive,
  };
}

/** Insert an item and its units. Returns the new item id. */
export async function createItem(v: ItemFormValues): Promise<string> {
  const db = requireDb();
  const { data, error } = await db
    .from('items')
    .insert(itemValuesToRow(v))
    .select('id')
    .single();
  if (error) throw error;
  const id = (data as { id: string }).id;

  if (v.units.length > 0) {
    const { error: unitsError } = await db.from('item_units').insert(
      v.units.map((u) => ({
        item_id: id,
        size: u.size ? u.size : null,
        color: u.color ? u.color : null,
        status: u.status,
      })),
    );
    if (unitsError) throw unitsError;
  }
  return id;
}

/**
 * Update an item and reconcile its units:
 *   - units with an id are updated (upsert on PK),
 *   - units without an id are inserted,
 *   - units present in the DB but dropped from the form are deleted.
 * Unit ids are preserved so future booking references (Phase 4) stay stable.
 */
export async function updateItem(id: string, v: ItemFormValues): Promise<void> {
  const db = requireDb();
  const { error } = await db
    .from('items')
    .update(itemValuesToRow(v))
    .eq('id', id);
  if (error) throw error;

  const { data: existing, error: fetchError } = await db
    .from('item_units')
    .select('id')
    .eq('item_id', id);
  if (fetchError) throw fetchError;

  const keptIds = new Set(v.units.filter((u) => u.id).map((u) => u.id));
  const toDelete = (existing ?? [])
    .map((u) => (u as { id: string }).id)
    .filter((existingId) => !keptIds.has(existingId));
  if (toDelete.length > 0) {
    const { error: deleteError } = await db
      .from('item_units')
      .delete()
      .in('id', toDelete);
    if (deleteError) throw deleteError;
  }

  if (v.units.length > 0) {
    const { error: upsertError } = await db.from('item_units').upsert(
      v.units.map((u) => ({
        ...(u.id ? { id: u.id } : {}),
        item_id: id,
        size: u.size ? u.size : null,
        color: u.color ? u.color : null,
        status: u.status,
      })),
    );
    if (upsertError) throw upsertError;
  }
}

export async function deleteItem(
  id: string,
  photoUrls: string[] = [],
): Promise<void> {
  const db = requireDb();
  // Best-effort: drop the item's photo objects before the row (units cascade).
  const paths = photoUrls.map(storagePathFromUrl).filter(Boolean) as string[];
  if (paths.length > 0) {
    await db.storage.from(BUCKET).remove(paths);
  }
  const { error } = await db.from('items').delete().eq('id', id);
  if (error) throw error;
}

// --- Photos ------------------------------------------------------------------

/** Extract the in-bucket object path from a public URL, or null if it doesn't match. */
function storagePathFromUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

/**
 * Upload a locally-picked image to the item-photos bucket and return its public
 * URL. `itemId` groups an item's photos together; new items (no id yet) land
 * under `staged/`. `fetch(uri).arrayBuffer()` is the Expo-supported way to read
 * a local file for upload.
 */
export async function uploadItemPhoto(
  localUri: string,
  contentType: string,
  itemId?: string,
): Promise<string> {
  const db = requireDb();
  const ext = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : 'jpg';
  const uid = `${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`}`;
  const path = `${itemId ?? 'staged'}/${uid}.${ext}`;

  const arrayBuffer = await fetch(localUri).then((res) => res.arrayBuffer());
  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw error;

  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deleteItemPhoto(publicUrl: string): Promise<void> {
  const db = requireDb();
  const path = storagePathFromUrl(publicUrl);
  if (!path) return;
  const { error } = await db.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
