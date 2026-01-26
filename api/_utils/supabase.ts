import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (SUPABASE_URL o SUPABASE_ANON_KEY)');
}

// Para operaciones de backend SIEMPRE debemos usar la service_role key
// Si no está disponible, lanzar error para evitar problemas de RLS
if (!supabaseServiceKey) {
  console.error('⚠️ CRITICAL: SUPABASE_SERVICE_ROLE_KEY no está configurada!');
  console.error('Esto causará errores 401 en operaciones que requieren bypass de RLS');
}

// Cliente con service role key para operaciones del backend (bypass RLS automáticamente)
// Si no hay service key, usar anon key pero esto causará problemas con RLS
const adminKey = supabaseServiceKey || supabaseAnonKey;

export const supabaseAdmin = createClient(supabaseUrl, adminKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente público para autenticación (siempre con anon key)
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
