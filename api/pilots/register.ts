import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      categoria
    } = req.body;

    // Validaciones básicas
    if (!nombre || !apellido || !dni || !email || !telefono || !fecha_nacimiento) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    // Verificar si ya existe un piloto con ese DNI
    const { data: existingPilot } = await supabaseAdmin
      .from('pilots')
      .select('id')
      .eq('dni', dni)
      .single();

    if (existingPilot) {
      return res.status(400).json({ error: 'Ya existe una inscripción con este DNI' });
    }

    // Insertar piloto
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
        estado: 'pendiente'
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return res.status(500).json({ error: 'Error al procesar la inscripción' });
    }

    res.status(201).json({ message: 'Inscripción realizada exitosamente', data });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Error al procesar la inscripción' });
  }
}

