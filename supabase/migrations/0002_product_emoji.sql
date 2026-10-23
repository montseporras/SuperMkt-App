-- Emoji elegido por el hogar para un producto (null = se deduce del nombre en la app).
alter table products add column if not exists emoji text check (emoji is null or char_length(emoji) <= 16);
