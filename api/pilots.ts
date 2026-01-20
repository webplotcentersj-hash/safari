import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, query } = req;
  
  // Extraer ruta de la URL
  const path = url?.split('?')[0] || '';
  
  if (method === 'POST' && (path === '/api/pilots' || path === '/api/pilots/register')) {
    // Registrar piloto
    try {
      const {
        nombre,
        apellido,
        dni,
        email,
        telefono,
        fecha_nacimiento,
        licencia,
        vehiculo_marca,
        vehiculo_modelo,
        vehiculo_patente,
        copiloto_nombre,
        copiloto_dni,
        categoria,
        comprobante_pago_url
      } = req.body;

      if (!nombre || !apellido || !dni || !email || !telefono || !fecha_nacimiento) {
        return res.status(400).json({ error: 'Campos requeridos faltantes' });
      }

      if (!categoria) {
        return res.status(400).json({ error: 'El tipo de vehículo (Auto/Moto) es requerido' });
      }

      // Verificar si ya existe un piloto con ese DNI
      const { data: existingPilot, error: checkError } = await supabaseAdmin
        .from('pilots')
        .select('id')
        .eq('dni', dni)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing pilot:', checkError);
        return res.status(500).json({ error: 'Error al verificar la inscripción' });
      }

      if (existingPilot) {
        return res.status(400).json({ error: 'Ya existe una inscripción con este DNI' });
      }

      const { data, error } = await supabaseAdmin
        .from('pilots')
        .insert({
          nombre,
          apellido,
          dni,
          email,
          telefono,
          fecha_nacimiento,
          licencia: licencia || null,
          vehiculo_marca: vehiculo_marca || null,
          vehiculo_modelo: vehiculo_modelo || null,
          vehiculo_patente: vehiculo_patente || null,
          copiloto_nombre: copiloto_nombre || null,
          copiloto_dni: copiloto_dni || null,
          categoria: categoria || null,
          comprobante_pago_url: comprobante_pago_url || null,
          estado: 'pendiente'
        })
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return res.status(500).json({
          error: error.message || 'Error al procesar la inscripción'
        });
      }

      if (!data) {
        console.error('No data returned from insert');
        return res.status(500).json({ error: 'Error al procesar la inscripción: no se recibieron datos' });
      }

      // Por ahora simplificamos: solo registramos al piloto correctamente.
      // Más adelante podemos volver a activar QR y envío de email si hace falta.
      res.status(201).json({
        message: 'Inscripción realizada exitosamente',
        data
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Error al procesar la inscripción' });
    }
  } else if (method === 'GET' && (path.startsWith('/api/pilots/check/') || query.dni)) {
    // Verificar piloto por DNI
    try {
      const dni = (path.split('/api/pilots/check/')[1] || query.dni) as string;
      
      if (!dni) {
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
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

