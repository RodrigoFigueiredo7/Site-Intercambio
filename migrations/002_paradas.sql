-- =====================================================================
-- Rota — migração 002: a PARADA vira a unidade da viagem
--
-- Rodar inteiro no SQL Editor do Supabase, uma vez, depois do schema.sql.
--
-- O que muda: eu não cadastro "de X para Y". Cadastro "estive em Praga,
-- cheguei dia 6 às 14h, saí dia 9 às 22h". O deslocamento é o intervalo
-- entre a saída de uma parada e a chegada da próxima — derivado, nunca
-- digitado. A ordem da rota vem sempre de arrive_at.
-- =====================================================================

begin;

-- ------------------------------------------------- fora o modelo antigo
-- cascade leva junto as políticas, os índices e as chaves estrangeiras
-- que legs e items mantinham para places.
drop table if exists public.legs cascade;
drop table if exists public.places cascade;

-- --------------------------------------------------------- as paradas
create table public.stops (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips on delete cascade,

  name        text not null,
  region      text,
  country     text,
  code        text,
  lat         double precision not null,
  lng         double precision not null,
  -- Fuso IANA da cidade, resolvido das coordenadas quando a parada nasce.
  -- arrive_at e depart_at são instantes absolutos; a contagem de noites e a
  -- atribuição de um dia do calendário só fazem sentido no fuso da cidade.
  tz          text not null,

  arrive_at   timestamptz not null,
  depart_at   timestamptz not null,

  lodging_name       text,
  lodging_address    text,
  lodging_url        text,
  lodging_cost_cents int not null default 0 check (lodging_cost_cents >= 0),

  notes       text,
  created_at  timestamptz not null default now(),

  constraint stops_janela_ok check (depart_at >= arrive_at)
);

-- A ordem da rota é esta consulta. Não existe coluna de posição.
create index stops_trip_arrive_idx on public.stops(trip_id, arrive_at);

-- ------------------------------------------------ os deslocamentos
-- Derivados: uma leg existe porque duas paradas são consecutivas. O que é
-- meu — meio escolhido, companhia, preço, localizador — sobrevive à
-- reordenação, e é por isso que a leg é desativada em vez de apagada.
create table public.legs (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips on delete cascade,
  from_stop_id uuid not null references public.stops on delete cascade,
  to_stop_id   uuid not null references public.stops on delete cascade,

  suggested_mode text check (suggested_mode in ('train','bus','plane','ferry','car','walk')),
  -- nulo = não mexi, use a sugestão
  mode           text check (mode in ('train','bus','plane','ferry','car','walk')),

  operator     text,
  cost_cents   int not null default 0 check (cost_cents >= 0),
  booking_url  text,
  booking_ref  text,
  status       text not null default 'idea' check (status in ('idea','to_book','booked')),
  notes        text,

  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),

  unique (trip_id, from_stop_id, to_stop_id)
);

create index legs_trip_ativas_idx on public.legs(trip_id) where is_active;

-- ----------------------------------------------- itens apontam para paradas
alter table public.items drop column if exists place_id;
alter table public.items add column if not exists stop_id uuid references public.stops on delete set null;

-- =====================================================================
-- Reconciliação
-- =====================================================================

-- Os pares consecutivos de uma viagem, na ordem das datas.
create or replace function public.consecutive_stop_pairs(t uuid)
returns table (from_id uuid, to_id uuid)
language sql stable security definer set search_path = public as $$
  with ordered as (
    select id, row_number() over (order by arrive_at, id) as n
    from stops
    where trip_id = t
  )
  select a.id, b.id
  from ordered a
  join ordered b on b.n = a.n + 1;
$$;

-- Cria as legs que faltam, reativa as que voltaram a ser consecutivas, e
-- desativa as que deixaram de ser. Nunca apaga: reinserir uma cidade no meio
-- e depois desfazer devolve os dados de reserva intactos.
create or replace function public.reconcile_legs(t uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  -- A viagem some antes das paradas quando ela é apagada em cascata; aí não
  -- há nada a reconciliar, e checar permissão sobre o que não existe falharia.
  if not exists (select 1 from trips where id = t) then
    return;
  end if;

  if not public.can_edit_trip(t) then
    raise exception 'sem permissão para editar esta viagem';
  end if;

  insert into legs (trip_id, from_stop_id, to_stop_id)
  select t, p.from_id, p.to_id
  from public.consecutive_stop_pairs(t) p
  on conflict (trip_id, from_stop_id, to_stop_id)
  do update set is_active = true;

  update legs l
  set is_active = false
  where l.trip_id = t
    and l.is_active
    and not exists (
      select 1 from public.consecutive_stop_pairs(t) p
      where p.from_id = l.from_stop_id and p.to_id = l.to_stop_id
    );
end $$;

-- Um disparo por comando, não por linha: inserir dez paradas de uma vez
-- reconcilia uma vez só.
create or replace function public.stops_reconcile()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  t uuid;
begin
  for t in select distinct trip_id from changed_stops loop
    perform public.reconcile_legs(t);
  end loop;
  return null;
end $$;

drop trigger if exists stops_reconcile_ins on public.stops;
create trigger stops_reconcile_ins after insert on public.stops
  referencing new table as changed_stops
  for each statement execute function public.stops_reconcile();

drop trigger if exists stops_reconcile_upd on public.stops;
create trigger stops_reconcile_upd after update on public.stops
  referencing new table as changed_stops
  for each statement execute function public.stops_reconcile();

drop trigger if exists stops_reconcile_del on public.stops;
create trigger stops_reconcile_del after delete on public.stops
  referencing old table as changed_stops
  for each statement execute function public.stops_reconcile();

-- =====================================================================
-- RLS — as duas tabelas novas seguem a permissão da viagem
-- =====================================================================
alter table public.stops enable row level security;
alter table public.legs  enable row level security;

do $$
declare tbl text;
begin
  foreach tbl in array array['stops','legs'] loop
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

commit;
