import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabase';
import { createClient } from '@supabase/supabase-js';

// Cliente público para inscripciones (permite insert sin auth)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabasePublic = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, query } = req;
  const path = url?.split('?')[0] || '';

  if (method === 'POST' && (path === '/api/pilots' || path === '/api/pilots/register')) {
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
        categoria_auto,
        categoria_moto,
        numero,
        comprobante_pago_url
      } = req.body;

      if (!nombre || !apellido || !dni || !email || !telefono || !fecha_nacimiento) {
        return res.status(400).json({ error: 'Campos requeridos faltantes' });
      }

      if (!categoria) {
        return res.status(400).json({ error: 'El tipo de vehículo (Auto/Moto) es requerido' });
      }

      // Validar campos requeridos para autos
      if (categoria === 'auto') {
        if (!numero || numero < 1 || numero > 250) {
          return res.status(400).json({ error: 'Para autos, debes seleccionar un número entre 01 y 250' });
        }
        if (!categoria_auto) {
          return res.status(400).json({ error: 'Para autos, debes seleccionar una categoría' });
        }
      }

      // Validar campos requeridos para motos
      if (categoria === 'moto') {
        if (!categoria_moto) {
          return res.status(400).json({ error: 'Para motos, debes seleccionar una categoría' });
        }
      }

      // Insertar piloto directamente (las políticas RLS permiten INSERT público)
      // Si hay duplicados (DNI o número), el error lo manejamos abajo
      const insertClient = supabasePublic || supabaseAdmin;
      
      if (!insertClient) {
        return res.status(500).json({ error: 'Error de configuración del servidor' });
      }
      const { data, error } = await insertClient
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
          categoria_auto: categoria === 'auto' ? categoria_auto : null,
          categoria_moto: categoria === 'moto' ? categoria_moto : null,
          numero: categoria === 'auto' ? numero : null,
          comprobante_pago_url: comprobante_pago_url || null,
          estado: 'pendiente'
        })
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Request body:', JSON.stringify(req.body, null, 2));
        
        // Manejar errores de constraint único
        if (error.code === '23505') {
          if (error.message?.includes('dni') || error.message?.includes('pilots_dni_key')) {
            return res.status(400).json({ error: 'Ya existe una inscripción con este DNI' });
          }
          if (error.message?.includes('numero') || error.message?.includes('pilots_numero_key')) {
            return res.status(400).json({ error: `El número ${numero ? numero.toString().padStart(2, '0') : ''} ya está asignado a otro piloto` });
          }
        }
        
        // Error de RLS (Row Level Security)
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
          return res.status(500).json({ 
            error: 'Error de permisos. Por favor contacta al administrador.',
            details: 'RLS policy violation'
          });
        }
        
        return res.status(500).json({ 
          error: 'Error al procesar la inscripción',
          details: error.message || 'Error desconocido'
        });
      }

      if (!data) {
        console.error('No data returned from insert');
        return res.status(500).json({ error: 'Error al procesar la inscripción: no se recibieron datos' });
      }

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
