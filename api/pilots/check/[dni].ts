import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dni } = req.query;
    
    if (!dni || typeof dni !== 'string') {
      return res.status(400).json({ error: 'DNI requerido' });
    }

    const { data: pilot, error } = await supabaseAdmin
      .from('pilots')
      .select('*')
      .eq('dni', dni)
      .single();
    
    if (error || !pilot) {
      return res.status(404).json({ error: 'No se encontró inscripción con ese DNI' });
    }

    res.json(pilot);
  } catch (error: any) {
    console.error('Check error:', error);
    res.status(500).json({ error: 'Error al consultar la inscripción' });
  }
}

