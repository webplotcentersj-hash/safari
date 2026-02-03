import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { isCategoriaNumerada, processUsedNumbers } from '../_utils/pilotNumbers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const categoria = (req.query.categoria as string)?.toLowerCase();
    // IMPORTANTE: Autos, motos y cuatriciclos usan números distintos (ej: el 1 de auto y el 1 de moto son válidos a la vez).
    if (!isCategoriaNumerada(categoria)) {
      return res.status(400).json({ error: 'categoria es obligatoria y debe ser "auto", "moto" o "cuatri"' });
    }

    // Incluir todos los estados: la BD solo permite un número por categoría (también rechazados bloquean).
    const { data: pilots, error } = await supabaseAdmin
      .from('pilots')
      .select('numero')
      .not('numero', 'is', null)
      .eq('categoria', categoria);
    
    if (error) {
      console.error('Error obteniendo números usados:', error);
      return res.status(500).json({ error: 'Error al obtener números usados' });
    }

    console.log('📋 Pilotos encontrados con números:', pilots);
    console.log('📋 Categoría filtrada:', categoria);

    const usedNumbers = processUsedNumbers(pilots || []);

    console.log('📊 Números usados encontrados para categoría', categoria, ':', usedNumbers);
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(usedNumbers);
  } catch (error: any) {
    console.error('Used numbers error:', error);
    res.status(500).json({ error: 'Error al obtener números usados' });
  }
}

