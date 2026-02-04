import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [statusRes, timesRes] = await Promise.all([
      supabaseAdmin
        .from('race_status')
        .select('semaphore, stop_message, updated_at')
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('race_times')
        .select(`
          id,
          pilot_id,
          categoria,
          categoria_detalle,
          tiempo_segundos,
          tiempo_formato,
          etapa,
          fecha,
          pilots (
            id,
            nombre,
            apellido,
            numero,
            categoria,
            categoria_auto,
            categoria_moto
          )
        `)
        .order('tiempo_segundos', { ascending: true })
    ]);

    const status = statusRes.data;
    const statusError = statusRes.error;
    const times = timesRes.data || [];
    const timesError = timesRes.error;

    if (statusError) {
      console.error('Error fetching race_status:', statusError);
    }
    if (timesError) {
      console.error('Error fetching race_times:', timesError);
    }

    return res.status(200).json({
      semaphore: status?.semaphore ?? 'green',
      stop_message: status?.stop_message ?? null,
      updated_at: status?.updated_at ?? null,
      times: statusError ? [] : times
    });
  } catch (e: unknown) {
    console.error('race-display error:', e);
    return res.status(500).json({ error: 'Error al cargar la pantalla de carrera' });
  }
}
