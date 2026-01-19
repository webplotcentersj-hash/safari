import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { generateTicketPDF } from '../_utils/pdfGenerator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tipo, nombre, dni, email, precio } = req.body;

    if (!tipo || !nombre || precio === undefined) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    // Generar código único
    const codigo = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Insertar ticket
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

    // Generar PDF
    const pdfBuffer = await generateTicketPDF(ticket);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ticket-${codigo}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Ticket generation error:', error);
    res.status(500).json({ error: 'Error al generar el ticket' });
  }
}

