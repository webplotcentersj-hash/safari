import express from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { generateTicketPDF } from '../utils/pdfGenerator.js';

const router = express.Router();

// Todas las rutas requieren autenticación y rol de admin
router.use(authenticateToken);
router.use(requireAdmin);

// Obtener todos los pilotos
router.get('/pilots', async (req, res) => {
  try {
    const { data: pilots, error } = await supabaseAdmin
      .from('pilots')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(pilots || []);
  } catch (error: any) {
    console.error('Get pilots error:', error);
    res.status(500).json({ error: 'Error al obtener los pilotos' });
  }
});

// Obtener piloto por ID
router.get('/pilots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
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
});

// Actualizar estado de piloto
router.patch('/pilots/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const { error } = await supabaseAdmin
      .from('pilots')
      .update({ estado })
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Estado actualizado exitosamente' });
  } catch (error: any) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Error al actualizar el estado' });
  }
});

// Eliminar piloto
router.delete('/pilots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabaseAdmin
      .from('pilots')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Piloto eliminado exitosamente' });
  } catch (error: any) {
    console.error('Delete pilot error:', error);
    res.status(500).json({ error: 'Error al eliminar el piloto' });
  }
});

// Obtener todos los tickets
router.get('/tickets', async (req, res) => {
  try {
    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .order('fecha_emision', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(tickets || []);
  } catch (error: any) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Error al obtener los tickets' });
  }
});

// Obtener estadísticas
router.get('/stats', async (req, res) => {
  try {
    // Contar pilotos
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

    // Contar tickets
    const { count: totalTickets } = await supabaseAdmin
      .from('tickets')
      .select('*', { count: 'exact', head: true });

    const { count: usedTickets } = await supabaseAdmin
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('usado', true);

    // Calcular ingresos
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
});

// Descargar ticket PDF
router.get('/tickets/:codigo/pdf', async (req, res) => {
  try {
    const { codigo } = req.params;
    
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
});

export default router;
