import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { codigo } = req.query;
    
    if (!codigo || typeof codigo !== 'string') {
      return res.status(400).json({ error: 'Código requerido' });
    }

    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('codigo', codigo)
      .single();
    
    if (fetchError || !ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    if (ticket.usado) {
      return res.status(400).json({ error: 'Este ticket ya fue utilizado' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({ usado: true })
      .eq('codigo', codigo);

    if (updateError) {
      return res.status(500).json({ error: 'Error al marcar el ticket' });
    }

    res.json({ message: 'Ticket marcado como usado' });
  } catch (error: any) {
    console.error('Use ticket error:', error);
    res.status(500).json({ error: 'Error al marcar el ticket' });
  }
}

