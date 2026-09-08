/**
 * TanStack Query hooks for home content.
 *
 * Long `staleTime`: shop details, hero slides and announcements change a few
 * times a year, so refetching them on every Home visit is wasted work.
 */

import { useQuery } from '@tanstack/react-query';

import { fetchAnnouncements, fetchHomeSlides, fetchShopSettings } from './api';

const HOUR = 60 * 60 * 1000;

export const homeKeys = {
  shop: ['home', 'shop'] as const,
  slides: ['home', 'slides'] as const,
  announcements: ['home', 'announcements'] as const,
};

export function useShopSettings() {
  return useQuery({
    queryKey: homeKeys.shop,
    queryFn: fetchShopSettings,
    staleTime: HOUR,
  });
}

export function useHomeSlides() {
  return useQuery({
    queryKey: homeKeys.slides,
    queryFn: fetchHomeSlides,
    staleTime: HOUR,
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: homeKeys.announcements,
    queryFn: fetchAnnouncements,
    staleTime: HOUR,
  });
}
