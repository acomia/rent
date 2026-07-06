/**
 * TanStack Query hooks for the admin catalog (Phase 3).
 *
 * Mutations invalidate BOTH the admin queries and the customer `catalogKeys`, so
 * an edit made in the admin area is reflected in the shopper-facing catalog on
 * the next read without a manual refresh.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  fetchAdminCategories,
  fetchAdminItems,
  updateCategory,
  updateItem,
} from './api';
import type { CategoryFormValues, ItemFormValues } from './schemas';

export const adminKeys = {
  items: ['admin', 'items'] as const,
  categories: ['admin', 'categories'] as const,
};

/** Invalidate every catalog surface (admin + customer) after a mutation. */
function invalidateCatalog(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: adminKeys.items }),
    client.invalidateQueries({ queryKey: adminKeys.categories }),
    client.invalidateQueries({ queryKey: ['catalog'] }),
  ]);
}

// --- Queries -----------------------------------------------------------------

export function useAdminItems() {
  return useQuery({ queryKey: adminKeys.items, queryFn: fetchAdminItems });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: adminKeys.categories,
    queryFn: fetchAdminCategories,
  });
}

// --- Item mutations ----------------------------------------------------------

export function useCreateItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: ItemFormValues) => createItem(values),
    onSuccess: () => invalidateCatalog(client),
  });
}

export function useUpdateItem(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: ItemFormValues) => updateItem(id, values),
    onSuccess: () => invalidateCatalog(client),
  });
}

export function useDeleteItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, photoUrls }: { id: string; photoUrls?: string[] }) =>
      deleteItem(id, photoUrls),
    onSuccess: () => invalidateCatalog(client),
  });
}

// --- Category mutations ------------------------------------------------------

export function useSaveCategory(mode: 'create' | 'edit') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: CategoryFormValues) =>
      mode === 'create'
        ? createCategory(values)
        : updateCategory(values.slug, values),
    onSuccess: () => invalidateCatalog(client),
  });
}

export function useDeleteCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => deleteCategory(slug),
    onSuccess: () => invalidateCatalog(client),
  });
}
