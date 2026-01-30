import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_utils/supabase';
import { authenticateToken, requireAdmin } from '../../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const id = req.query.id as string;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar autenticación
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    if (!id) {
      return res.status(400).json({ error: 'ID de piloto requerido' });
    }

    console.log('🔍 Buscando piloto con ID:', id);

    // Usar siempre admin: ya verificamos que el usuario es admin con nuestro JWT; Supabase no reconoce ese JWT y RLS bloquearía la lectura.
    const { data: pilot, error } = await supabaseAdmin
      .from('pilots')
      .select('*')
      .eq('id', id)
      .single();

    console.log('🔍 Resultado de la consulta:', { 
      hasPilot: !!pilot, 
      pilotId: pilot?.id,
      pilotNombre: pilot?.nombre,
      pilotApellido: pilot?.apellido,
      error: error?.message 
    });

    if (error) {
      console.error('❌ Error de Supabase:', error);
      return res.status(404).json({ error: 'Piloto no encontrado', details: error.message });
    }

    if (!pilot) {
      console.error('❌ Piloto no encontrado en la base de datos');
      return res.status(404).json({ error: 'Piloto no encontrado' });
    }

    console.log('✅ Piloto encontrado - Datos completos:', {
      id: pilot.id,
      nombre: pilot.nombre,
      apellido: pilot.apellido,
      dni: pilot.dni,
      email: pilot.email,
      telefono: pilot.telefono,
      categoria: pilot.categoria,
      estado: pilot.estado,
      numero: pilot.numero
    });

    // Asegurar que la respuesta sea JSON
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(pilot);
  } catch (error: any) {
    console.error('❌ Get pilot error (catch):', error);
    res.status(500).json({ error: 'Error al obtener el piloto', details: error.message });
  }
}

