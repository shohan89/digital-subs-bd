-- Seeds the five settings sections `/admin/settings` edits (General/Payment/Delivery/SEO/Social)
-- with the values the app used to have hardcoded in `src/constants/site.ts`, so the live site's
-- behavior doesn't change the moment this ships — an admin can then edit any section from the new
-- page. `on conflict (key) do nothing` makes this safely re-runnable and won't clobber a value an
-- admin has already customized between deploys.
--
-- `settings` itself (table + admin-only RLS) already existed —
-- see `20260828001300_create_settings.sql`. Nothing here is a secret; see
-- `settingsService.getSettings`'s doc comment for why that boundary matters and stays enforced by
-- RLS, not just convention.

insert into public.settings (key, value) values
  ('general', jsonb_build_object(
    'storeName', 'Digital Subs BD',
    'storeDescription', 'Bangladesh''s premium marketplace for digital subscriptions — Netflix, YouTube Premium, Spotify, Canva Pro, ChatGPT Plus, Claude AI, Adobe Creative Cloud, CapCut Pro, Microsoft 365 and more.',
    'supportEmail', 'support@digitalsubsbd.com',
    'supportPhone', '',
    'whatsappNumber', '8801700000000'
  )),
  ('payment', jsonb_build_object(
    'bkashNumber', '01700-000000',
    'nagadNumber', '01700-000000',
    'rocketNumber', '01700-000000-1'
  )),
  ('delivery', jsonb_build_object(
    'defaultDeliveryTime', 'Instant to 30 minutes after payment confirmation',
    'supportHours', '9:00 AM – 11:00 PM, 7 days a week'
  )),
  ('seo', jsonb_build_object(
    'siteTitle', 'Digital Subs BD',
    'metaDescription', 'Buy Netflix, AI Tools, Design Software and Premium Digital Services at the best price in Bangladesh. Instant delivery, secure payment, 24/7 support.',
    'ogImage', '/og.png'
  )),
  ('social', jsonb_build_object(
    'facebook', 'https://facebook.com/digitalsubsbd',
    'instagram', '',
    'youtube', '',
    'whatsapp', 'https://wa.me/8801700000000'
  ))
on conflict (key) do nothing;
