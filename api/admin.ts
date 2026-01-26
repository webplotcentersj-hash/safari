import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabase';
import { authenticateToken, requireAdmin } from './_utils/auth';
import { generateTicketPDF } from './_utils/pdfGenerator';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, query, body } = req;
  const path = url?.split('?')[0] || '';

  // Crear cliente con token del usuario autenticado para consultas que respetan RLS
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  const supabaseWithAuth = token && supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  }) : null;

  // Setup (solo para bootstrap del primer admin) - protegido por secreto
  // POST /api/admin/setup/create-admin { email, password }
  if (method === 'POST' && path === '/api/admin/setup/create-admin') {
    try {
      const secretHeader = (req.headers['x-admin-setup-secret'] || req.headers['X-Admin-Setup-Secret']) as string | undefined;
      const expectedSecret = process.env.ADMIN_SETUP_SECRET;

      if (!expectedSecret) {
        return res.status(500).json({ error: 'ADMIN_SETUP_SECRET no configurado en el servidor' });
      }

      if (!secretHeader || secretHeader !== expectedSecret) {
        return res.status(403).json({ error: 'Acceso denegado' });
      }

      const { email, password } = body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
      }

      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (error || !created?.user) {
        console.error('Create admin user error:', error);
        return res.status(500).json({ error: error?.message || 'No se pudo crear el usuario admin' });
      }

      // Asegurar rol admin en public.users (por si el trigger no corre)
      const { error: upsertError } = await supabaseAdmin
        .from('users')
        .upsert({ id: created.user.id, email, role: 'admin' }, { onConflict: 'id' });

      if (upsertError) {
        console.error('Upsert users role error:', upsertError);
        // no fallamos el alta del auth user
      }

      return res.status(201).json({
        message: 'Usuario admin creado',
        user: { id: created.user.id, email }
      });
    } catch (e: any) {
      console.error('Setup create-admin crashed:', e);
      return res.status(500).json({ error: 'Error al crear el usuario admin' });
    }
  }

  // Admin - Pilots (endpoint público para lectura, ya que las políticas RLS son públicas)
  if (method === 'GET' && path === '/api/admin/pilots') {
    try {
      console.log('=== GET /api/admin/pilots ===');
      console.log('Request URL:', url);
      console.log('Request path:', path);
      console.log('Query params:', query);
      
      // Usar supabaseAdmin que tiene service_role_key (bypass RLS) o anon_key como fallback
      // Esto asegura que podamos leer los datos independientemente de las políticas RLS
      console.log('Fetching pilots from Supabase using supabaseAdmin...');
      console.log('Supabase URL configured:', !!supabaseUrl);
      console.log('Anon key configured:', !!supabaseAnonKey);
      console.log('Service role key configured:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      
      // Si hay un parámetro de número, buscar por número
      const numeroParam = query.numero as string | undefined;
      let queryBuilder = supabaseAdmin
        .from('pilots')
        .select('*');
      
      if (numeroParam) {
        const numero = parseInt(numeroParam, 10);
        console.log('Buscando piloto por número:', numero);
        queryBuilder = queryBuilder.eq('numero', numero);
      } else {
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
      }
      
      // Intentar consultar la tabla pilots usando supabaseAdmin
      console.log('Querying pilots table...');
      const { data: pilots, error } = await queryBuilder;
      
      console.log('Query result - error:', error);
      console.log('Query result - data:', pilots);
      console.log('Query result - data length:', pilots?.length);

      if (error) {
        console.error('Get pilots error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return res.status(500).json({ 
          error: 'Error al obtener pilotos',
          details: error.message 
        });
      }
      
      console.log(`Successfully fetched ${pilots?.length || 0} pilots from database`);
      if (pilots && pilots.length > 0) {
        console.log('Sample pilot data:', {
          id: pilots[0].id,
          nombre: pilots[0].nombre,
          apellido: pilots[0].apellido,
          dni: pilots[0].dni,
          estado: pilots[0].estado
        });
      } else {
        console.warn('No pilots found in database');
      }
      
      // Si se buscó por número y hay resultados, devolver el primer piloto (objeto único)
      if (numeroParam && pilots && pilots.length > 0) {
        console.log(`Piloto encontrado por número ${numeroParam}:`, pilots[0]);
        return res.status(200).json(pilots[0]);
      }
      
      // Asegurarse de devolver un array siempre
      const pilotsArray = Array.isArray(pilots) ? pilots : [];
      console.log(`Returning ${pilotsArray.length} pilots to frontend`);
      
      return res.status(200).json(pilotsArray);
    } catch (error: any) {
      console.error('Get pilots error (catch):', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return res.status(500).json({ 
        error: 'Error al obtener pilotos',
        details: error.message 
      });
    }
  }

  // Resto de endpoints: requiere sesión admin
  const user = await authenticateToken(req);
  if (!user || !requireAdmin(user)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  } else if (method === 'GET' && path.includes('/admin/pilots/') && !path.includes('/status') && !path.includes('/pdf')) {
    // Obtener piloto por ID
    try {
      const client = supabaseWithAuth || supabaseAdmin;
      
      // Extraer el ID del path - puede venir como /api/admin/pilots/:id o /admin/pilots/:id
      let id = path.split('/admin/pilots/')[1];
      if (id) {
        id = id.split('/')[0].split('?')[0]; // Remover query params y rutas adicionales
      }
      if (!id) {
        id = query.id as string;
      }
      
      console.log('🔍 Buscando piloto con ID:', id);
      console.log('🔍 Path completo:', path);
      console.log('🔍 Query params:', query);
      
      if (!id) {
        return res.status(400).json({ error: 'ID de piloto requerido' });
      }
      
      const { data: pilot, error } = await client
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
      
      res.json(pilot);
    } catch (error: any) {
      console.error('❌ Get pilot error (catch):', error);
      res.status(500).json({ error: 'Error al obtener el piloto', details: error.message });
    }
  } else if (method === 'PATCH' && path.includes('/admin/pilots/') && path.includes('/status')) {
    // Actualizar estado de piloto
    try {
      const client = supabaseWithAuth || supabaseAdmin;
      const id = path.split('/admin/pilots/')[1]?.split('/status')[0] || query.id;
      const { estado } = body;

      if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const { error } = await client
        .from('pilots')
        .update({ estado })
        .eq('id', id);

      if (error) throw error;
      res.json({ message: 'Estado actualizado exitosamente' });
    } catch (error: any) {
      console.error('Update status error:', error);
      res.status(500).json({ error: 'Error al actualizar el estado' });
    }
  } else if (method === 'DELETE' && path.includes('/admin/pilots/') && !path.includes('/status')) {
    // Eliminar piloto
    try {
      const client = supabaseWithAuth || supabaseAdmin;
      const id = path.split('/admin/pilots/')[1]?.split('/')[0] || query.id;
      const { error } = await client
        .from('pilots')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ message: 'Piloto eliminado exitosamente' });
    } catch (error: any) {
      console.error('Delete pilot error:', error);
      res.status(500).json({ error: 'Error al eliminar el piloto' });
    }
  }
  // Admin - Tickets - Listar todos
  else if (method === 'GET' && (path === '/api/admin/tickets' || path.endsWith('/admin/tickets')) && !path.includes('/pdf')) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ error: 'Error de configuración' });
      }
      
      const publicClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: tickets, error } = await publicClient
        .from('tickets')
        .select('*')
        .order('fecha_emision', { ascending: false });

      if (error) throw error;
      res.json(tickets || []);
    } catch (error: any) {
      console.error('Get tickets error:', error);
      res.json([]); // Devolver array vacío en lugar de error 500
    }
  } else if (method === 'GET' && path.includes('/admin/tickets/') && path.includes('/pdf')) {
    // Descargar ticket PDF
    try {
      const client = supabaseWithAuth || supabaseAdmin;
      const codigo = path.split('/admin/tickets/')[1]?.replace('/pdf', '') || query.codigo;
      
      if (!codigo) {
        return res.status(400).json({ error: 'Código requerido' });
      }

      const { data: ticket, error } = await client
        .from('tickets')
        .select('*')
        .eq('codigo', codigo)
        .single();
      
      if (error || !ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }

      const pdfBuffer = await generateTicketPDF(ticket);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ticket-${codigo}.pdf`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('Download PDF error:', error);
      res.status(500).json({ error: 'Error al generar el PDF' });
    }
  }
  // Admin - Stats
  else if (method === 'GET' && (path === '/api/admin/stats' || path.endsWith('/admin/stats'))) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ error: 'Error de configuración' });
      }
      
      const publicClient = createClient(supabaseUrl, supabaseAnonKey);
      const client = publicClient;
      
      const { count: totalPilots } = await client
        .from('pilots')
        .select('*', { count: 'exact', head: true });

      const { count: approvedPilots } = await client
        .from('pilots')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'aprobado');

      const { count: pendingPilots } = await client
        .from('pilots')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      const { count: totalTickets } = await client
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      const { count: usedTickets } = await client
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('usado', true);

      const { data: usedTicketsData } = await client
        .from('tickets')
        .select('precio')
        .eq('usado', true);

      const totalRevenue = usedTicketsData?.reduce((sum, ticket) => sum + (ticket.precio || 0), 0) || 0;

      res.json({
        pilots: {
          total: totalPilots || 0,
          approved: approvedPilots || 0,
          pending: pendingPilots || 0
        },
        tickets: {
          total: totalTickets || 0,
          used: usedTickets || 0,
          available: (totalTickets || 0) - (usedTickets || 0)
        },
        revenue: totalRevenue
      });
    } catch (error: any) {
      console.error('Get stats error:', error);
      // Devolver stats vacías en lugar de error para que el frontend no crashee
      res.json({
        pilots: { total: 0, approved: 0, pending: 0 },
        tickets: { total: 0, used: 0, available: 0 },
        revenue: 0
      });
    }
  } else {
    res.status(404).json({ error: 'Ruta no encontrada' });
  }
}

