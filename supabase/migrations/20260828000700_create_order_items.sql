-- No `variant_id`/`product_name` snapshot in this revision's field list — `price` is the only
-- purchase-time snapshot kept; the line item's product identity is purely via `product_id`.

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  price numeric(10, 2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

create trigger set_order_items_updated_at
  before update on public.order_items
  for each row execute function public.set_updated_at();

alter table public.order_items enable row level security;

-- No direct `user_id` column — ownership is via the parent order. Needed for
-- `ordersService.listOrdersForUser`/`getOrderById`'s nested `items:order_items(*)` select and for
-- `ordersService.createOrder`'s insert to work under the caller's own session-scoped client.
create policy "Order items: view own"
  on public.order_items for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));

create policy "Order items: insert own"
  on public.order_items for insert
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));

create policy "Order items: admin full access"
  on public.order_items for all
  using (public.is_admin())
  with check (public.is_admin());
