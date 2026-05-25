-- ============================================================
-- Enums
-- ============================================================

create type dietary_system as enum (
  'none', 'kosher', 'halal', 'vegan', 'vegetarian', 'pescatarian'
);

create type recipe_source as enum (
  'ai_generated', 'pasted', 'manual'
);

-- ============================================================
-- users (extends Supabase Auth)
-- ============================================================

create table public.users (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  dietary_system dietary_system not null default 'none',
  allergies    text[] not null default '{}',
  created_at   timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read and update their own profile"
  on public.users
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a user row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- recipes
-- ============================================================

create table public.recipes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users (id) on delete cascade,
  title               text not null,
  description         text,
  ingredients         jsonb not null default '[]',
  steps               jsonb not null default '[]',
  yield_servings      integer,
  prep_time_mins      integer,
  cook_time_mins      integer,
  tags                text[] not null default '{}',
  dietary_system      dietary_system not null default 'none',
  allergies_applied   text[] not null default '{}',
  is_pinned           boolean not null default false,
  source              recipe_source not null default 'ai_generated',
  original_text       text,
  notes               text,
  image_url           text,
  parent_recipe_id    uuid references public.recipes (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.recipes enable row level security;

create policy "Users can manage their own recipes"
  on public.recipes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_updated_at
  before update on public.recipes
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- collections
-- ============================================================

create table public.collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.collections enable row level security;

create policy "Users can manage their own collections"
  on public.collections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- recipe_collections (join table)
-- ============================================================

create table public.recipe_collections (
  recipe_id     uuid not null references public.recipes (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  primary key (recipe_id, collection_id)
);

alter table public.recipe_collections enable row level security;

create policy "Users can manage their own recipe_collections"
  on public.recipe_collections
  for all
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );
