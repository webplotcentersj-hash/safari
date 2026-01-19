import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { authenticateToken, requireAdmin } from '../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await authenticateToken(req);
  
  if (!user || !requireAdmin(user)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}

