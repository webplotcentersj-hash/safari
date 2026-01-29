import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const categoria = (req.query.categoria as string)?.toLowerCase();
    // IMPORTANTE: Autos y motos usan números distintos (ej: el 1 de auto y el 1 de moto son válidos a la vez).
    // Siempre filtrar por categoría para no mezclar listas.
    if (categoria !== 'auto' && categoria !== 'moto') {
      return res.status(400).json({ error: 'categoria es obligatoria y debe ser "auto" o "moto"' });
    }

    const { data: pilots, error } = await supabaseAdmin
      .from('pilots')
      .select('numero')
      .not('numero', 'is', null)
      .eq('categoria', categoria)
      .in('estado', ['aprobado', 'pendiente']);
    
    if (error) {
      console.error('Error obteniendo números usados:', error);
      return res.status(500).json({ error: 'Error al obtener números usados' });
    }

    console.log('📋 Pilotos encontrados con números:', pilots);
    console.log('📋 Categoría filtrada:', categoria);

    const usedNumbers = pilots
      .map((p: any) => {
        // Asegurar que el número sea un entero
        const num = typeof p.numero === 'string' ? parseInt(p.numero, 10) : Number(p.numero);
        console.log('🔢 Procesando número:', p.numero, '->', num, '(tipo:', typeof num, ')');
        return num;
      })
      .filter((num: number | null) => {
        const isValid = num !== null && !isNaN(num) && num >= 1 && num <= 250;
        if (!isValid) {
          console.log('⚠️ Número inválido filtrado:', num);
        }
        return isValid;
      })
      .sort((a: number, b: number) => a - b);

    console.log('📊 Números usados encontrados para categoría', categoria, ':', usedNumbers);
    console.log('📊 Tipo de array:', Array.isArray(usedNumbers));
    console.log('📊 Primer elemento tipo:', typeof usedNumbers[0]);
    
    // Asegurar que la respuesta sea JSON
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(usedNumbers);
  } catch (error: any) {
    console.error('Used numbers error:', error);
    res.status(500).json({ error: 'Error al obtener números usados' });
  }
}

