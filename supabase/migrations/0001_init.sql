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
