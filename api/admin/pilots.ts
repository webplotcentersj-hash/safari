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
      const { data: pilots, error } = await supabaseAdmin
        .from('pilots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.json(pilots || []);
    } catch (error: any) {
      console.error('Get pilots error:', error);
      res.status(500).json({ error: 'Error al obtener los pilotos' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

