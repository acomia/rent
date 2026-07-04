/**
 * TanStack Query hooks for the catalog (Phase 2).
 *
 * Query keys are structured so filter changes refetch precisely and pull-to-
 * refresh (via `refetch`/`isRefetching`) is trivial in the screens.
 */

import { useQuery } from '@tanstack/react-query';

import { fetchCategories, fetchItem, fetchItems } from '@/features/catalog/api';
import type { ItemFilters } from '@/features/catalog/types';

export const catalogKeys = {
  categories: ['catalog', 'categories'] as const,
  items: (filters: ItemFilters) => ['catalog', 'items', filters] as const,
  item: (id: string) => ['catalog', 'item', id] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: fetchCategories,
  });
}

export function useItems(filters: ItemFilters = {}) {
  return useQuery({
    queryKey: catalogKeys.items(filters),
    queryFn: () => fetchItems(filters),
  });
}

export function useItem(id: string | undefined) {
  return useQuery({
    queryKey: catalogKeys.item(id ?? ''),
    queryFn: () => fetchItem(id as string),
    enabled: Boolean(id),
  });
}
