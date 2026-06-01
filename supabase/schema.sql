-- PubMoi — Supabase schema v2

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  credits integer not null default 3,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  prompt text not null,
  genre text not null,
  model text not null default 'nano-banana',
  duration integer not null,
  subtitles_style text,
  music_track text,
  script jsonb,
  scenes_videos jsonb not null default '[]',
  final_video_url text,
  thumbnail_url text,
  status text not null default 'pending' check (
    status in ('pending', 'generating', 'completed', 'failed')
  ),
  credits_used integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists generations_user_id_idx on generations(user_id);
create index if not exists generations_created_at_idx on generations(created_at desc);

alter table users enable row level security;
alter table generations enable row level security;

create policy "Users can read own data" on users
  for select using (auth.uid() = id);

create policy "Users can read own generations" on generations
  for select using (auth.uid() = user_id);

create policy "Users can insert own generations" on generations
  for insert with check (auth.uid() = user_id);

create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
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

create index if not exists ads_user_id_idx on ads(user_id);
create index if not exists ads_created_at_idx on ads(created_at desc);

alter table ads enable row level security;

drop policy if exists "users see own ads" on ads;
create policy "users see own ads" on ads
  for all using (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values
  ('product-images', 'product-images', false),
  ('ad-scenes', 'ad-scenes', false),
  ('ad-videos', 'ad-videos', false),
  ('ad-audio', 'ad-audio', false),
  ('ad-finals', 'ad-finals', false)
on conflict (id) do nothing;

drop policy if exists "auth users upload product-images" on storage.objects;
create policy "auth users upload product-images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "auth users read own files" on storage.objects;
create policy "auth users read own files"
  on storage.objects for select
  using (auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "auth users upload ad-assets" on storage.objects;
create policy "auth users upload ad-assets"
  on storage.objects for insert
  with check (
    bucket_id in ('ad-scenes', 'ad-videos', 'ad-audio', 'ad-finals')
    and auth.role() = 'authenticated'
  );
