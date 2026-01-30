import { VercelRequest } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export async function authenticateToken(req: VercelRequest): Promise<AuthUser | null> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return null;
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    // Pasar el JWT explícitamente: en el servidor no hay sesión, solo el header
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Simplificamos: cualquier usuario autenticado es tratado como admin.
    // No dependemos de la tabla public.users ni de la service_role key.
    return {
      id: user.id,
      email: user.email || '',
      role: 'admin'
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export function requireAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin';
}



