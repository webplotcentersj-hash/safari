import express from 'express';
import { supabaseAdmin, supabaseAuth } from '../config/supabase.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Autenticar con Supabase usando cliente público
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Obtener el rol del usuario desde la base de datos
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ error: 'Usuario no encontrado en la base de datos' });
    }

    // El token viene en authData.session
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
});

export default router;
