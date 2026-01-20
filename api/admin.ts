import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabase';
import { authenticateToken, requireAdmin } from './_utils/auth';
import { generateTicketPDF } from './_utils/pdfGenerator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, query, body } = req;
  const path = url?.split('?')[0] || '';

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

  // Resto de endpoints: requiere sesión admin
  const user = await authenticateToken(req);
  if (!user || !requireAdmin(user)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  // Admin - Pilots
  if (method === 'GET' && path === '/api/admin/pilots') {
    try {
      const { data: pilots, error } = await supabaseAdmin
        .from('pilots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(pilots || []);
    } catch (error: any) {
      console.error('Get pilots error:', error);
      res.status(500).json({ error: 'Error al obtener los pilotos' });
    }
  } else if (method === 'GET' && path.includes('/admin/pilots/') && !path.includes('/status') && !path.includes('/pdf')) {
    // Obtener piloto por ID
    try {
      const id = path.split('/admin/pilots/')[1]?.split('/')[0] || query.id;
      const { data: pilot, error } = await supabaseAdmin
        .from('pilots')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !pilot) {
        return res.status(404).json({ error: 'Piloto no encontrado' });
      }
      res.json(pilot);
    } catch (error: any) {
      console.error('Get pilot error:', error);
      res.status(500).json({ error: 'Error al obtener el piloto' });
    }
  } else if (method === 'PATCH' && path.includes('/admin/pilots/') && path.includes('/status')) {
    // Actualizar estado de piloto
    try {
      const id = path.split('/admin/pilots/')[1]?.split('/status')[0] || query.id;
      const { estado } = body;

      if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const { error } = await supabaseAdmin
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
      const id = path.split('/admin/pilots/')[1]?.split('/')[0] || query.id;
      const { error } = await supabaseAdmin
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
      const { data: tickets, error } = await supabaseAdmin
        .from('tickets')
        .select('*')
        .order('fecha_emision', { ascending: false });

      if (error) throw error;
      res.json(tickets || []);
    } catch (error: any) {
      console.error('Get tickets error:', error);
      res.status(500).json({ error: 'Error al obtener los tickets' });
    }
  } else if (method === 'GET' && path.includes('/admin/tickets/') && path.includes('/pdf')) {
    // Descargar ticket PDF
    try {
      const codigo = path.split('/admin/tickets/')[1]?.replace('/pdf', '') || query.codigo;
      
      if (!codigo) {
        return res.status(400).json({ error: 'Código requerido' });
      }

      const { data: ticket, error } = await supabaseAdmin
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
      const { count: totalPilots } = await supabaseAdmin
        .from('pilots')
        .select('*', { count: 'exact', head: true });

      const { count: approvedPilots } = await supabaseAdmin
        .from('pilots')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'aprobado');

      const { count: pendingPilots } = await supabaseAdmin
        .from('pilots')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      const { count: totalTickets } = await supabaseAdmin
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      const { count: usedTickets } = await supabaseAdmin
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('usado', true);

      const { data: usedTicketsData } = await supabaseAdmin
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
      res.status(500).json({ error: 'Error al obtener las estadísticas' });
    }
  } else {
    res.status(404).json({ error: 'Ruta no encontrada' });
  }
}

