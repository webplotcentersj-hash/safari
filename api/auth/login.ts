import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAuth } from '../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Autenticar con Supabase
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return res.status(400).json({ error: authError.message || 'Error de autenticación' });
    }

    if (!authData || !authData.user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!authData.session) {
      return res.status(401).json({ error: 'Error al crear la sesión' });
    }

    res.json({
      token: authData.session.access_token,
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        // Simplificamos: cualquier usuario autenticado será tratado como admin.
        role: 'admin'
      }
    });
  } catch (error: any) {
    console.error('Login error (unexpected):', error);
    res.status(500).json({ error: error?.message || 'Error en el servidor' });
  }
}
