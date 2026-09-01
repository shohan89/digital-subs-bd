-- Wraps payment approval/rejection in real Postgres transactions instead of a sequence of
-- separate PostgREST round-trips from the app layer (the previous
-- `paymentVerificationService.approvePayment`/`rejectPayment` implementation). A single function
-- call executes as one transaction: if anything inside raises, every write it made so far —
-- payment status, order payment/fulfillment status, subscriptions, activity log, notification —
-- rolls back together. Nothing here is `security definer`: every table this touches (`payments`,
-- `orders`, `order_items`, `products`, `subscriptions`, `order_activity`, `notifications`) already
-- grants full read/write to `is_staff()`, so running as the calling staff member's own
-- session-scoped client (invoker rights, the existing convention for payment-verification admin
-- actions) is both sufficient and safer than bypassing RLS unnecessarily.
--
-- Duplicate-approval prevention is the *first* write, not a separate check-then-act step: the
-- conditional `update ... where status = 'pending' returning order_id` atomically claims the
-- payment (Postgres's row-level locking makes two concurrent callers race safely — exactly one
-- update matches and returns a row) and nothing downstream (subscription provisioning included)
-- runs unless that claim succeeded. The previous implementation's subscription-provisioning loop
-- ran *before* its conditional payment update, so a losing concurrent caller could still create
-- subscriptions before finding out it lost the race; reordering here closes that gap too, not
-- just formalizes the transaction boundary.
--
-- `RETURNS TABLE`'s column names become PL/pgSQL variables visible throughout the function body —
-- naming one `order_id` collided with the *real* `order_id` column on `payments`/`order_items`/
-- `order_activity` (all referenced inside this function), producing a genuine "column reference
-- order_id is ambiguous" error on every call, caught by testing concurrent approval attempts (not
-- by a single happy-path call, which never exercises the `returning order_id into ...` statement
-- that fails first). Fixed by prefixing every output column `out_*`, per the standard PL/pgSQL
-- guidance to never let an OUT parameter/RETURNS TABLE column share a name with a table column
-- referenced in the function body.

-- `create or replace` can't change a function's return-column names, only its body — needed here
-- since this migration file itself was corrected mid-development (see the note above) after the
-- first version had already been applied once with the colliding `order_id` output name.
drop function if exists public.approve_payment(uuid, uuid, text);
drop function if exists public.reject_payment(uuid, uuid, text, text);

create or replace function public.approve_payment(
  p_payment_id uuid,
  p_actor_id uuid,
  p_actor_name text
)
returns table (out_payment_id uuid, out_order_id uuid, out_order_status text)
language plpgsql
volatile
as $$
declare
  v_order_id uuid;
  v_user_id uuid;
  v_order_status text;
  v_product_names text;
begin
  update public.payments
  set status = 'verified'
  where id = p_payment_id and status = 'pending'
  returning order_id into v_order_id;

  if v_order_id is null then
    raise exception 'This payment has already been reviewed or does not exist.';
  end if;

  select user_id, status into v_user_id, v_order_status
  from public.orders
  where id = v_order_id;

  if v_user_id is null then
    raise exception 'Order not found for this payment.';
  end if;

  -- One subscription per distinct product in the order. `products.duration` is nullable
  -- ("variant-priced only" — `order_items` has no `variant_id` to recover the actual variant's
  -- duration from at this point, matching the application layer's own documented gap), so this
  -- falls back to 30 days rather than failing the whole approval outright.
  with distinct_products as (
    select distinct oi.product_id, p.duration, p.name
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = v_order_id
  )
  insert into public.subscriptions (user_id, product_id, status, start_date, expiry_date)
  select v_user_id, product_id, 'active', now(), now() + make_interval(days => coalesce(duration, 30))
  from distinct_products;

  select string_agg(p.name, ', ' order by p.name)
  into v_product_names
  from (select distinct oi.product_id from public.order_items oi where oi.order_id = v_order_id) d
  join public.products p on p.id = d.product_id;

  insert into public.order_activity (order_id, actor_id, actor_name, action, note)
  values (v_order_id, p_actor_id, p_actor_name, 'subscription_delivered', v_product_names);

  update public.orders set payment_status = 'paid' where id = v_order_id;

  insert into public.order_activity (order_id, actor_id, actor_name, action, old_status, new_status)
  values (v_order_id, p_actor_id, p_actor_name, 'payment_approved', 'pending', 'verified');

  -- "Update order status appropriately": a verified payment is what unblocks fulfillment, so a
  -- still-`pending` order advances to `processing` automatically here — matching
  -- `utils/order-status.ts`'s transition table (this is always a valid pending -> processing
  -- move). An order some other path already advanced past `pending` is left untouched rather than
  -- forced backward or double-logged.
  if v_order_status = 'pending' then
    update public.orders set status = 'processing' where id = v_order_id;
    insert into public.order_activity (order_id, actor_id, actor_name, action, old_status, new_status)
    values (v_order_id, p_actor_id, p_actor_name, 'order_processing', 'pending', 'processing');
    v_order_status := 'processing';
  end if;

  insert into public.notifications (user_id, title, message, read)
  values (
    v_user_id,
    'Payment verified',
    'Your payment for order ' || left(v_order_id::text, 8) || ' has been verified — your subscription is now active.',
    false
  );

  return query select p_payment_id, v_order_id, v_order_status;
end;
$$;

create or replace function public.reject_payment(
  p_payment_id uuid,
  p_actor_id uuid,
  p_actor_name text,
  p_reason text default null
)
returns table (out_payment_id uuid, out_order_id uuid)
language plpgsql
volatile
as $$
declare
  v_order_id uuid;
  v_user_id uuid;
begin
  update public.payments
  set status = 'rejected'
  where id = p_payment_id and status = 'pending'
  returning order_id into v_order_id;

  if v_order_id is null then
    raise exception 'This payment has already been reviewed or does not exist.';
  end if;

  select user_id into v_user_id from public.orders where id = v_order_id;

  update public.orders set payment_status = 'failed' where id = v_order_id;

  insert into public.order_activity (order_id, actor_id, actor_name, action, old_status, new_status, note)
  values (v_order_id, p_actor_id, p_actor_name, 'payment_rejected', 'pending', 'rejected', p_reason);

  insert into public.notifications (user_id, title, message, read)
  values (
    v_user_id,
    'Payment rejected',
    case
      when p_reason is not null and p_reason <> '' then
        'Your payment for order ' || left(v_order_id::text, 8) || ' could not be verified: ' || p_reason
      else
        'Your payment for order ' || left(v_order_id::text, 8) || ' could not be verified. Please contact support or submit a new payment.'
    end,
    false
  );

  return query select p_payment_id, v_order_id;
end;
$$;
