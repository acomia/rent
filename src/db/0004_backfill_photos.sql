-- Phase 2 — Backfill real item photos onto an already-seeded catalog.
--
-- 0003 only seeds photos when the catalog is empty, so a catalog that was
-- seeded before photos existed still has `photos = '{}'`. This migration sets
-- photos on the existing rows, matched by name. Idempotent: re-running just
-- rewrites the same URLs. Safe to paste into the Supabase SQL editor.
--
-- Photos are curated, hotlink-permitted Unsplash CDN URLs (mobile-sized).

update public.items i
set photos = v.photos
from (values
  ('Aurora Ball Gown', array[
    'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80&auto=format&fit=crop']),
  ('Satin Column Gown', array[
    'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80&auto=format&fit=crop']),
  ('Emerald Cape Gown', array[
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80&auto=format&fit=crop']),
  ('Masquerade Set', array[
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80&auto=format&fit=crop']),
  ('Barong Tagalog', array[
    'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80&auto=format&fit=crop']),
  ('Vintage Flapper', array[
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80&auto=format&fit=crop']),
  ('Crystal Strap Heels', array[
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=800&q=80&auto=format&fit=crop']),
  ('Patent Oxford', array[
    'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&q=80&auto=format&fit=crop']),
  ('Pearl Drop Set', array[
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80&auto=format&fit=crop']),
  ('Onyx Cufflinks', array[
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&q=80&auto=format&fit=crop'])
) as v(name, photos)
where i.name = v.name;
