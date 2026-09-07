-- Profile screens — the fields the profile UI needs.
-- Apply after 0013_admin_reads_customers.sql.
--
-- Design notes:
--   * All of these live on `customers` rather than in a separate preferences
--     table: they are 1:1 with the customer, always read together with the rest
--     of the profile, and small. A join would buy nothing.
--   * Notification channels are explicit booleans, not a jsonb blob. There are
--     exactly four in v1, each maps to one switch on the Settings screen, and a
--     column can be defaulted and checked. A blob would defer that to the client.
--   * Defaults encode consent honestly: the notifications a customer NEEDS to
--     receive about their own booking default ON; anything promotional defaults
--     OFF. Opt-in is not the customer's chore to undo.
--   * `email` is deliberately NOT made editable by this migration. The column
--     mirrors `auth.users.email`, and changing the real one is an auth operation
--     that re-verifies — see the note in the profile UI.

alter table public.customers
  add column if not exists avatar_url              text,
  add column if not exists date_of_birth           date,
  add column if not exists preferred_language      text not null default 'en',
  -- Email/marketing consent. Distinct from the push channels below.
  add column if not exists marketing_opt_in        boolean not null default false,
  -- Push channels, one per switch on the Settings screen.
  add column if not exists notify_booking_updates  boolean not null default true,
  add column if not exists notify_new_arrivals     boolean not null default true,
  add column if not exists notify_promotions       boolean not null default false,
  add column if not exists notify_tips             boolean not null default false;

alter table public.customers
  drop constraint if exists customers_language_supported;
alter table public.customers
  add constraint customers_language_supported
    check (preferred_language in ('en', 'fil'));

-- A date of birth in the future, or implying an implausible age, is a typo.
alter table public.customers
  drop constraint if exists customers_dob_sane;
alter table public.customers
  add constraint customers_dob_sane
    check (
      date_of_birth is null
      or (date_of_birth > date '1900-01-01' and date_of_birth < current_date)
    );

comment on column public.customers.preferred_language is
  'UI language. Only en/fil — the app is PH-market and single-locale in v1, so '
  'this is stored but not yet honoured by the UI.';
