-- =====================================================
-- LÜNABI — Supabase schema (Postgres)
-- Ejecutar en: Supabase Studio → SQL Editor → New query
-- =====================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES — extensión de auth.users (Supabase Auth)
-- ============================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nombre     text not null default 'Usuaria',
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Trigger que crea un profile automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', 'Usuaria')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper is_admin() — usado en RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- BRANDS
-- ============================================================
create table if not exists public.brands (
  id          bigserial primary key,
  nombre      text not null,
  slug        text not null unique,
  logo        text,
  descripcion text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_brands_slug on public.brands(slug);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table if not exists public.products (
  id            bigserial primary key,
  slug          text not null unique,
  nombre        text not null,
  marca         text,                         -- slug de marca (compat con data.js)
  brand_id      bigint references public.brands(id) on delete set null,
  categoria     text not null,
  subcategoria  text,
  tipo_piel     text[] not null default '{}',
  precio        numeric(10,2) not null check (precio >= 0),
  precio_antes  numeric(10,2),
  contenido_valor   numeric(10,2),
  contenido_unidad  text check (contenido_unidad in ('ml','g')),
  imagenes      text[] not null default '{}',
  descripcion   text,
  modo_de_uso   text[] not null default '{}',
  beneficios    text[] not null default '{}',
  mas_vendido   boolean not null default false,
  en_oferta     boolean not null default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_products_categoria on public.products(categoria);
create index if not exists idx_products_marca     on public.products(marca);
create index if not exists idx_products_mas_vend  on public.products(mas_vendido) where mas_vendido;

-- ============================================================
-- HERO SLIDES — carrusel de la home
-- ============================================================
create table if not exists public.hero_slides (
  id           bigserial primary key,
  orden        int not null default 0,
  imagen       text not null,
  titulo       text not null,
  descripcion  text,
  boton_texto  text,
  boton_link   text,
  badge        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- ORDERS
-- ============================================================
do $$ begin
  create type public.order_status as enum ('pendiente','confirmado','enviado','entregado','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.shipment_stage as enum ('confirmado','preparacion','internacional','aduana','nacional','entregado');
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  display_id  text not null unique,  -- ORD-XXXXX
  user_id     uuid references auth.users(id) on delete set null,
  user_email  text not null,
  total       numeric(10,2) not null default 0 check (total >= 0),
  status      public.order_status not null default 'pendiente',
  stage_key   public.shipment_stage,
  wa_key      text check (wa_key in ('local','nacional')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_orders_user on public.orders(user_id);

create table if not exists public.order_items (
  id          bigserial primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  bigint references public.products(id) on delete set null,
  nombre      text not null,
  marca       text,
  imagen      text,
  unit_price  numeric(10,2) not null,
  qty         int not null check (qty > 0)
);
create index if not exists idx_order_items_order on public.order_items(order_id);

-- ============================================================
-- FAVORITES (corazón)
-- ============================================================
create table if not exists public.favorites (
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  bigint not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ============================================================
-- SKINTEST RESULTS
-- ============================================================
create table if not exists public.skintest_results (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  answers     jsonb not null,
  product_ids int[] not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists idx_skintest_user on public.skintest_results(user_id);

-- ============================================================
-- SALES (agregado por producto — alimenta "más vendidos")
-- ============================================================
create table if not exists public.sales (
  product_id  bigint primary key references public.products(id) on delete cascade,
  total_qty   int not null default 0,
  updated_at  timestamptz not null default now()
);

-- RPC público para incrementar ventas desde el cliente
create or replace function public.record_sale(p_product_id bigint, p_qty int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sales (product_id, total_qty, updated_at)
  values (p_product_id, greatest(p_qty, 0), now())
  on conflict (product_id) do update
    set total_qty  = public.sales.total_qty + greatest(excluded.total_qty, 0),
        updated_at = now();
end;
$$;

-- ============================================================
-- SITE SETTINGS (números de WhatsApp, etc.)
-- ============================================================
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
-- Semilla: números de WhatsApp
insert into public.site_settings (key, value) values
  ('wa_numbers', jsonb_build_object(
    'local',    jsonb_build_object('number','51923472925','label','Huancayo y alrededores','hint','Atención directa y delivery local'),
    'nacional', jsonb_build_object('number','51906745624','label','Envíos nacionales',      'hint','Otras regiones del Perú — pedido anticipado')
  ))
on conflict (key) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.brands           enable row level security;
alter table public.products         enable row level security;
alter table public.hero_slides      enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.favorites        enable row level security;
alter table public.skintest_results enable row level security;
alter table public.sales            enable row level security;
alter table public.site_settings    enable row level security;

-- PROFILES
drop policy if exists "profiles_self_or_admin_read" on public.profiles;
create policy "profiles_self_or_admin_read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- BRANDS, PRODUCTS, HERO SLIDES, SITE_SETTINGS → public read, admin write
do $$ declare t text; begin
  foreach t in array array['brands','products','hero_slides','site_settings'] loop
    execute format('drop policy if exists "%s_read_all" on public.%I', t, t);
    execute format('create policy "%s_read_all" on public.%I for select using (true)', t, t);
    execute format('drop policy if exists "%s_admin_write" on public.%I', t, t);
    execute format('create policy "%s_admin_write" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- ORDERS — usuario ve/crea los suyos; admin ve/modifica todo
drop policy if exists "orders_read_own_or_admin" on public.orders;
create policy "orders_read_own_or_admin" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (user_id is null or auth.uid() = user_id);

drop policy if exists "orders_update_own_or_admin" on public.orders;
create policy "orders_update_own_or_admin" on public.orders
  for update using (auth.uid() = user_id or public.is_admin())
           with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_admin" on public.orders
  for delete using (public.is_admin());

-- ORDER_ITEMS — visibilidad a través del parent order
drop policy if exists "order_items_via_order" on public.order_items;
create policy "order_items_via_order" on public.order_items
  for all using (
    exists (select 1 from public.orders o
             where o.id = order_id
               and (o.user_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.orders o
             where o.id = order_id
               and (o.user_id = auth.uid() or o.user_id is null or public.is_admin()))
  );

-- FAVORITES — usuario autenticado CRUD sobre los suyos
drop policy if exists "favorites_self" on public.favorites;
create policy "favorites_self" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SKINTEST — mismo patrón
drop policy if exists "skintest_self" on public.skintest_results;
create policy "skintest_self" on public.skintest_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SALES — público read, escritura SOLO via record_sale() RPC
drop policy if exists "sales_read_all" on public.sales;
create policy "sales_read_all" on public.sales for select using (true);
drop policy if exists "sales_admin_write" on public.sales;
create policy "sales_admin_write" on public.sales for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- VIEWS úiles para el cliente
-- ============================================================
-- Vista "catálogo": productos con campos amigables para el frontend
create or replace view public.v_products as
select
  p.id,
  p.slug,
  p.nombre,
  p.marca,
  p.categoria,
  p.subcategoria,
  p.tipo_piel       as "tipoPiel",
  p.precio,
  p.precio_antes    as "precioAntes",
  p.contenido_valor  as "contenidoValor",
  p.contenido_unidad as "contenidoUnidad",
  p.imagenes,
  p.descripcion,
  p.modo_de_uso     as "modoDeUso",
  p.beneficios,
  p.mas_vendido     as "masVendido",
  p.en_oferta       as "enOferta",
  coalesce(s.total_qty, 0) as ventas
from public.products p
left join public.sales s on s.product_id = p.id
where p.is_active;

grant select on public.v_products to anon, authenticated;
