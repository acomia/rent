/**
 * Offline fallback catalog. Used only when Supabase isn't configured (no `.env`)
 * so the app still renders a full catalog for demos — mirrors the real data
 * shapes in `types.ts`. Real listings come from Supabase in Phase 2; see
 * `api.ts`. Prices are per-day rental rates in Philippine pesos.
 *
 * `tint` names a pastel surface token (see tailwind.config.js); `icon` is a
 * MaterialCommunityIcons glyph used in place of product photography.
 */

import type { Category, Item } from '@/features/catalog/types';

export { formatPeso } from '@/features/catalog/types';
export type {
  Category,
  CategorySlug,
  Gender,
  Item,
  Tint,
} from '@/features/catalog/types';

export const CATEGORIES: Category[] = [
  { slug: 'gowns', name: 'Gowns', icon: 'hanger', tint: 'lilac', count: 3 },
  {
    slug: 'costumes',
    name: 'Costumes',
    icon: 'drama-masks',
    tint: 'blush',
    count: 3,
  },
  { slug: 'shoes', name: 'Shoes', icon: 'shoe-heel', tint: 'butter', count: 2 },
  {
    slug: 'accessories',
    name: 'Accessories',
    icon: 'necklace',
    tint: 'lilac',
    count: 2,
  },
];

// Shared, dependency-free defaults for the offline fallback. `units` stays empty
// (unit tracking is a real-DB concern); `sizes` gives the detail screen chips.
const APPAREL_SIZES = ['XS', 'S', 'M', 'L'];
const NO_SIZE: string[] = [];

// Curated real product photos for the offline demo. `img` builds a mobile-sized
// Unsplash CDN URL; the same URLs seed the DB (see 0003_seed_catalog.sql), so
// the offline and Supabase paths look identical.
const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop`;

export const PRODUCTS: Item[] = [
  {
    id: 'g1',
    name: 'Aurora Ball Gown',
    designer: 'Michael Cinco',
    category: 'gowns',
    gender: 'women',
    pricePerDay: 2200,
    deposit: 3000,
    cleaningBufferDays: 2,
    tint: 'lilac',
    icon: 'hanger',
    swatches: ['#8165CA', '#EDE7FA', '#1A1523'],
    photos: [
      img('photo-1566174053879-31528523f8ae'),
      img('photo-1490481651871-ab68de25d43d'),
    ],
    occasion: ['wedding', 'debut'],
    units: [],
    sizes: APPAREL_SIZES,
    description:
      'A sweeping tulle ball gown with a hand-beaded bodice. Made for the moment you walk in and the room turns.',
  },
  {
    id: 'g2',
    name: 'Satin Column Gown',
    designer: 'Mak Tumang',
    category: 'gowns',
    gender: 'women',
    pricePerDay: 1800,
    deposit: 2500,
    cleaningBufferDays: 2,
    tint: 'blush',
    icon: 'hanger',
    swatches: ['#ED5C9D', '#FCE0EC', '#FDF1AA'],
    photos: [
      img('photo-1596783074918-c84cb06531ca'),
      img('photo-1515372039744-b8f02a3ae446'),
    ],
    occasion: ['formal', 'debut'],
    units: [],
    sizes: APPAREL_SIZES,
    description:
      'A liquid-satin column cut on the bias. Quiet, confident, and impossibly elegant.',
  },
  {
    id: 'g3',
    name: 'Emerald Cape Gown',
    designer: 'Rajo Laurel',
    category: 'gowns',
    gender: 'women',
    pricePerDay: 2600,
    deposit: 3500,
    cleaningBufferDays: 2,
    tint: 'sky',
    icon: 'hanger',
    swatches: ['#0F766E', '#D2EDF6', '#1A1523'],
    photos: [
      img('photo-1595777457583-95e059d581b8'),
      img('photo-1519741497674-611481863552'),
    ],
    occasion: ['formal', 'wedding'],
    units: [],
    sizes: ['S', 'M', 'L'],
    description:
      'Floor-length with a detachable cape. Drama on the shoulders, ease everywhere else.',
  },
  {
    id: 'c1',
    name: 'Masquerade Set',
    designer: 'Studio Vestido',
    category: 'costumes',
    gender: 'women',
    pricePerDay: 1400,
    deposit: 2000,
    cleaningBufferDays: 2,
    tint: 'blush',
    icon: 'drama-masks',
    swatches: ['#8165CA', '#FDF1AA', '#1A1523'],
    photos: [
      img('photo-1469334031218-e382a71b716b'),
      img('photo-1566174053879-31528523f8ae'),
    ],
    occasion: ['cosplay'],
    units: [],
    sizes: ['S', 'M', 'L'],
    description:
      'Full masquerade look — mask, gloves, and a corseted skirt. Everything for the ball, nothing to buy.',
  },
  {
    id: 'c2',
    name: 'Barong Tagalog',
    designer: 'Heritage Line',
    category: 'costumes',
    gender: 'men',
    pricePerDay: 1200,
    deposit: 1500,
    cleaningBufferDays: 2,
    tint: 'butter',
    icon: 'tshirt-crew-outline',
    swatches: ['#FDF1AA', '#F7F6FB', '#1A1523'],
    photos: [
      img('photo-1602810318383-e386cc2a3ccf'),
      img('photo-1594938298603-c8148c4dae35'),
    ],
    occasion: ['formal', 'wedding'],
    units: [],
    sizes: ['S', 'M', 'L', 'XL'],
    description:
      'Hand-embroidered piña barong. The classic Filipino formal, tailored to fit and pressed to perfection.',
  },
  {
    id: 'c3',
    name: 'Vintage Flapper',
    designer: 'Studio Vestido',
    category: 'costumes',
    gender: 'women',
    pricePerDay: 1500,
    deposit: 2000,
    cleaningBufferDays: 2,
    tint: 'sky',
    icon: 'drama-masks',
    swatches: ['#ED5C9D', '#FDF1AA', '#1A1523'],
    photos: [
      img('photo-1469334031218-e382a71b716b'),
      img('photo-1515372039744-b8f02a3ae446'),
    ],
    occasion: ['cosplay'],
    units: [],
    sizes: ['S', 'M', 'L'],
    description: 'A fringed 1920s flapper with headpiece. Every step shimmers.',
  },
  {
    id: 's1',
    name: 'Crystal Strap Heels',
    designer: 'Janylin',
    category: 'shoes',
    gender: 'women',
    pricePerDay: 450,
    deposit: 800,
    cleaningBufferDays: 1,
    tint: 'butter',
    icon: 'shoe-heel',
    swatches: ['#FDF1AA', '#EDE7FA', '#1A1523'],
    photos: [
      img('photo-1543163521-1bf539c55dd2'),
      img('photo-1596703263926-eb0762ee17e4'),
    ],
    occasion: ['formal', 'debut'],
    units: [],
    sizes: ['36', '37', '38', '39'],
    description:
      'Barely-there crystal straps on a comfortable block heel. Made to last the whole night.',
  },
  {
    id: 's2',
    name: 'Patent Oxford',
    designer: 'Bristol',
    category: 'shoes',
    gender: 'men',
    pricePerDay: 400,
    deposit: 700,
    cleaningBufferDays: 1,
    tint: 'sky',
    icon: 'shoe-formal',
    swatches: ['#1A1523', '#D2EDF6', '#F7F6FB'],
    photos: [
      img('photo-1449505278894-297fdb3edbc1'),
      img('photo-1560343090-f0409e92791a'),
    ],
    occasion: ['formal'],
    units: [],
    sizes: ['41', '42', '43'],
    description:
      'A high-shine patent oxford. The finishing note on any black-tie look.',
  },
  {
    id: 'a1',
    name: 'Pearl Drop Set',
    designer: 'Faire',
    category: 'accessories',
    gender: 'women',
    pricePerDay: 350,
    deposit: 500,
    cleaningBufferDays: 1,
    tint: 'lilac',
    icon: 'necklace',
    swatches: ['#EDE7FA', '#ED5C9D', '#F7F6FB'],
    photos: [
      img('photo-1515562141207-7a88fb7ce338'),
      img('photo-1599643478518-a784e5dc4c8f'),
    ],
    occasion: ['wedding', 'debut'],
    units: [],
    sizes: NO_SIZE,
    description:
      'Matching pearl-drop necklace and earrings. Soft, timeless, and camera-ready.',
  },
  {
    id: 'a2',
    name: 'Onyx Cufflinks',
    designer: 'Faire',
    category: 'accessories',
    gender: 'men',
    pricePerDay: 300,
    deposit: 500,
    cleaningBufferDays: 1,
    tint: 'blush',
    icon: 'sunglasses',
    swatches: ['#1A1523', '#FCE0EC', '#F7F6FB'],
    photos: [
      img('photo-1594938298603-c8148c4dae35'),
      img('photo-1614252369475-531eba835eb1'),
    ],
    occasion: ['formal'],
    units: [],
    sizes: NO_SIZE,
    description:
      'Polished onyx cufflinks in a brushed-silver setting. The quiet detail that finishes the suit.',
  },
];
