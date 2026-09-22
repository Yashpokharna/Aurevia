-- ============================================================================
-- Aurevia — database schema
--
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is idempotent.
-- ============================================================================

-- ─── Products ───────────────────────────────────────────────────────────────
-- Money is stored in minor units (paise / cents) as integers — never floats.
-- Each currency has its own merchant-set price; nothing is converted at runtime.
create table if not exists public.products (
  id              text primary key default gen_random_uuid()::text,
  slug            text not null unique,
  title           text not null,
  subtitle        text,
  description     text not null default '',
  highlights      text[] not null default '{}',
  -- Ordered list of {id, kind: "image"|"video", url, posterUrl?, alt}.
  -- Embedded rather than a separate table: media is always read with its
  -- product and its order is part of the product's meaning (first = cover).
  media           jsonb not null default '[]'::jsonb,
  price_inr       integer not null check (price_inr >= 0),
  price_usd       integer not null check (price_usd >= 0),
  compare_at_inr  integer check (compare_at_inr >= 0),
  compare_at_usd  integer check (compare_at_usd >= 0),
  -- NULL = always available (made to order); 0 = sold out.
  inventory       integer check (inventory is null or inventory >= 0),
  status          text not null default 'draft' check (status in ('draft', 'published')),
  -- Not modelled as a table yet; filter chips appear once any product has one.
  category        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- The storefront's hot query: published products, newest first, paginated.
create index if not exists products_status_created_idx on public.products (status, created_at desc);
create index if not exists products_category_idx on public.products (category) where category is not null;

-- ─── Orders ─────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id             text primary key,
  -- SET NULL, not CASCADE: deleting a product must never delete sales history.
  product_id     text references public.products (id) on delete set null,
  -- Copied at purchase time so renaming/repricing later can't rewrite history.
  product_title  text not null,
  quantity       integer not null check (quantity > 0),
  currency       text not null check (currency in ('INR', 'USD')),
  amount         integer not null check (amount >= 0),
  gateway        text not null check (gateway in ('razorpay', 'stripe')),
  -- Razorpay order id / Stripe session id: what webhooks identify orders by.
  gateway_ref    text not null unique,
  payment_ref    text,
  status         text not null default 'created' check (status in ('created', 'paid', 'failed', 'refunded')),
  email          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders (created_at desc);

-- ─── updated_at maintenance ─────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- ─── Mark paid + reduce stock, atomically and exactly once ──────────────────
-- Payment can be confirmed by the browser, the success page and the webhook,
-- possibly at the same moment. Locking the order row and checking its status
-- inside one transaction means stock is reduced once, no matter how many
-- confirmations arrive.
create or replace function public.mark_order_paid(p_gateway_ref text, p_payment_ref text)
returns setof public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
begin
  select * into o from public.orders where gateway_ref = p_gateway_ref for update;
  if not found then
    return;
  end if;

  if o.status <> 'paid' then
    update public.products
       set inventory = greatest(inventory - o.quantity, 0)
     where id = o.product_id
       and inventory is not null;

    update public.orders
       set status = 'paid',
           payment_ref = coalesce(p_payment_ref, payment_ref)
     where id = o.id
     returning * into o;
  end if;

  return next o;
end;
$$;

-- ─── Security ───────────────────────────────────────────────────────────────
-- Row Level Security on, with no policies: the public (anon) key can read and
-- write nothing. Only the app's server, using the secret key, has access.
alter table public.products enable row level security;
alter table public.orders enable row level security;

revoke all on function public.mark_order_paid(text, text) from public, anon, authenticated;

-- ─── Media storage ──────────────────────────────────────────────────────────
-- Public bucket: product images and videos are meant to be seen by anyone.
-- Uploads only happen through short-lived signed URLs issued by the server
-- after it checks the admin session, so no insert policy is needed.
-- 50 MB matches the Supabase free-plan per-file cap; raise it on a paid plan.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
