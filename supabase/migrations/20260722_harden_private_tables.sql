-- Rimuove le policy permissive create dalla configurazione iniziale e impedisce
-- che la funzione interna dell'event trigger RLS sia invocabile via Data API.
-- Eseguire nel progetto Supabase prima del deploy del backend aggiornato.

BEGIN;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.products;
DROP POLICY IF EXISTS "service_role_all" ON public.leads;
DROP POLICY IF EXISTS "service_role_all" ON public.users;
DROP POLICY IF EXISTS "service_role_all" ON public.push_subscriptions;

REVOKE ALL ON TABLE public.products FROM anon, authenticated;
REVOKE ALL ON TABLE public.leads FROM anon, authenticated;
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.push_subscriptions FROM anon, authenticated;

GRANT ALL ON TABLE public.products TO service_role;
GRANT ALL ON TABLE public.leads TO service_role;
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.push_subscriptions_id_seq TO service_role;

-- Alcuni progetti hanno installato l'event trigger opzionale `ensure_rls`, la
-- cui funzione vive in public. PostgreSQL concede EXECUTE a PUBLIC sulle nuove
-- funzioni per impostazione predefinita: l'event trigger non necessita di tale
-- permesso, quindi lo revochiamo senza eliminare ne funzione ne trigger.
DO $migration$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE
      'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role';
  END IF;
END
$migration$;

-- Verifica nella stessa transazione che i sei finding segnalati non possano
-- sopravvivere. Un errore qui annulla l'intera migrazione.
DO $verify$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('products', 'leads', 'users', 'push_subscriptions')
      AND policyname = 'service_role_all'
  ) THEN
    RAISE EXCEPTION 'La policy permissiva service_role_all e ancora presente';
  END IF;

  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    IF has_function_privilege('anon', to_regprocedure('public.rls_auto_enable()'), 'EXECUTE')
       OR has_function_privilege('authenticated', to_regprocedure('public.rls_auto_enable()'), 'EXECUTE')
       OR has_function_privilege('service_role', to_regprocedure('public.rls_auto_enable()'), 'EXECUTE') THEN
      RAISE EXCEPTION 'rls_auto_enable() e ancora eseguibile da un ruolo API';
    END IF;
  END IF;
END
$verify$;

NOTIFY pgrst, 'reload schema';

COMMIT;
