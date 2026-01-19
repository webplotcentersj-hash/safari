import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { codigo } = req.query;
    
    if (!codigo || typeof codigo !== 'string') {
      return res.status(400).json({ error: 'Código requerido' });
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('codigo', codigo)
      .single();
    
    if (error || !ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json(ticket);
  } catch (error: any) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Error al verificar el ticket' });
  }
}

