-- Schema do app Planilha Integrada — rode no SQL Editor do Supabase.
-- Tabelas prefixadas com corrida_ para NÃO conflitar com outros projetos no mesmo banco.
-- Cria tabelas + Row Level Security (cada usuário vê só os próprios dados).

-- 1) Estado geral (anamnese, etapa, meta de água, chave IA)
create table if not exists corrida_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_data jsonb not null default '{}'::jsonb,
  finished boolean not null default false,
  step int not null default 0,
  water_goal int not null default 2500,
  ai_key text not null default '',
  ai_model text not null default '',
  updated_at timestamptz not null default now()
);

-- 2) Diário alimentar
create table if not exists corrida_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  name text not null,
  qty_label text not null default '',
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists corrida_foods_user_date on corrida_foods (user_id, date desc);

-- 3) Água (1 linha por dia)
create table if not exists corrida_water (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  ml int not null default 0,
  primary key (user_id, date)
);

-- 4) Check-ins de treino
create table if not exists corrida_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  title text not null default '',
  done boolean not null default true,
  distance_km numeric not null default 0,
  time_min numeric not null default 0,
  rpe int not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists corrida_workouts_user_date on corrida_workouts (user_id, date desc);

-- 5) Conversas da aba Dúvidas
create table if not exists corrida_chat (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'model')),
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists corrida_chat_user_created on corrida_chat (user_id, created_at desc);

-- RLS: cada usuário autenticado acessa só o próprio user_id
alter table corrida_state enable row level security;
alter table corrida_foods enable row level security;
alter table corrida_water enable row level security;
alter table corrida_workouts enable row level security;
alter table corrida_chat enable row level security;

drop policy if exists "corrida_own_all" on corrida_state;
create policy "corrida_own_all" on corrida_state for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "corrida_own_all" on corrida_foods;
create policy "corrida_own_all" on corrida_foods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "corrida_own_all" on corrida_water;
create policy "corrida_own_all" on corrida_water for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "corrida_own_all" on corrida_workouts;
create policy "corrida_own_all" on corrida_workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "corrida_own_all" on corrida_chat;
create policy "corrida_own_all" on corrida_chat for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
