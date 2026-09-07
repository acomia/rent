import type { Tint } from '@/features/catalog/mock-data';

/**
 * Shared colour constants for components that can't take Tailwind classes
 * (vector icons, shadows, RefreshControl). Values mirror tailwind.config.js.
 */
export const INK = '#1C1A17';
export const MUTED = '#6F675B';
export const CANVAS = '#F7F3EC';
export const SURFACE = '#FFFDF9';
export const HAIRLINE = '#E5DDD0';
export const BRONZE = '#8A6F45';
export const BRONZE_SOFT = '#E8DCC8';
export const CHARCOAL = '#1C1A17';
export const CLOUD = '#F2EDE4';

/**
 * Photography is the only saturated colour in this design, so the `tint` field
 * that rides along on catalog rows no longer paints anything decorative — every
 * photo panel falls back to the same neutral surface. The type is kept (and the
 * DB column with it) so no migration is needed; it simply stops carrying colour.
 */
export const tintClass: Record<Tint, string> = {
  lilac: 'bg-canvas-subtle',
  sky: 'bg-canvas-subtle',
  blush: 'bg-canvas-subtle',
  butter: 'bg-canvas-subtle',
};

/** Glyph colour used when an item has no photo yet. */
export const tintAccent: Record<Tint, string> = {
  lilac: MUTED,
  sky: MUTED,
  blush: MUTED,
  butter: MUTED,
};
