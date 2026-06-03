-- ============================================================
-- PubMoi — Setup Supabase COMPLET et idempotent
-- À exécuter UNE fois dans Supabase → SQL Editor → New query → Run.
-- Sans danger à ré-exécuter (IF NOT EXISTS / upsert de policies).
-- Crée : users (+ colonnes crédits/abonnement), ads, credit_transactions,
-- les buckets de stockage et les politiques RLS.
-- ============================================================

-- ---------- TABLE users (app) ----------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  credits integer not null default 0,
  plan text,
  stripe_customer_id text,
  stripe_subscription_id text,
  credits_reset_at timestamptz,
  created_at timestamptz not null default now()
);

-- Colonnes ajoutées si la table existait déjà (ancienne version)
alter table public.users add column if not exists credits integer not null default 0;
alter table public.users add column if not exists plan text;
alter table public.users add column if not exists stripe_customer_id text;
alter table public.users add column if not exists stripe_subscription_id text;
alter table public.users add column if not exists credits_reset_at timestamptz;

-- IMPORTANT : normaliser la colonne plan héritée d'un ancien schéma où elle
-- était NOT NULL DEFAULT 'free'. Sinon impasse : sans valeur → défaut 'free'
-- (interdit par la contrainte) et plan=null → viole NOT NULL. On rend la
-- colonne nullable, on retire le défaut, et on remplace 'free' par NULL.
alter table public.users alter column plan drop not null;
alter table public.users alter column plan drop default;
update public.users set plan = null where plan = 'free';
alter table public.users alter column credits set default 0;

alter table public.users drop constraint if exists users_plan_check;
alter table public.users
  add constraint users_plan_check
  check (plan is null or plan in ('starter', 'pro', 'business'));

-- ---------- TABLE credit_transactions ----------
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_id_idx
  on public.credit_transactions(user_id);
create index if not exists credit_transactions_created_at_idx
  on public.credit_transactions(created_at desc);

-- ---------- TABLE ads (Mes pubs) ----------
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  hook text,
  cta text,
  product_name text,
  template text,
  script jsonb,
  scenes jsonb,
  final_video_url text,
  final_video_path text,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists ads_user_id_idx on public.ads(user_id);
create index if not exists ads_created_at_idx on public.ads(created_at desc);

-- ---------- RLS ----------
alter table public.users enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.ads enable row level security;

drop policy if exists "Users can read own data" on public.users;
create policy "Users can read own data" on public.users
  for select using (auth.uid() = id);

drop policy if exists "Users read own credit_transactions" on public.credit_transactions;
create policy "Users read own credit_transactions" on public.credit_transactions
  for select using (auth.uid() = user_id);

drop policy if exists "users see own ads" on public.ads;
create policy "users see own ads" on public.ads
  for all using (auth.uid() = user_id);

-- (Le serveur utilise la service role key → bypass RLS pour écrire/lire,
--  et filtre lui-même par user_id. Les policies protègent l'accès client direct.)

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public) values
  ('product-images', 'product-images', false),
  ('ad-scenes', 'ad-scenes', false),
  ('ad-videos', 'ad-videos', false),
  ('ad-audio', 'ad-audio', false),
  ('ad-finals', 'ad-finals', false)
on conflict (id) do nothing;
