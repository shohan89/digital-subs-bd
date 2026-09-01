-- Tags `approve_payment()`/`reject_payment()`'s existing notification inserts with the new
-- `type`/`related_id` columns (`20260901000700_add_notification_center.sql`) — same title/message
-- text as before (already shipped and tested), just adding the two columns so these two
-- notifications participate in the same dedup/icon system as every new notification type. Return
-- signatures are unchanged, so `create or replace` is enough — no `drop function` needed.
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
  v_customer_name text;
  v_customer_email text;
  v_product_names text;
begin
  update public.payments
  set status = 'verified'
  where id = p_payment_id and status = 'pending'
  returning order_id into v_order_id;

  if v_order_id is null then
    raise exception 'This payment has already been reviewed or does not exist.';
  end if;

  select user_id, status, customer_name, customer_email
  into v_user_id, v_order_status, v_customer_name, v_customer_email
  from public.orders
  where id = v_order_id;

  if v_user_id is null then
    raise exception 'Order not found for this payment.';
  end if;

  with distinct_products as (
    select distinct oi.product_id, p.duration, p.name
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = v_order_id
  ),
  inserted_subs as (
    insert into public.subscriptions (user_id, product_id, order_id, customer_name, customer_email, status, start_date, expiry_date)
    select v_user_id, product_id, v_order_id, v_customer_name, v_customer_email, 'active', now(),
           now() + make_interval(days => coalesce(duration, 30))
    from distinct_products
    returning id
  )
  insert into public.subscription_activity (subscription_id, actor_id, actor_name, action, note)
  select id, p_actor_id, p_actor_name, 'subscription_created', 'Provisioned automatically after payment verification'
  from inserted_subs;

  select string_agg(p.name, ', ' order by p.name)
  into v_product_names
  from (select distinct oi.product_id from public.order_items oi where oi.order_id = v_order_id) d
  join public.products p on p.id = d.product_id;

  insert into public.order_activity (order_id, actor_id, actor_name, action, note)
  values (v_order_id, p_actor_id, p_actor_name, 'subscription_delivered', v_product_names);

  update public.orders set payment_status = 'paid' where id = v_order_id;

  insert into public.order_activity (order_id, actor_id, actor_name, action, old_status, new_status)
  values (v_order_id, p_actor_id, p_actor_name, 'payment_approved', 'pending', 'verified');

  if v_order_status = 'pending' then
    update public.orders set status = 'processing' where id = v_order_id;
    insert into public.order_activity (order_id, actor_id, actor_name, action, old_status, new_status)
    values (v_order_id, p_actor_id, p_actor_name, 'order_processing', 'pending', 'processing');
    v_order_status := 'processing';
  end if;

  insert into public.notifications (user_id, title, message, read, type, related_id)
  values (
    v_user_id,
    'Payment verified',
    'Your payment for order ' || left(v_order_id::text, 8) || ' has been verified — your subscription is now active.',
    false,
    'payment_approved',
    v_order_id
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

  insert into public.notifications (user_id, title, message, read, type, related_id)
  values (
    v_user_id,
    'Payment rejected',
    case
      when p_reason is not null and p_reason <> '' then
        'Your payment for order ' || left(v_order_id::text, 8) || ' could not be verified: ' || p_reason
      else
        'Your payment for order ' || left(v_order_id::text, 8) || ' could not be verified. Please contact support or submit a new payment.'
    end,
    false,
    'payment_rejected',
    v_order_id
  );

  return query select p_payment_id, v_order_id;
end;
$$;
