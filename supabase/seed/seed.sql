-- Runs as the `postgres` role (via `supabase db reset` / `supabase db seed`), which bypasses
-- RLS — no need to route this through the app's own Server Actions. Re-runnable: every insert is
-- keyed off a unique column (`slug`/`code`/`key`) with `on conflict do nothing`.

insert into public.categories (name, slug, description) values
  ('AI Tools', 'ai-tools', 'AI-powered assistants and productivity tools.'),
  ('Streaming', 'streaming', 'Video and audio streaming subscriptions.'),
  ('Design', 'design', 'Design and creative software subscriptions.'),
  ('Software', 'software', 'Productivity and creative software suites.')
on conflict (slug) do nothing;

insert into public.products (
  category_id, name, slug, description, short_description,
  price, compare_price, duration, features, status
) values
  (
    (select id from public.categories where slug = 'streaming'),
    'Netflix Premium',
    'netflix-premium',
    'Netflix Premium account access with 4K Ultra HD streaming across multiple devices.',
    'Watch on 4 screens at once in stunning 4K Ultra HD.',
    650.00, 800.00, 30,
    '["4K Ultra HD streaming", "Watch on 4 screens at once", "Downloads on up to 6 devices"]'::jsonb,
    'active'
  ),
  (
    (select id from public.categories where slug = 'design'),
    'Canva Pro',
    'canva-pro',
    'Canva Pro account access with premium templates, stock assets, and brand kit tools.',
    'Premium templates, stock photos, and a full brand kit.',
    450.00, 600.00, 30,
    '["100+ million premium stock photos/videos", "Background remover", "Brand kit & custom fonts"]'::jsonb,
    'active'
  ),
  (
    (select id from public.categories where slug = 'ai-tools'),
    'ChatGPT Plus',
    'chatgpt-plus',
    'ChatGPT Plus account access with priority access to the latest models and features.',
    'Priority access to the latest OpenAI models.',
    2200.00, 2500.00, 30,
    '["Access to the latest models", "Faster response times", "Priority access during peak hours"]'::jsonb,
    'active'
  ),
  (
    (select id from public.categories where slug = 'software'),
    'Adobe Creative Cloud',
    'adobe-creative-cloud',
    'Full Adobe Creative Cloud suite access, including Photoshop, Illustrator, and Premiere Pro.',
    'The full Adobe app suite — Photoshop, Illustrator, Premiere Pro, and more.',
    3500.00, 4200.00, 30,
    '["20+ Creative Cloud apps", "100GB cloud storage", "Adobe Fonts included"]'::jsonb,
    'active'
  )
on conflict (slug) do nothing;
