import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const categoria = req.query.categoria as string | undefined;
    
    let queryBuilder = supabaseAdmin
      .from('pilots')
      .select('numero')
      .not('numero', 'is', null);
    
    // Si se especifica categoría, filtrar por ella
    if (categoria && (categoria === 'auto' || categoria === 'moto')) {
      queryBuilder = queryBuilder.eq('categoria', categoria);
    }
    
    const { data: pilots, error } = await queryBuilder;
    
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

