-- =============================================
-- TOXIC BEATS — Schéma Supabase
-- À exécuter dans Supabase > SQL Editor
-- =============================================

-- Table beats
create table if not exists public.beats (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  genre        text not null,
  bpm          integer not null,
  price        numeric(10,2) not null,
  preview_url  text not null,       -- URL publique de l'extrait (Supabase Storage)
  full_file_path text not null,     -- Chemin dans le bucket "beats" (fichier complet)
  description  text,
  tags         text[],
  created_at   timestamptz default now()
);

-- Table orders
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  beat_id          uuid references public.beats(id) on delete set null,
  beat_title       text not null,   -- Dupliqué pour garder l'info si le beat est supprimé
  buyer_name       text not null,
  buyer_email      text not null,
  amount           numeric(10,2) not null,
  status           text not null default 'pending' check (status in ('pending','paid','cancelled')),
  download_token   text unique,
  token_expires_at timestamptz,
  token_used       boolean not null default false,
  notes            text,
  created_at       timestamptz default now()
);

-- Index pour la recherche par token
create index if not exists orders_token_idx on public.orders(download_token);

-- RLS — désactiver l'accès public direct (tout passe par les API routes avec service key)
alter table public.beats enable row level security;
alter table public.orders enable row level security;

-- Politique : lecture publique des beats (pour afficher le catalogue)
create policy "beats_public_read" on public.beats
  for select using (true);

-- Politique : tout le reste est bloqué côté client
-- (les écritures passent par les API routes avec SUPABASE_SERVICE_ROLE_KEY)

-- =============================================
-- Storage bucket "beats"
-- À créer dans Supabase > Storage > New bucket
-- Nom : beats | Private (pas public)
-- =============================================

-- Table settings (paires clé/valeur pour la config du site)
create table if not exists public.settings (
  key   text primary key,
  value text
);

-- RLS — lecture publique (banner visible par tous), écriture par service key uniquement
alter table public.settings enable row level security;

create policy "settings_public_read" on public.settings
  for select using (true);

-- Colonne image_url sur beats (ajoutée après la création initiale)
alter table public.beats add column if not exists image_url text;

-- =============================================
-- Pour insérer un beat de test :
-- =============================================
-- insert into public.beats (title, genre, bpm, price, preview_url, full_file_path, tags)
-- values (
--   'SHADOW ZONE',
--   'Trap',
--   140,
--   35.00,
--   'https://XXXXXXXX.supabase.co/storage/v1/object/public/previews/shadow-zone-preview.mp3',
--   'shadow-zone-full.mp3',
--   ARRAY['dark', 'drill', 'lourd']
-- );
