import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';

/**
 * POST /api/tickets/generate-bulk
 * Genera múltiples tickets (para compatibilidad con frontend que aún llame a esta URL).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = req.body || {};
  const { cantidad, tipo, precio } = body;
  if (!cantidad || !tipo || precio === undefined) {
    return res.status(400).json({ error: 'Campos requeridos: cantidad, tipo, precio' });
  }
  const cantidadNum = parseInt(String(cantidad), 10);
  if (cantidadNum <= 0 || cantidadNum > 1000) {
    return res.status(400).json({ error: 'La cantidad debe estar entre 1 y 1000' });
  }
  try {
    const tickets = [];
    const timestamp = Date.now();
    for (let i = 0; i < cantidadNum; i++) {
      tickets.push({
        codigo: `TKT-${timestamp}-${i.toString().padStart(4, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        tipo,
        nombre: 'Entrada General',
        dni: null,
        email: null,
        precio: parseFloat(String(precio)),
        usado: false
      });
    }
    const { data: insertedTickets, error } = await supabaseAdmin
      .from('tickets')
      .insert(tickets)
      .select();
    if (error) {
      console.error('Bulk insert error:', error);
      return res.status(500).json({ error: 'Error al generar los tickets' });
    }
    return res.json({
      message: `${cantidadNum} tickets generados exitosamente`,
      cantidad: insertedTickets?.length || 0,
      tickets: insertedTickets
    });
  } catch (error: any) {
    console.error('Bulk ticket generation error:', error);
    return res.status(500).json({ error: 'Error al generar los tickets' });
  }
}
