-- ============================================================
-- MIGRATION : Fonctionnalité Kits
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- Table kits
CREATE TABLE kits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL,
  preview_url TEXT NOT NULL DEFAULT '',
  preview_path TEXT NOT NULL DEFAULT '',
  zip_path TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'hidden')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kits_public_read" ON kits FOR SELECT USING (true);
CREATE POLICY "kits_admin_all" ON kits FOR ALL USING (auth.role() = 'service_role');

-- Modifications de la table orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'beat';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kit_id UUID REFERENCES kits(id);
ALTER TABLE orders ALTER COLUMN beat_id DROP NOT NULL;
