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
