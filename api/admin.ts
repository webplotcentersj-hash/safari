import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabase';
import { authenticateToken, requireAdmin } from './_utils/auth';
import { generateTicketPDF } from './_utils/pdfGenerator';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, query, body } = req;
  const path = url?.split('?')[0] || '';
  const q = query || {};

  // Rewrite: /api/ticket-solicitud → /api/admin?__route=ticket-solicitud (para no superar límite de funciones)
  if (String((q as any).__route) === 'ticket-solicitud') {
    if (method === 'POST') {
      try {
        const { nombre, email, comprobanteBase64, fileName, cantidad: cantidadBody } = body || {};
        if (!nombre || !email) return res.status(400).json({ error: 'Nombre y email son requeridos' });
        if (!comprobanteBase64 || typeof comprobanteBase64 !== 'string') return res.status(400).json({ error: 'El comprobante de pago (imagen) es obligatorio' });
        const cantidad = Math.max(1, Math.min(100, parseInt(String(cantidadBody || 1), 10) || 1));
        const buf = Buffer.from(comprobanteBase64, 'base64');
        const ext = (fileName && String(fileName).split('.').pop()) || 'jpg';
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { data: upload, error: uploadError } = await supabaseAdmin.storage.from('comprobantes-pago').upload(safeName, buf, { contentType: ext === 'png' ? 'image/png' : 'image/jpeg', upsert: false });
        if (uploadError) { console.error('Upload comprobante error:', uploadError); return res.status(500).json({ error: 'Error al subir el comprobante. Reintentá.' }); }
        const { data: urlData } = supabaseAdmin.storage.from('comprobantes-pago').getPublicUrl(upload.path);
        const comprobante_pago_url = urlData?.publicUrl || null;
        if (!comprobante_pago_url) return res.status(500).json({ error: 'Error al guardar el comprobante.' });
        const { data: sol, error } = await supabaseAdmin.from('ticket_solicitudes').insert({ nombre, email, comprobante_pago_url, estado: 'pendiente', cantidad }).select('id, estado, created_at').single();
        if (error) { console.error('Insert ticket_solicitud error:', error); return res.status(500).json({ error: 'Error al registrar la solicitud.' }); }
        return res.status(201).json({ message: 'Solicitud recibida. Te avisaremos cuando sea aprobada.', id: sol.id });
      } catch (e: any) { console.error('Ticket solicitud POST error:', e); return res.status(500).json({ error: 'Error al enviar la solicitud.' }); }
    }
    if (method === 'GET') {
      try {
        const email = (q.email as string)?.trim();
        if (!email) return res.status(400).json({ error: 'Indicá tu email para consultar' });
        const { data: list, error } = await supabaseAdmin.from('ticket_solicitudes').select('id, nombre, email, estado, comprobante_pago_url, ticket_id, cantidad, created_at').eq('email', email).order('created_at', { ascending: false });
        if (error) { console.error('Get ticket_solicitudes error:', error); return res.status(500).json({ error: 'Error al consultar.' }); }
        const ticketCodigosBySolicitud: { [solicitudId: string]: string[] } = {};
        if (list?.length) {
          const { data: tList } = await supabaseAdmin.from('tickets').select('id, codigo, solicitud_id').in('solicitud_id', list.map((s: any) => s.id));
          if (tList) {
            for (const t of tList) {
              const sid = t.solicitud_id;
              if (sid) {
                if (!ticketCodigosBySolicitud[sid]) ticketCodigosBySolicitud[sid] = [];
                ticketCodigosBySolicitud[sid].push(t.codigo);
              }
            }
          }
          for (const s of list) {
            if (!ticketCodigosBySolicitud[s.id] && (s as any).ticket_id) {
              const { data: one } = await supabaseAdmin.from('tickets').select('codigo').eq('id', (s as any).ticket_id).single();
              if (one) ticketCodigosBySolicitud[s.id] = [one.codigo];
            }
          }
        }
        const out = (list || []).map((s: any) => ({
          id: s.id, nombre: s.nombre, email: s.email, estado: s.estado, comprobante_pago_url: s.comprobante_pago_url,
          cantidad: s.cantidad ?? 1,
          ticket_codigos: ticketCodigosBySolicitud[s.id] || [],
          ticket_codigo: (ticketCodigosBySolicitud[s.id] && ticketCodigosBySolicitud[s.id][0]) || null,
          created_at: s.created_at
        }));
        return res.json(out);
      } catch (e: any) { console.error('Ticket solicitud GET error:', e); return res.status(500).json({ error: 'Error al consultar.' }); }
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  // Rewrite: /api/admin/ticket-solicitudes → /api/admin?__subpath=ticket-solicitudes (Vercel no enruta /api/admin/xxx a admin.ts)
  if (String((q as any).__subpath) === 'ticket-solicitudes') {
    if (!token) return res.status(401).json({ error: 'No autorizado' });
    if (method === 'GET') {
      try {
        const client = supabaseWithAuth || supabaseAdmin;
        const { data: list, error } = await client.from('ticket_solicitudes').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return res.json(list || []);
      } catch (e: any) {
        console.error('Get ticket-solicitudes error:', e);
        return res.status(500).json({ error: 'Error al listar solicitudes' });
      }
    }
    if (method === 'PATCH') {
      const action = String((q as any).__action);
      const id = String((q as any).__id || (q as any).id || '').trim();
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      try {
        const { data: sol, error: fetchErr } = await supabaseAdmin.from('ticket_solicitudes').select('*').eq('id', id).single();
        if (fetchErr || !sol) return res.status(404).json({ error: 'Solicitud no encontrada' });
        if (sol.estado !== 'pendiente') return res.status(400).json({ error: 'La solicitud ya fue procesada' });
        if (action === 'reject') {
          await supabaseAdmin.from('ticket_solicitudes').update({ estado: 'rechazado' }).eq('id', id);
          return res.json({ message: 'Solicitud rechazada' });
        }
        if (action === 'approve') {
          const cantidad = Math.max(1, Math.min(100, parseInt(String((sol as any).cantidad || 1), 10) || 1));
          const codigos: string[] = [];
          let firstTicketId: string | null = null;
          for (let i = 0; i < cantidad; i++) {
            const codigo = `TKT-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const { data: newTicket, error: ticketErr } = await supabaseAdmin.from('tickets').insert({
              codigo, tipo: 'general', nombre: sol.nombre, dni: null, email: sol.email, precio: 0, usado: false, solicitud_id: id
            }).select('id').single();
            if (ticketErr) { console.error('Create ticket on approve error:', ticketErr); return res.status(500).json({ error: 'Error al crear el ticket' }); }
            codigos.push(codigo);
            if (!firstTicketId) firstTicketId = newTicket.id;
          }
          await supabaseAdmin.from('ticket_solicitudes').update({ estado: 'aprobado', ticket_id: firstTicketId }).eq('id', id);
          return res.json({ message: `Solicitud aprobada. ${cantidad} ticket(s) creado(s).`, ticket_id: firstTicketId, codigos, codigo: codigos[0] });
        }
        return res.status(400).json({ error: 'Acción no válida' });
      } catch (e: any) {
        console.error('Patch ticket-solicitud error:', e);
        return res.status(500).json({ error: 'Error al procesar' });
      }
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    // Obtener piloto por ID — usar siempre supabaseAdmin (ya verificamos admin con nuestro JWT; RLS bloquearía con token de usuario)
    try {
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
  } else if (method === 'PATCH' && path.includes('/admin/pilots/') && path.includes('/status')) {
    // Actualizar estado de piloto — usar siempre supabaseAdmin (ya verificamos admin; RLS bloquearía con token de usuario)
    try {
      // Extraer el ID del path - puede venir como /api/admin/pilots/:id/status o /admin/pilots/:id/status
      let id = path.split('/admin/pilots/')[1];
      if (id) {
        id = id.split('/status')[0].split('?')[0]; // Remover /status y query params
      }
      if (!id) {
        id = query.id as string;
      }
      
      const { estado } = body;

      console.log('📤 Actualizando estado del piloto:', {
        id: id,
        estado: estado,
        path: path,
        method: method
      });

      if (!id) {
        return res.status(400).json({ error: 'ID de piloto requerido' });
      }

      if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const { data, error } = await supabaseAdmin
        .from('pilots')
        .update({ estado })
        .eq('id', id)
        .select()
        .single();

      console.log('🔍 Resultado de actualización:', { data, error });

      if (error) {
        console.error('❌ Error de Supabase al actualizar:', error);
        throw error;
      }
      
      console.log('✅ Estado actualizado exitosamente');
      res.json({ message: 'Estado actualizado exitosamente', pilot: data });
    } catch (error: any) {
      console.error('❌ Update status error (catch):', error);
      res.status(500).json({ error: 'Error al actualizar el estado', details: error.message });
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
      const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ticket-${codigo}.pdf`);
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
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
  }
  // Admin - Solicitudes de ticket (público sube comprobante, admin aprueba)
  else if (method === 'GET' && (path === '/api/admin/ticket-solicitudes' || path.endsWith('/admin/ticket-solicitudes'))) {
    try {
      const { data: list, error } = await supabaseAdmin
        .from('ticket_solicitudes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const out = list || [];
      if (out.length) {
        const { data: ticketsBySol } = await supabaseAdmin.from('tickets').select('solicitud_id, codigo').in('solicitud_id', out.map((s: any) => s.id));
        const bySol: { [id: string]: string[] } = {};
        if (ticketsBySol) for (const t of ticketsBySol) {
          if (t.solicitud_id) { if (!bySol[t.solicitud_id]) bySol[t.solicitud_id] = []; bySol[t.solicitud_id].push(t.codigo); }
        }
        for (const s of out) {
          (s as any).ticket_codigos = bySol[s.id] || [];
          if (!(s as any).cantidad) (s as any).cantidad = 1;
        }
      }
      res.json(out);
    } catch (e: any) {
      console.error('Get ticket-solicitudes error:', e);
      res.status(500).json({ error: 'Error al listar solicitudes' });
    }
  }
  else if (method === 'PATCH' && path.includes('/admin/ticket-solicitudes/')) {
    const id = path.split('/admin/ticket-solicitudes/')[1]?.split('/')[0] || (req.body && (req.body as any).id);
    if (!id) return res.status(400).json({ error: 'ID requerido' });
    const segment = path.split('/admin/ticket-solicitudes/')[1] || '';
    const action = segment.includes('approve') ? 'approve' : segment.includes('reject') ? 'reject' : null;
    try {
      const { data: sol, error: fetchErr } = await supabaseAdmin
        .from('ticket_solicitudes')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchErr || !sol) return res.status(404).json({ error: 'Solicitud no encontrada' });
      if (sol.estado !== 'pendiente') return res.status(400).json({ error: 'La solicitud ya fue procesada' });
      if (action === 'reject') {
        await supabaseAdmin.from('ticket_solicitudes').update({ estado: 'rechazado' }).eq('id', id);
        return res.json({ message: 'Solicitud rechazada' });
      }
      if (action === 'approve') {
        const cantidad = Math.max(1, Math.min(100, parseInt(String((sol as any).cantidad || 1), 10) || 1));
        const codigos: string[] = [];
        let firstTicketId: string | null = null;
        for (let i = 0; i < cantidad; i++) {
          const codigo = `TKT-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          const { data: newTicket, error: ticketErr } = await supabaseAdmin
            .from('tickets')
            .insert({
              codigo,
              tipo: 'general',
              nombre: sol.nombre,
              dni: null,
              email: sol.email,
              precio: 0,
              usado: false,
              solicitud_id: id
            })
            .select('id')
            .single();
          if (ticketErr) {
            console.error('Create ticket on approve error:', ticketErr);
            return res.status(500).json({ error: 'Error al crear el ticket' });
          }
          codigos.push(codigo);
          if (!firstTicketId) firstTicketId = newTicket.id;
        }
        await supabaseAdmin
          .from('ticket_solicitudes')
          .update({ estado: 'aprobado', ticket_id: firstTicketId })
          .eq('id', id);
        return res.json({ message: `Solicitud aprobada. ${cantidad} ticket(s) creado(s).`, ticket_id: firstTicketId, codigos, codigo: codigos[0] });
      }
      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e: any) {
      console.error('Patch ticket-solicitud error:', e);
      return res.status(500).json({ error: 'Error al procesar' });
    }
  } else {
    res.status(404).json({ error: 'Ruta no encontrada' });
  }
}

