-- Deshabilitar RLS temporalmente para race_times
-- Esto permite que el backend inserte datos sin necesidad de service role key
-- NOTA: Una vez que se configure SUPABASE_SERVICE_ROLE_KEY en Vercel, se puede volver a habilitar RLS
ALTER TABLE race_times DISABLE ROW LEVEL SECURITY;

