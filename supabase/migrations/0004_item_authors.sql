-- Quién agregó y quién compró cada producto (nombre corto; no hay cuentas de usuario).
alter table list_items
  add column if not exists added_by  text check (added_by is null or char_length(added_by) <= 30),
  add column if not exists bought_by text check (bought_by is null or char_length(bought_by) <= 30);
