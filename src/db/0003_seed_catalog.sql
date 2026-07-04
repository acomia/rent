-- Phase 2 — Catalog seed: 5 categories, 12 items (ported from the restyle mock),
-- and a handful of item_units per item so the design+units model and the size
-- filter have something to bite on.
--
-- Idempotent: categories upsert on their slug pk; items + units only seed when
-- the catalog is empty, so re-running against a populated dev DB is a no-op.
-- Prices are per-day rental rates in PHP. Deposits are indicative dev values.

-- categories -----------------------------------------------------------------
insert into public.categories (slug, name, icon, tint, sort_order) values
  ('gowns',       'Gowns',       'hanger',               'lilac',  1),
  ('costumes',    'Costumes',    'drama-masks',          'blush',  2),
  ('bags',        'Bags',        'bag-personal-outline', 'sky',    3),
  ('shoes',       'Shoes',       'shoe-heel',            'butter', 4),
  ('accessories', 'Accessories', 'necklace',             'lilac',  5)
on conflict (slug) do nothing;

-- items + units --------------------------------------------------------------
do $$
begin
  if exists (select 1 from public.items) then
    return;  -- catalog already seeded; leave it alone
  end if;

  insert into public.items
    (name, brand, category_slug, gender, rental_fee_per_day, deposit,
     cleaning_buffer_days, description, occasion, swatches, icon, tint)
  values
    ('Aurora Ball Gown', 'Michael Cinco', 'gowns', 'women', 2200, 3000, 2,
     'A sweeping tulle ball gown with a hand-beaded bodice. Made for the moment you walk in and the room turns.',
     '{wedding,debut}', '{"#8165CA","#EDE7FA","#1A1523"}', 'hanger', 'lilac'),
    ('Satin Column Gown', 'Mak Tumang', 'gowns', 'women', 1800, 2500, 2,
     'A liquid-satin column cut on the bias. Quiet, confident, and impossibly elegant.',
     '{formal,debut}', '{"#ED5C9D","#FCE0EC","#FDF1AA"}', 'hanger', 'blush'),
    ('Emerald Cape Gown', 'Rajo Laurel', 'gowns', 'women', 2600, 3500, 2,
     'Floor-length with a detachable cape. Drama on the shoulders, ease everywhere else.',
     '{formal,wedding}', '{"#0F766E","#D2EDF6","#1A1523"}', 'hanger', 'sky'),
    ('Masquerade Set', 'Studio Vestido', 'costumes', 'women', 1400, 2000, 2,
     'Full masquerade look — mask, gloves, and a corseted skirt. Everything for the ball, nothing to buy.',
     '{cosplay}', '{"#8165CA","#FDF1AA","#1A1523"}', 'drama-masks', 'blush'),
    ('Barong Tagalog', 'Heritage Line', 'costumes', 'men', 1200, 1500, 2,
     'Hand-embroidered piña barong. The classic Filipino formal, tailored to fit and pressed to perfection.',
     '{formal,wedding}', '{"#FDF1AA","#F7F6FB","#1A1523"}', 'tshirt-crew-outline', 'butter'),
    ('Vintage Flapper', 'Studio Vestido', 'costumes', 'women', 1500, 2000, 2,
     'A fringed 1920s flapper with headpiece. Every step shimmers.',
     '{cosplay}', '{"#ED5C9D","#FDF1AA","#1A1523"}', 'drama-masks', 'sky'),
    ('Crystal Clutch', 'Aranáz', 'bags', 'women', 600, 1000, 1,
     'A crystal-embellished evening clutch that catches every light in the room.',
     '{formal,wedding}', '{"#D2EDF6","#8165CA","#F7F6FB"}', 'bag-personal-outline', 'sky'),
    ('Woven Top Handle', 'Zarah', 'bags', 'women', 500, 800, 1,
     'A structured woven top-handle bag — daytime formal that never tries too hard.',
     '{formal}', '{"#FDF1AA","#1A1523","#F7F6FB"}', 'bag-personal-outline', 'butter'),
    ('Crystal Strap Heels', 'Janylin', 'shoes', 'women', 450, 800, 1,
     'Barely-there crystal straps on a comfortable block heel. Made to last the whole night.',
     '{formal,debut}', '{"#FDF1AA","#EDE7FA","#1A1523"}', 'shoe-heel', 'butter'),
    ('Patent Oxford', 'Bristol', 'shoes', 'men', 400, 700, 1,
     'A high-shine patent oxford. The finishing note on any black-tie look.',
     '{formal}', '{"#1A1523","#D2EDF6","#F7F6FB"}', 'shoe-formal', 'sky'),
    ('Pearl Drop Set', 'Faire', 'accessories', 'women', 350, 500, 1,
     'Matching pearl-drop necklace and earrings. Soft, timeless, and camera-ready.',
     '{wedding,debut}', '{"#EDE7FA","#ED5C9D","#F7F6FB"}', 'necklace', 'lilac'),
    ('Onyx Cufflinks', 'Faire', 'accessories', 'men', 300, 500, 1,
     'Polished onyx cufflinks in a brushed-silver setting. The quiet detail that finishes the suit.',
     '{formal}', '{"#1A1523","#FCE0EC","#F7F6FB"}', 'sunglasses', 'blush');

  -- Units: apparel gets a size run; bags/accessories are one-size. A couple of
  -- non-available statuses so status-aware UI has something to render.
  insert into public.item_units (item_id, size, status)
  select i.id, s.size, s.status
  from public.items i
  join lateral (
    values
      ('Aurora Ball Gown', 'XS', 'available'),
      ('Aurora Ball Gown', 'S',  'available'),
      ('Aurora Ball Gown', 'M',  'available'),
      ('Aurora Ball Gown', 'L',  'under_cleaning'),
      ('Satin Column Gown', 'XS', 'available'),
      ('Satin Column Gown', 'S',  'available'),
      ('Satin Column Gown', 'M',  'reserved'),
      ('Satin Column Gown', 'L',  'available'),
      ('Emerald Cape Gown', 'S',  'available'),
      ('Emerald Cape Gown', 'M',  'available'),
      ('Emerald Cape Gown', 'L',  'available'),
      ('Masquerade Set', 'S', 'available'),
      ('Masquerade Set', 'M', 'available'),
      ('Masquerade Set', 'L', 'available'),
      ('Barong Tagalog', 'S',  'available'),
      ('Barong Tagalog', 'M',  'available'),
      ('Barong Tagalog', 'L',  'available'),
      ('Barong Tagalog', 'XL', 'available'),
      ('Vintage Flapper', 'S', 'available'),
      ('Vintage Flapper', 'M', 'available'),
      ('Vintage Flapper', 'L', 'rented'),
      ('Crystal Clutch', null, 'available'),
      ('Woven Top Handle', null, 'available'),
      ('Crystal Strap Heels', '36', 'available'),
      ('Crystal Strap Heels', '37', 'available'),
      ('Crystal Strap Heels', '38', 'available'),
      ('Crystal Strap Heels', '39', 'available'),
      ('Patent Oxford', '41', 'available'),
      ('Patent Oxford', '42', 'available'),
      ('Patent Oxford', '43', 'available'),
      ('Pearl Drop Set', null, 'available'),
      ('Onyx Cufflinks', null, 'available')
  ) as s(item_name, size, status) on s.item_name = i.name;
end $$;
