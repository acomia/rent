import type { Tint } from '@/features/catalog/mock-data';

/** Pastel surface class per tint (light mode). Dark mode overrides to a night surface. */
export const tintClass: Record<Tint, string> = {
  lilac: 'bg-lilac',
  sky: 'bg-sky',
  blush: 'bg-blush',
  butter: 'bg-butter',
};

/** Icon/accent color per tint, used on dark surfaces where the pastel fill drops out. */
export const tintAccent: Record<Tint, string> = {
  lilac: '#9B85D6',
  sky: '#6FBBD6',
  blush: '#ED5C9D',
  butter: '#E3C24A',
};

export const INK = '#1A1523';
export const CLOUD = '#F5F3F8';
export const GRAPE = '#8165CA';
