import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabase';
import { generateTicketPDF } from './_utils/pdfGenerator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url } = req;
  const path = url?.split('?')[0] || '';
  
  if (method === 'POST' && path === '/api/tickets/generate') {
    // Generar ticket
    try {
      const { tipo, nombre, dni, email, precio } = req.body;

      if (!tipo || !nombre || precio === undefined) {
        return res.status(400).json({ error: 'Campos requeridos faltantes' });
      }

      const codigo = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const { data: ticket, error } = await supabaseAdmin
        .from('tickets')
        .insert({
          codigo,
          tipo,
          nombre,
          dni: dni || null,
          email: email || null,
          precio: parseFloat(precio),
          usado: false
        })
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        return res.status(500).json({ error: 'Error al generar el ticket' });
      }

      const pdfBuffer = await generateTicketPDF(ticket);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ticket-${codigo}.pdf`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('Ticket generation error:', error);
      res.status(500).json({ error: 'Error al generar el ticket' });
    }
  } else if (method === 'GET' && (path.startsWith('/api/tickets/verify/') || query.codigo)) {
    // Verificar ticket
    try {
      const codigo = (path.split('/api/tickets/verify/')[1] || query.codigo) as string;
      
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

      res.json(ticket);
    } catch (error: any) {
      console.error('Verify error:', error);
      res.status(500).json({ error: 'Error al verificar el ticket' });
    }
  } else if (method === 'PATCH' && (path.startsWith('/api/tickets/use/') || query.codigo)) {
    // Marcar ticket como usado
    try {
      const codigo = (path.split('/api/tickets/use/')[1] || query.codigo) as string;
      
      if (!codigo) {
        return res.status(400).json({ error: 'Código requerido' });
      }

      const { data: ticket, error: fetchError } = await supabaseAdmin
        .from('tickets')
        .select('*')
        .eq('codigo', codigo)
        .single();
      
      if (fetchError || !ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }

      if (ticket.usado) {
        return res.status(400).json({ error: 'Este ticket ya fue utilizado' });
      }

      const { error: updateError } = await supabaseAdmin
        .from('tickets')
        .update({ usado: true })
        .eq('codigo', codigo);

      if (updateError) {
        return res.status(500).json({ error: 'Error al marcar el ticket' });
      }

      res.json({ message: 'Ticket marcado como usado' });
    } catch (error: any) {
      console.error('Use ticket error:', error);
      res.status(500).json({ error: 'Error al marcar el ticket' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

