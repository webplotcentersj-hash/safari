import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, supabaseAuth } from '../_utils/supabase';

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

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Obtener el rol del usuario
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ error: 'Usuario no encontrado en la base de datos' });
    }

    if (!authData.session) {
      return res.status(401).json({ error: 'Error al crear la sesión' });
    }

    res.json({
      token: authData.session.access_token,
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        role: userData.role
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}
