-- Compras de casa: TODAS las migraciones en un solo archivo (se puede ejecutar más de una vez sin problema).

-- ===== supabase/migrations/0001_init.sql =====
-- Compras de casa: esquema inicial.
-- Acceso: SOLO desde el servidor de Next.js (conexión SQL directa). RLS queda activado
-- sin políticas, por lo que la API pública de Supabase (anon/authenticated) no puede leer ni escribir.

create extension if not exists pgcrypto;

create table if not exists households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Mi casa' check (char_length(name) between 1 and 60),
  token_hash  text not null unique,           -- sha256 (hex) del token secreto del enlace
  created_at  timestamptz not null default now()
);

create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 80),
  category      text not null default 'otras',
  unit          text not null default 'u',
  favorite      boolean not null default false,
  use_count     integer not null default 0,
  created_at    timestamptz not null default now()
);
create unique index if not exists products_household_name_uq on products (household_id, lower(name));

create table if not exists list_items (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  name          text not null check (char_length(name) between 1 and 80),
  category      text not null default 'otras',
  quantity      numeric(10,2) not null default 1 check (quantity > 0 and quantity <= 99999),
  unit          text not null default 'u',
  note          text check (note is null or char_length(note) <= 140),
  bought        boolean not null default false,
  bought_at     timestamptz,
  removed_at    timestamptz,                  -- eliminado (se puede restaurar)
  cleared_at    timestamptz,                  -- archivado en el historial al vaciar comprados
  created_at    timestamptz not null default now()
);
create index if not exists list_items_active_idx on list_items (household_id) where cleared_at is null and removed_at is null;
create index if not exists list_items_history_idx on list_items (household_id, cleared_at desc) where cleared_at is not null;

alter table households enable row level security;
alter table products   enable row level security;
alter table list_items enable row level security;
-- Sin políticas a propósito: deniega todo a los roles anon/authenticated.

-- ===== supabase/migrations/0002_product_emoji.sql =====
-- Emoji elegido por el hogar para un producto (null = se deduce del nombre en la app).
alter table products add column if not exists emoji text check (emoji is null or char_length(emoji) <= 16);

-- ===== supabase/migrations/0003_categories_presence.sql =====
-- Categorías propias de cada hogar + indicador "alguien está en el súper".
create table if not exists categories (
  household_id  uuid not null references households(id) on delete cascade,
  id            text not null check (id ~ '^[a-z0-9_]{1,40}$'),
  name          text not null check (char_length(name) between 1 and 30),
  emoji         text check (emoji is null or char_length(emoji) <= 16),
  position      integer not null default 0,
  primary key (household_id, id)
);
alter table categories enable row level security;

-- Hogares existentes: se les cargan las categorías originales.
insert into categories (household_id, id, name, emoji, position)
select h.id, d.id, d.name, d.emoji, d.position
from households h
cross join (values
  ('lacteos','Lácteos','🥛',0), ('carnes','Carnes','🥩',1), ('verduras','Verduras','🥬',2),
  ('frutas','Frutas','🍎',3), ('almacen','Almacén','🍝',4), ('bebidas','Bebidas','🥤',5),
  ('limpieza','Limpieza','🧽',6), ('higiene','Higiene','🧴',7), ('otras','Otras','🛒',8)
) as d(id, name, emoji, position)
on conflict do nothing;

alter table households
  add column if not exists shopping_at     timestamptz,
  add column if not exists shopping_by     text,
  add column if not exists shopping_device text;

-- ===== supabase/migrations/0004_item_authors.sql =====
-- Quién agregó y quién compró cada producto (nombre corto; no hay cuentas de usuario).
alter table list_items
  add column if not exists added_by  text check (added_by is null or char_length(added_by) <= 30),
  add column if not exists bought_by text check (bought_by is null or char_length(bought_by) <= 30);
