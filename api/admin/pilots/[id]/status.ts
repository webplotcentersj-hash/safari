import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../../_utils/supabase';
import { authenticateToken, requireAdmin } from '../../../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await authenticateToken(req);
  
  if (!user || !requireAdmin(user)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { estado } = req.body;

    if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const { error } = await supabaseAdmin
      .from('pilots')
      .update({ estado })
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Estado actualizado exitosamente' });
  } catch (error: any) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Error al actualizar el estado' });
  }
}

