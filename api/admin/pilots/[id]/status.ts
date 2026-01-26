import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../../_utils/supabase';
import { authenticateToken, requireAdmin } from '../../../_utils/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, body } = req;
  const id = req.query.id as string;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (method !== 'PATCH') {
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

    const { estado } = body;

    console.log('📤 Actualizando estado del piloto:', {
      id: id,
      estado: estado,
      method: method
    });

    if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    // Crear cliente con token del usuario autenticado o usar admin
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    const client = token && supabaseUrl && supabaseAnonKey 
      ? createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        })
      : supabaseAdmin;

    const { data, error } = await client
      .from('pilots')
      .update({ estado })
      .eq('id', id)
      .select()
      .single();

    console.log('🔍 Resultado de actualización:', { data, error });

    if (error) {
      console.error('❌ Error de Supabase al actualizar:', error);
      return res.status(500).json({ error: 'Error al actualizar el estado', details: error.message });
    }

    console.log('✅ Estado actualizado exitosamente');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ message: 'Estado actualizado exitosamente', pilot: data });
  } catch (error: any) {
    console.error('❌ Update status error (catch):', error);
    res.status(500).json({ error: 'Error al actualizar el estado', details: error.message });
  }
}

