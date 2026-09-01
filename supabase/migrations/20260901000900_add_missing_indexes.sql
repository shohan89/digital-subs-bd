-- Closes four indexing gaps found during a production-performance audit — every other
-- frequently-filtered/sorted column already had a supporting index (see PROJECT_STRUCTURE.md's
-- Performance section for the full audit); these four didn't:

-- `categoriesService.listCategories`/`listCategoriesForAdmin` both filter/sort on `status`
-- (public listings only show `status = 'active'`) with no supporting index — a full table scan on
-- every `/shop`, `/categories`, `/category/[slug]`, homepage, and admin-category-list request.
create index categories_status_idx on public.categories (status);

-- `ordersService.listOrdersForAdmin`/`listRecentOrders` and the `admin_revenue_daily()`/
-- `admin_revenue_monthly()` Postgres functions all sort or range-filter on `created_at` with no
-- supporting index — every admin order list and every revenue-analytics chart was sorting/
-- filtering unindexed.
create index orders_created_at_idx on public.orders (created_at);

-- `paymentsService.listPendingPayments`/`listPaymentsForAdmin` and `admin_dashboard_stats()` all
-- filter `payments.status = 'pending'` with no supporting index.
create index payments_status_idx on public.payments (status);

-- `reviews_product_id_user_id_key` (the composite unique constraint backing "one review per
-- product per customer") only serves `product_id`-led lookups — Postgres can't use a composite
-- index's trailing column (`user_id`) alone. `getUserReviewForProduct` is fine (it filters both
-- columns together), but a `user_id`-only query — "all of this customer's own reviews," a natural
-- future feature — has nothing to use today.
create index reviews_user_id_idx on public.reviews (user_id);
