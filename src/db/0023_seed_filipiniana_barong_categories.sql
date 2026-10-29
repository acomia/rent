-- Catalog seed follow-up — the Filipiniana and Barong & Menswear categories.
--
-- The dev project gained these two through the admin category form, so a fresh
-- database built from 0003 alone was missing them. This brings a new
-- environment up to the same six categories, in the same order.
--
-- Categories are admin-managed data, so every statement here only touches rows
-- still in their 0003 seed state and never overwrites an admin's edit:
--   * the two new slugs insert with `on conflict do nothing`, so a project
--     that already has them (dev) keeps its own name/icon/tint/order;
--   * the original four are renumbered only while they still hold their 0003
--     sort_order, so a catalog an admin has reordered is left alone;
--   * the seeded Barong Tagalog moves out of Costumes only if it is still there.
-- `is distinct from` guards keep a re-run (or a run on dev) from writing no-op
-- updates, which would otherwise each leave a row in admin_audit_log (0007).

-- categories -----------------------------------------------------------------
insert into public.categories (slug, name, icon, tint, sort_order) values
  ('filipiniana', 'Filipiniana',       'flower', 'blush', 2),
  ('barong',      'Barong & Menswear', 'tie',    'sky',   3)
on conflict (slug) do nothing;

update public.categories c
set sort_order = v.new_order
from (values
  ('costumes',    2, 4),
  ('shoes',       3, 5),
  ('accessories', 4, 6)
) as v (slug, seed_order, new_order)
where c.slug = v.slug
  and c.sort_order = v.seed_order
  and c.sort_order is distinct from v.new_order;

-- items ----------------------------------------------------------------------
update public.items
set category_slug = 'barong'
where name = 'Barong Tagalog'
  and category_slug = 'costumes';
