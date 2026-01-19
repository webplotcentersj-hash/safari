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
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error || !user) {
      return null;
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      role: userData.role || 'user'
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export function requireAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin';
}

