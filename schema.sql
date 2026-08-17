-- =====================================================================
-- Rota — schema completo
-- Rodar inteiro no SQL Editor do Supabase, uma vez, antes de codar.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- perfis
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  display_name text,
  home_city   text             not null default 'Barcelona',
  home_lat    double precision not null default 41.3874,
  home_lng    double precision not null default 2.1686,
  home_code   text             not null default 'BCN',
  currency    text             not null default 'EUR' check (currency in ('EUR','BRL')),
  fx_brl      numeric(8,4)     not null default 6.1500,
  created_at  timestamptz      not null default now()
);

-- ---------------------------------------------------------------- viagens
create table if not exists public.trips (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users on delete cascade,
  name        text not null,
  emoji       text,
  color       text not null default '#0B5D51',
  start_date  date,
  end_date    date,
  notes       text,
  share_token uuid not null unique default gen_random_uuid(),
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint trips_dates_ok check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists trips_owner_idx on public.trips(owner_id);

-- ---------------------------------------------------------------- cidades
create table if not exists public.places (
  id       uuid primary key default gen_random_uuid(),
  trip_id  uuid not null references public.trips on delete cascade,
  name     text not null,
  country  text,
  code     text,
  lat      double precision not null,
  lng      double precision not null,
  position int not null default 0
);
create index if not exists places_trip_idx on public.places(trip_id);

-- --------------------------------------------------------------- trechos
create table if not exists public.legs (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips on delete cascade,
  from_place_id   uuid references public.places on delete cascade,
  to_place_id     uuid references public.places on delete cascade,
  mode            text not null default 'train'
                  check (mode in ('train','bus','plane','ferry','car','walk')),
  operator        text,
  depart_date     date,
  depart_time     time,
  arrive_time     time,
  arrives_next_day boolean not null default false,
  duration_min    int,
  cost_cents      int not null default 0 check (cost_cents >= 0),
  booking_url     text,
  booking_ref     text,
  status          text not null default 'idea' check (status in ('idea','to_book','booked')),
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists legs_trip_idx on public.legs(trip_id, depart_date, depart_time);

-- ------------------------------------------------------- itens do dia
create table if not exists public.items (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips on delete cascade,
  place_id   uuid references public.places on delete set null,
  day        date not null,
  start_time time,
  category   text not null default 'activity'
             check (category in ('lodging','activity','food','other')),
  title      text not null,
  cost_cents int not null default 0 check (cost_cents >= 0),
  url        text,
  notes      text,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists items_trip_day_idx on public.items(trip_id, day);

-- ------------------------------------------------- compartilhamento
create table if not exists public.trip_members (
  trip_id uuid references public.trips on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role    text not null default 'editor' check (role in ('editor','viewer')),
  added_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.trip_invites (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips on delete cascade,
  email      text not null,
  role       text not null default 'editor' check (role in ('editor','viewer')),
  created_at timestamptz not null default now(),
  unique (trip_id, email)
);

-- =====================================================================
-- Funções de permissão
-- SECURITY DEFINER de propósito: sem isso, uma política em trip_members
-- que consulte trip_members entra em recursão infinita.
-- =====================================================================
create or replace function public.can_edit_trip(t uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from trips where id = t and owner_id = auth.uid())
      or exists (select 1 from trip_members
                  where trip_id = t and user_id = auth.uid() and role = 'editor');
$$;

create or replace function public.can_read_trip(t uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_edit_trip(t)
      or exists (select 1 from trip_members where trip_id = t and user_id = auth.uid());
$$;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles     enable row level security;
alter table public.trips        enable row level security;
alter table public.places       enable row level security;
alter table public.legs         enable row level security;
alter table public.items        enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;

create policy "perfil próprio" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "ler viagens que participo" on public.trips
  for select using (public.can_read_trip(id));
create policy "criar viagem própria" on public.trips
  for insert with check (owner_id = auth.uid());
create policy "editar se tenho permissão" on public.trips
  for update using (public.can_edit_trip(id));
create policy "só o dono apaga" on public.trips
  for delete using (owner_id = auth.uid());

-- places, legs e items seguem a permissão da viagem
do $$
declare tbl text;
begin
  foreach tbl in array array['places','legs','items'] loop
    execute format($f$
      create policy "ler %1$s" on public.%1$I
        for select using (public.can_read_trip(trip_id));
      create policy "escrever %1$s" on public.%1$I
        for insert with check (public.can_edit_trip(trip_id));
      create policy "atualizar %1$s" on public.%1$I
        for update using (public.can_edit_trip(trip_id));
      create policy "apagar %1$s" on public.%1$I
        for delete using (public.can_edit_trip(trip_id));
    $f$, tbl);
  end loop;
end $$;

create policy "ver membros" on public.trip_members
  for select using (public.can_read_trip(trip_id));
create policy "dono gerencia membros" on public.trip_members
  for all using (exists (select 1 from trips where id = trip_id and owner_id = auth.uid()));

create policy "ver convites" on public.trip_invites
  for select using (public.can_edit_trip(trip_id));
create policy "dono gerencia convites" on public.trip_invites
  for all using (exists (select 1 from trips where id = trip_id and owner_id = auth.uid()));

-- =====================================================================
-- Triggers
-- =====================================================================

-- perfil criado no primeiro login, já com Barcelona como base
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;

  -- convites pendentes viram acesso assim que a pessoa se cadastra
  insert into public.trip_members (trip_id, user_id, role)
  select i.trip_id, new.id, i.role from public.trip_invites i
  where lower(i.email) = lower(new.email)
  on conflict do nothing;

  delete from public.trip_invites where lower(email) = lower(new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- dono entra como membro editor da própria viagem
create or replace function public.handle_new_trip()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'editor') on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_trip_created on public.trips;
create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();
