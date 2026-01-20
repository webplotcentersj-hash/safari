import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (SUPABASE_URL o SUPABASE_ANON_KEY)');
}

// Para operaciones de backend usamos la service_role si existe,
// y si no, caemos a la anon key (no rompe la función, pero respetará RLS).
const adminKey = supabaseServiceKey || supabaseAnonKey;

// Cliente con service role key para operaciones del backend (bypass RLS cuando esté configurada)
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
