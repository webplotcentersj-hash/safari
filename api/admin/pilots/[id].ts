import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_utils/supabase';
import { authenticateToken, requireAdmin } from '../../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await authenticateToken(req);
  
  if (!user || !requireAdmin(user)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data: pilot, error } = await supabaseAdmin
        .from('pilots')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !pilot) {
        return res.status(404).json({ error: 'Piloto no encontrado' });
      }

      res.json(pilot);
    } catch (error: any) {
      console.error('Get pilot error:', error);
      res.status(500).json({ error: 'Error al obtener el piloto' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { error } = await supabaseAdmin
        .from('pilots')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      res.json({ message: 'Piloto eliminado exitosamente' });
    } catch (error: any) {
      console.error('Delete pilot error:', error);
      res.status(500).json({ error: 'Error al eliminar el piloto' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

