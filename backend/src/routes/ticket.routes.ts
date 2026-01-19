import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';
import { generateTicketPDF } from '../utils/pdfGenerator.js';

const router = express.Router();

// Validación de ticket
const validateTicket = [
  body('tipo').notEmpty().withMessage('El tipo de ticket es requerido'),
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('precio').isFloat({ min: 0 }).withMessage('El precio debe ser un número válido'),
];

// Generar ticket
router.post('/generate', validateTicket, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tipo, nombre, dni, email, precio } = req.body;

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
});

// Verificar ticket por código
router.get('/verify/:codigo', async (req, res) => {
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

    res.json(ticket);
  } catch (error: any) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Error al verificar el ticket' });
  }
});

// Marcar ticket como usado
router.patch('/use/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    
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
});

export default router;
