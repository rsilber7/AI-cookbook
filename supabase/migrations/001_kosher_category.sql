create type kosher_category as enum ('meat', 'dairy', 'parve');

alter table public.recipes add column kosher_category kosher_category;

alter table public.recipes add constraint has_kosher_category check (
  (dietary_system = 'kosher' and kosher_category is not null) or
  (dietary_system != 'kosher' and kosher_category is null)
);
