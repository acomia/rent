/**
 * Static demo catalog for the restyle. No backend — real listings arrive in
 * Phase 2. Prices are per-day rental rates in Philippine pesos.
 *
 * `tint` names a pastel surface token (see tailwind.config.js); `icon` is a
 * MaterialCommunityIcons glyph used in place of product photography so the
 * catalog renders fully offline and on-brand.
 */

export type Gender = 'women' | 'men';

export type Tint = 'lilac' | 'sky' | 'blush' | 'butter';

export type CategorySlug =
  'gowns' | 'costumes' | 'bags' | 'shoes' | 'accessories';

export type Category = {
  slug: CategorySlug;
  name: string;
  /** MaterialCommunityIcons glyph name. */
  icon: string;
  tint: Tint;
};

export type Product = {
  id: string;
  name: string;
  designer: string;
  category: CategorySlug;
  gender: Gender;
  /** Rental rate per day, in PHP. */
  pricePerDay: number;
  tint: Tint;
  /** MaterialCommunityIcons glyph name. */
  icon: string;
  /** Hex swatches shown on the product detail. */
  swatches: string[];
  description: string;
};

export const CATEGORIES: Category[] = [
  { slug: 'gowns', name: 'Gowns', icon: 'hanger', tint: 'lilac' },
  { slug: 'costumes', name: 'Costumes', icon: 'drama-masks', tint: 'blush' },
  { slug: 'bags', name: 'Bags', icon: 'bag-personal-outline', tint: 'sky' },
  { slug: 'shoes', name: 'Shoes', icon: 'shoe-heel', tint: 'butter' },
  {
    slug: 'accessories',
    name: 'Accessories',
    icon: 'necklace',
    tint: 'lilac',
  },
];

export const PRODUCTS: Product[] = [
  {
    id: 'g1',
    name: 'Aurora Ball Gown',
    designer: 'Michael Cinco',
    category: 'gowns',
    gender: 'women',
    pricePerDay: 2200,
    tint: 'lilac',
    icon: 'hanger',
    swatches: ['#8165CA', '#EDE7FA', '#1A1523'],
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
    tint: 'blush',
    icon: 'hanger',
    swatches: ['#ED5C9D', '#FCE0EC', '#FDF1AA'],
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
    tint: 'sky',
    icon: 'hanger',
    swatches: ['#0F766E', '#D2EDF6', '#1A1523'],
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
    tint: 'blush',
    icon: 'drama-masks',
    swatches: ['#8165CA', '#FDF1AA', '#1A1523'],
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
    tint: 'butter',
    icon: 'tshirt-crew-outline',
    swatches: ['#FDF1AA', '#F7F6FB', '#1A1523'],
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
    tint: 'sky',
    icon: 'drama-masks',
    swatches: ['#ED5C9D', '#FDF1AA', '#1A1523'],
    description: 'A fringed 1920s flapper with headpiece. Every step shimmers.',
  },
  {
    id: 'b1',
    name: 'Crystal Clutch',
    designer: 'Aranáz',
    category: 'bags',
    gender: 'women',
    pricePerDay: 600,
    tint: 'sky',
    icon: 'bag-personal-outline',
    swatches: ['#D2EDF6', '#8165CA', '#F7F6FB'],
    description:
      'A crystal-embellished evening clutch that catches every light in the room.',
  },
  {
    id: 'b2',
    name: 'Woven Top Handle',
    designer: 'Zarah',
    category: 'bags',
    gender: 'women',
    pricePerDay: 500,
    tint: 'butter',
    icon: 'bag-personal-outline',
    swatches: ['#FDF1AA', '#1A1523', '#F7F6FB'],
    description:
      'A structured woven top-handle bag — daytime formal that never tries too hard.',
  },
  {
    id: 's1',
    name: 'Crystal Strap Heels',
    designer: 'Janylin',
    category: 'shoes',
    gender: 'women',
    pricePerDay: 450,
    tint: 'butter',
    icon: 'shoe-heel',
    swatches: ['#FDF1AA', '#EDE7FA', '#1A1523'],
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
    tint: 'sky',
    icon: 'shoe-formal',
    swatches: ['#1A1523', '#D2EDF6', '#F7F6FB'],
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
    tint: 'lilac',
    icon: 'necklace',
    swatches: ['#EDE7FA', '#ED5C9D', '#F7F6FB'],
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
    tint: 'blush',
    icon: 'sunglasses',
    swatches: ['#1A1523', '#FCE0EC', '#F7F6FB'],
    description:
      'Polished onyx cufflinks in a brushed-silver setting. The quiet detail that finishes the suit.',
  },
];

export function productsByCategory(slug: CategorySlug): Product[] {
  return PRODUCTS.filter((p) => p.category === slug);
}

export function categoryCount(slug: CategorySlug): number {
  return productsByCategory(slug).length;
}

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH')}`;
}
