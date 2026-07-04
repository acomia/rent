-- Phase 2 — Remove the 'bags' category from the catalog.
--
-- The 'bags' category (and its items: Crystal Clutch, Woven Top Handle) was
-- added to the dev DB out-of-band; it was never part of the schema/seed and is
-- not in the CategorySlug type. This drops it so the app's category list matches
-- the code (gowns / costumes / shoes / accessories).
--
-- Order matters: items.category_slug references categories(slug) with no cascade,
-- so items must go first. item_units cascade automatically (on delete cascade).
-- Idempotent: re-running just deletes nothing. Paste into the Supabase SQL editor.

delete from public.items where category_slug = 'bags';
delete from public.categories where slug = 'bags';
