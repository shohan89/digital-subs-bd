-- Checkout ("Customer information" step) snapshots name/email/phone onto the order itself rather
-- than only reading them off `profiles` at display time: the contact for a given order (e.g. which
-- email a digital subscription should be delivered to) can legitimately differ from the account's
-- own email/profile, and — unlike `profiles` — should stay fixed even if the profile changes later.
--
-- `orders` currently has zero rows (checkout hasn't shipped yet), so these can be added `not null`
-- with no default/backfill step.

alter table public.orders
  add column customer_name text not null,
  add column customer_email text not null,
  add column customer_phone text not null;
