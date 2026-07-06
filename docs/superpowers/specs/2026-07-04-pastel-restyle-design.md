# Hiramda — Pastel Restyle (Design Spec)

**Date:** 2026-07-04
**Status:** Approved — implementing
**Reference:** clothing-rental design system (Gilroy type + purple/pink/blue/yellow pastel palette, rounded cards, pill toggles, pastel product tiles)

## Goal

Restyle the existing **Hiramda** app (Expo Router + NativeWind, a gown/costume rental app) to match the reference design system, and build out the catalog screens the reference shows (search, category listing, product detail) as static/mock UI. Keep light **and** dark mode.

## Decisions (confirmed with user)

- **Font:** Poppins (free, OFL) as a Gilroy stand-in — Gilroy is non-redistributable. Loaded via `@expo-google-fonts/poppins` + `expo-font`. Single family across the app, matching the reference.
- **Scope:** Re-theme existing screens **and** build new catalog screens as static/mock UI.
- **Dark mode:** Keep both light and dark; adapt the pastels into a tasteful dark variant.
- **Catalog data:** Invented gown/costume rental listings (not the reference's fashion items).
- **Icons:** `@expo/vector-icons` (Feather/Ionicons) for cross-platform line icons.

## Token system

### Color (Tailwind `theme.extend.colors`)

| Token            | Light     | Role                                          |
| ---------------- | --------- | --------------------------------------------- |
| `grape.DEFAULT`  | `#8165CA` | Primary brand — buttons, active toggle, links |
| `grape.deep`     | `#6B4FB0` | Pressed                                       |
| `grape.soft`     | `#9B85D6` | Dark-mode brand fill                          |
| `bubblegum`      | `#ED5C9D` | Secondary accent — price, hearts, badges      |
| `sky`            | `#D2EDF6` | Pastel surface (tiles)                        |
| `butter`         | `#FDF1AA` | Pastel surface (tiles)                        |
| `lilac`          | `#EDE7FA` | Purple-tint card                              |
| `blush`          | `#FCE0EC` | Pink-tint card                                |
| `ink`            | `#1A1523` | Primary text (warm near-black)                |
| `canvas.DEFAULT` | `#FFFFFF` | Page bg                                       |
| `canvas.subtle`  | `#F7F6FB` | Alt page bg                                   |
| `muted`          | `#8A8698` | Secondary text                                |

Dark surfaces: `night.950 #14121A` (canvas), `night.900 #1E1B26` (surface), `night.800 #29252F` (elevated), `night.700 #38333F` (border), text `#F5F3F8`. Pastel tiles in dark mode render as ~18% color overlays on elevated surfaces.

> Existing `wine/plum/cream/champagne/blush` tokens are replaced by this system. `blush` changes meaning (was a canvas, now a pink card tint) — audit all usages.

### Type — Poppins

- Display headlines (`What item are you looking for?`): 800 / 700
- Titles, buttons: 600
- Body: 500 / 400
- Register as `font-sans` family so existing `font-semibold`/`font-bold` utilities map to Poppins weights.

### Shape

Cards `rounded-3xl` (24px); search bar, pills, toggles fully rounded; oversized outline icons on pastel tiles; generous spacing.

### Signature

Animated **segmented pill toggle** (Women/Men, sliding grape thumb) + **pastel category tiles** (big line icon, label, item count).

## Screens

**Re-theme:** login, signup, verify-otp, forgot-password, terms, privacy, profile; `AuthScreen` shell, `Brandmark`, `Button`, `TextField`.

**New (static/mock):**

- `(app)/index` — Home/Search: greeting, "What item are you looking for?", search bar, Women/Men toggle, category tiles (Gowns, Costumes, Bags, Shoes, Accessories).
- `(app)/category/[slug]` — product grid with Price / Rent filter pills + cart button.
- `(app)/product/[id]` — full-bleed pastel card, image, name, ₱/day, pagination dots, Reserve.

## New components

`SearchBar`, `SegmentedToggle`, `CategoryTile`, `ProductCard`, `FilterPill`, `CartButton` (count badge). Plus a mock data module (`src/features/catalog/mock-data.ts`).

## Non-goals

- No real backend/catalog wiring (Phase 2). Screens use mock data.
- No cart/checkout logic beyond a static badge.
- No auth-flow behavior changes — visual only.
