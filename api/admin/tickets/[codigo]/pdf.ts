import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../../_utils/supabase';
import { authenticateToken, requireAdmin } from '../../../_utils/auth';
import { generateTicketPDF } from '../../../_utils/pdfGenerator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await authenticateToken(req);
  
  if (!user || !requireAdmin(user)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { codigo } = req.query;
    
    if (!codigo || typeof codigo !== 'string') {
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

