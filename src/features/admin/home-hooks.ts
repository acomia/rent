/**
 * TanStack Query hooks for the home-content admin screens.
 *
 * Every mutation invalidates BOTH the admin queries and the customer
 * `homeKeys`, so an edit is reflected on the shopper-facing Home without a
 * manual refresh — the same arrangement `hooks.ts` uses for the catalog. That
 * matters more here than it does for the catalog: home content carries a
 * one-hour `staleTime` precisely because it changes rarely, so without the
 * invalidation an admin would edit the hero and then not see it change.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import {
  createAnnouncement,
  createSlide,
  deleteAnnouncement,
  deleteSlide,
  fetchAdminAnnouncements,
  fetchAdminShopSettings,
  fetchAdminSlides,
  saveShopSettings,
  swapSlideOrder,
  updateAnnouncement,
  updateSlide,
} from './home-api';
import type {
  AnnouncementFormValues,
  ShopSettingsFormValues,
  SlideFormValues,
} from './schemas';

export const adminHomeKeys = {
  shop: ['admin', 'home', 'shop'] as const,
  slides: ['admin', 'home', 'slides'] as const,
  announcements: ['admin', 'home', 'announcements'] as const,
};

/**
 * Invalidate one admin surface plus every customer-facing home query.
 *
 * `['home']` is the shared prefix of every key in `features/home/hooks.ts`
 * (`homeKeys.shop`, `.slides`, `.announcements`), so one call covers all three
 * rather than importing and listing them.
 */
function invalidateHome(client: QueryClient, key: readonly string[]) {
  return Promise.all([
    client.invalidateQueries({ queryKey: key }),
    client.invalidateQueries({ queryKey: ['home'] }),
  ]);
}

// --- Queries -----------------------------------------------------------------

export function useAdminShopSettings() {
  return useQuery({
    queryKey: adminHomeKeys.shop,
    queryFn: fetchAdminShopSettings,
  });
}

export function useAdminSlides() {
  return useQuery({
    queryKey: adminHomeKeys.slides,
    queryFn: fetchAdminSlides,
  });
}

export function useAdminAnnouncements() {
  return useQuery({
    queryKey: adminHomeKeys.announcements,
    queryFn: fetchAdminAnnouncements,
  });
}

// --- Shop details ------------------------------------------------------------

export function useSaveShopSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: ShopSettingsFormValues) => saveShopSettings(values),
    onSuccess: () => invalidateHome(client, adminHomeKeys.shop),
  });
}

// --- Slides ------------------------------------------------------------------

export function useSaveSlide(mode: 'create' | 'edit', id?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: SlideFormValues) =>
      mode === 'create' ? createSlide(values) : updateSlide(id!, values),
    onSuccess: () => invalidateHome(client, adminHomeKeys.slides),
  });
}

export function useDeleteSlide() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSlide(id),
    onSuccess: () => invalidateHome(client, adminHomeKeys.slides),
  });
}

export function useSwapSlideOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      a,
      b,
    }: {
      a: { id: string; sortOrder: number };
      b: { id: string; sortOrder: number };
    }) => swapSlideOrder(a, b),
    onSuccess: () => invalidateHome(client, adminHomeKeys.slides),
  });
}

// --- Announcements -----------------------------------------------------------

export function useSaveAnnouncement(mode: 'create' | 'edit', id?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: AnnouncementFormValues) =>
      mode === 'create'
        ? createAnnouncement(values)
        : updateAnnouncement(id!, values),
    onSuccess: () => invalidateHome(client, adminHomeKeys.announcements),
  });
}

export function useDeleteAnnouncement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => invalidateHome(client, adminHomeKeys.announcements),
  });
}
