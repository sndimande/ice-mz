-- ICE-MZ: estrutura segura para dados, versões e perfis.
create type public.app_role as enum ('admin','data_manager','validator','analyst','viewer');
create type public.dataset_status as enum ('uploaded','processing','validated','published','rejected');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.datasets (
  id bigint generated always as identity primary key,
  flow text not null check (flow in ('EXP','IMP')),
  reference_year integer not null check (reference_year between 2022 and 2100),
  file_name text not null,
  storage_path text not null unique,
  status public.dataset_status not null default 'uploaded',
  row_count bigint,
  uploaded_by uuid not null references public.profiles(user_id),
  validated_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create table public.index_results (
  id bigint generated always as identity primary key,
  dataset_id bigint not null references public.datasets(id) on delete cascade,
  flow text not null check (flow in ('EXP','IMP','GBL')),
  periodicity text not null check (periodicity in ('monthly','quarterly','semester','annual')),
  year integer not null,
  period integer not null,
  section smallint check (section between 1 and 21),
  index_value numeric(10,2),
  coverage numeric(5,2) check (coverage between 0 and 100),
  published boolean not null default false,
  unique(dataset_id,flow,periodicity,year,period,section)
);
-- Registos integrais: a tabela permanece exposta apenas aos perfis internos por RLS.
-- NUIT e nomes nunca são copiados para os conjuntos públicos.
create table public.trade_records_private (
  id bigint generated always as identity primary key,
  dataset_id bigint not null references public.datasets(id) on delete cascade,
  flow text not null check (flow in ('EXP','IMP')),
  trade_date date not null,
  hs8 text not null,
  hs4 text generated always as (left(hs8,4)) stored,
  quantity numeric,
  unit text,
  value_thousand_usd numeric,
  continent text,
  country text,
  province text,
  trader_nuit text,
  trader_name text,
  source_row bigint,
  created_at timestamptz not null default now()
);
create table public.public_trade_aggregates (
  id bigint generated always as identity primary key,
  dataset_id bigint not null references public.datasets(id) on delete cascade,
  flow text not null check (flow in ('EXP','IMP')),
  year integer not null,
  month smallint check (month between 1 and 12),
  hs_section smallint check (hs_section between 1 and 21),
  continent text,
  country text,
  province text,
  value_thousand_usd numeric not null,
  published boolean not null default false
);
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references public.profiles(user_id),
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.datasets enable row level security;
alter table public.index_results enable row level security;
alter table public.audit_log enable row level security;
alter table public.trade_records_private enable row level security;
alter table public.public_trade_aggregates enable row level security;

create policy "public reads published results" on public.index_results for select to anon, authenticated using (published = true);
create policy "users read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "staff read datasets" on public.datasets for select to authenticated using (exists (select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active));
create policy "managers create datasets" on public.datasets for insert to authenticated with check (uploaded_by=(select auth.uid()) and exists (select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('admin','data_manager')));
create policy "managers update datasets" on public.datasets for update to authenticated using (exists (select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('admin','data_manager','validator'))) with check (exists (select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('admin','data_manager','validator')));
create policy "staff read audit" on public.audit_log for select to authenticated using (exists (select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('admin','validator')));
create policy "authorised staff read private records" on public.trade_records_private for select to authenticated using (exists (select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('admin','data_manager','validator','analyst')));
create policy "managers write private records" on public.trade_records_private for all to authenticated using (exists (select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('admin','data_manager'))) with check (exists (select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('admin','data_manager')));
create policy "public reads anonymised aggregates" on public.public_trade_aggregates for select to anon, authenticated using (published = true);
create policy "staff manage anonymised aggregates" on public.public_trade_aggregates for all to authenticated using (exists (select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('admin','data_manager','validator'))) with check (exists (select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('admin','data_manager','validator')));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('ice-source-files','ice-source-files',false,524288000,array['text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;
create policy "managers upload source files" on storage.objects for insert to authenticated with check (bucket_id='ice-source-files' and exists (select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active and p.role in ('admin','data_manager')));
create policy "staff read source files" on storage.objects for select to authenticated using (bucket_id='ice-source-files' and exists (select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.active));

-- Cria automaticamente o perfil e reserva o primeiro administrador autorizado.
create schema if not exists private;
create or replace function private.handle_new_ice_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, full_name, role, active)
  values (new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when lower(new.email) = 'sergiom.ndimande@gmail.com' then 'admin'::public.app_role else 'viewer'::public.app_role end,
    true)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_ice_user() from public, anon, authenticated;
create trigger on_auth_user_created_ice after insert on auth.users
for each row execute function private.handle_new_ice_user();
