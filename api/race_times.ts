import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, body, query } = req;

  if (method === 'GET') {
    try {
      const categoria = query.categoria as string | undefined;
      const categoriaDetalle = query.categoria_detalle as string | undefined;
      const pilotId = query.pilot_id as string | undefined;

      let queryBuilder = supabaseAdmin
        .from('race_times')
        .select(`
          *,
          pilots (
            id,
            nombre,
            apellido,
            dni,
            numero,
            categoria,
            categoria_auto,
            categoria_moto
          )
        `)
        .order('tiempo_segundos', { ascending: true, nullsLast: true });

      if (categoria) {
        queryBuilder = queryBuilder.eq('categoria', categoria);
      }

      if (categoriaDetalle) {
        queryBuilder = queryBuilder.eq('categoria_detalle', categoriaDetalle);
      }

      if (pilotId) {
        queryBuilder = queryBuilder.eq('pilot_id', pilotId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Error obteniendo tiempos:', error);
        return res.status(500).json({ error: 'Error al obtener los tiempos' });
      }

      return res.json(data || []);
    } catch (error: any) {
      console.error('Error en GET race-times:', error);
      return res.status(500).json({ error: 'Error al obtener los tiempos' });
    }
  }

  if (method === 'POST') {
    try {
      const { pilot_id, categoria, categoria_detalle, tiempo_segundos, tiempo_formato, etapa } = body;

      if (!pilot_id || !categoria) {
        return res.status(400).json({ error: 'pilot_id y categoria son requeridos' });
      }

      // Validar que el piloto existe
      const { data: pilot, error: pilotError } = await supabaseAdmin
        .from('pilots')
        .select('id, categoria, categoria_auto, categoria_moto')
        .eq('id', pilot_id)
        .single();

      if (pilotError || !pilot) {
        return res.status(404).json({ error: 'Piloto no encontrado' });
      }

      // Validar que la categoría coincide
      if (pilot.categoria !== categoria) {
        return res.status(400).json({ error: 'La categoría no coincide con el piloto' });
      }

      // Convertir tiempo_segundos a número si viene como string
      const tiempoSegundosNum = tiempo_segundos 
        ? (typeof tiempo_segundos === 'string' ? parseFloat(tiempo_segundos) : tiempo_segundos)
        : null;

      const insertData: any = {
        pilot_id,
        categoria,
        categoria_detalle: categoria_detalle || (categoria === 'auto' ? pilot.categoria_auto : pilot.categoria_moto),
        tiempo_segundos: tiempoSegundosNum,
        tiempo_formato: tiempo_formato || null,
        etapa: etapa || null
      };

      console.log('Insert data:', JSON.stringify(insertData, null, 2));

      const { data, error } = await supabaseAdmin
        .from('race_times')
        .insert(insertData)
        .select(`
          *,
          pilots (
            id,
            nombre,
            apellido,
            dni,
            numero,
            categoria,
            categoria_auto,
            categoria_moto
          )
        `)
        .single();

      if (error) {
        console.error('Error creando tiempo:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return res.status(500).json({ 
          error: 'Error al crear el tiempo',
          details: error.message || 'Error desconocido',
          code: error.code
        });
      }

      return res.status(201).json(data);
    } catch (error: any) {
      console.error('Error en POST race-times:', error);
      return res.status(500).json({ error: 'Error al crear el tiempo' });
    }
  }

  if (method === 'PATCH') {
    try {
      const { id } = query;
      const { tiempo_segundos, tiempo_formato, etapa } = body;

      if (!id) {
        return res.status(400).json({ error: 'id es requerido' });
      }

      const updateData: any = {};
      if (tiempo_segundos !== undefined) updateData.tiempo_segundos = tiempo_segundos;
      if (tiempo_formato !== undefined) updateData.tiempo_formato = tiempo_formato;
      if (etapa !== undefined) updateData.etapa = etapa;

      const { data, error } = await supabaseAdmin
        .from('race_times')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          pilots (
            id,
            nombre,
            apellido,
            dni,
            numero,
            categoria,
            categoria_auto,
            categoria_moto
          )
        `)
        .single();

      if (error) {
        console.error('Error actualizando tiempo:', error);
        return res.status(500).json({ error: 'Error al actualizar el tiempo' });
      }

      return res.json(data);
    } catch (error: any) {
      console.error('Error en PATCH race-times:', error);
      return res.status(500).json({ error: 'Error al actualizar el tiempo' });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = query;

      if (!id) {
        return res.status(400).json({ error: 'id es requerido' });
      }

      const { error } = await supabaseAdmin
        .from('race_times')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error eliminando tiempo:', error);
        return res.status(500).json({ error: 'Error al eliminar el tiempo' });
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error en DELETE race-times:', error);
      return res.status(500).json({ error: 'Error al eliminar el tiempo' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}

