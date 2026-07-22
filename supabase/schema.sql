-- ============================================================
-- comeleapi — Schema Supabase PostgreSQL
-- Eseguire nella SQL Editor di Supabase Dashboard
-- ============================================================

-- Tabella prodotti (oli essenziali)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_desc TEXT NOT NULL DEFAULT '',
  benefits TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  visible BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabella lead (richieste dal form contatto)
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  day TEXT NOT NULL DEFAULT '',
  slot TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'archived')),
  read BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'form-frontend',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabella utenti admin
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabella sottoscrizioni push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_order ON products ("order" ASC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- RLS attivo: le tabelle applicative sono accessibili solo dal backend con
-- service_role. Non creare policy permissive per anon o authenticated.
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON products;
DROP POLICY IF EXISTS "service_role_all" ON leads;
DROP POLICY IF EXISTS "service_role_all" ON users;
DROP POLICY IF EXISTS "service_role_all" ON push_subscriptions;

REVOKE ALL ON TABLE products FROM anon, authenticated;
REVOKE ALL ON TABLE leads FROM anon, authenticated;
REVOKE ALL ON TABLE users FROM anon, authenticated;
REVOKE ALL ON TABLE push_subscriptions FROM anon, authenticated;

GRANT ALL ON TABLE products TO service_role;
GRANT ALL ON TABLE leads TO service_role;
GRANT ALL ON TABLE users TO service_role;
GRANT ALL ON TABLE push_subscriptions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE push_subscriptions_id_seq TO service_role;

-- Se e presente l'event trigger opzionale che abilita automaticamente la RLS
-- sulle nuove tabelle, la sua funzione interna non deve essere richiamabile
-- come RPC da ruoli API. La revoca non disattiva l'event trigger.
DO $schema$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE
      'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role';
  END IF;
END
$schema$;

-- ============================================================
-- Storage: creare il bucket 'product-images' dalla dashboard
-- Supabase → Storage → New Bucket:
--   Nome: product-images
--   Public: true (lettura pubblica)
-- ============================================================
