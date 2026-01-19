import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { authenticateToken, requireAdmin } from '../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await authenticateToken(req);
  
  if (!user || !requireAdmin(user)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  if (req.method === 'GET') {
    try {
      const { data: tickets, error } = await supabaseAdmin
        .from('tickets')
        .select('*')
        .order('fecha_emision', { ascending: false });

      if (error) {
        throw error;
      }

      res.json(tickets || []);
    } catch (error: any) {
      console.error('Get tickets error:', error);
      res.status(500).json({ error: 'Error al obtener los tickets' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

