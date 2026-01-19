import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabase';
import { authenticateToken, requireAdmin } from './_utils/auth';
import { generateTicketPDF } from './_utils/pdfGenerator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await authenticateToken(req);
  
  if (!user || !requireAdmin(user)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const { method, url, query, body } = req;
  const path = url?.split('?')[0] || '';

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
      const { estado, precio } = body;

      if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      // Obtener datos del piloto antes de actualizar
      const { data: pilot, error: pilotError } = await supabaseAdmin
        .from('pilots')
        .select('*')
        .eq('id', id)
        .single();

      if (pilotError || !pilot) {
        return res.status(404).json({ error: 'Piloto no encontrado' });
      }

      // Actualizar estado del piloto
      const { error: updateError } = await supabaseAdmin
        .from('pilots')
        .update({ estado })
        .eq('id', id);

      if (updateError) throw updateError;

      // Si se aprueba el piloto, generar ticket automáticamente
      if (estado === 'aprobado') {
        // Verificar si ya existe un ticket para este piloto
        const { data: existingTicket } = await supabaseAdmin
          .from('tickets')
          .select('id')
          .eq('dni', pilot.dni)
          .single();

        // Solo generar ticket si no existe uno previo
        if (!existingTicket) {
          const codigo = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          const nombreCompleto = `${pilot.nombre} ${pilot.apellido}`;
          const precioTicket = precio ? parseFloat(precio) : 0;

          const { error: ticketError } = await supabaseAdmin
            .from('tickets')
            .insert({
              codigo,
              tipo: 'Piloto',
              nombre: nombreCompleto,
              dni: pilot.dni,
              email: pilot.email,
              precio: precioTicket,
              usado: false
            });

          if (ticketError) {
            console.error('Error al generar ticket automático:', ticketError);
            // No fallar la actualización del estado si falla la generación del ticket
          }
        }
      }

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

