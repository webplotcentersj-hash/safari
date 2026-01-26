import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabase';

// Endpoint independiente para crear el primer usuario admin.
// POST /api/admin-setup
// Headers: x-admin-setup-secret: <ADMIN_SETUP_SECRET>
// Body: { email, password }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const secretHeader =
      (req.headers['x-admin-setup-secret'] as string | undefined) ||
      (req.headers['X-Admin-Setup-Secret'] as string | undefined);

    const expectedSecret = process.env.ADMIN_SETUP_SECRET;

    if (!expectedSecret) {
      return res.status(500).json({ error: 'ADMIN_SETUP_SECRET no configurado en el servidor' });
    }

    if (!secretHeader || secretHeader !== expectedSecret) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error || !created?.user) {
      console.error('Create admin user error:', error);
      return res.status(500).json({ error: error?.message || 'No se pudo crear el usuario admin' });
    }

    // Asegurar rol admin en public.users (por si el trigger no corre)
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({ id: created.user.id, email, role: 'admin' }, { onConflict: 'id' });

    if (upsertError) {
      console.error('Upsert users role error:', upsertError);
      // No fallamos el alta del auth user
    }

    return res.status(201).json({
      message: 'Usuario admin creado',
      user: { id: created.user.id, email }
    });
  } catch (e: any) {
    console.error('Admin-setup crashed:', e);
    return res.status(500).json({ error: 'Error al crear el usuario admin' });
  }
}








