import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// Validación de inscripción
const validateRegistration = [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('apellido').notEmpty().withMessage('El apellido es requerido'),
  body('dni').notEmpty().withMessage('El DNI es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('telefono').notEmpty().withMessage('El teléfono es requerido'),
  body('fecha_nacimiento').notEmpty().withMessage('La fecha de nacimiento es requerida'),
];

// Inscripción de piloto
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      nombre,
      apellido,
      dni,
      email,
      telefono,
      fecha_nacimiento,
      licencia,
      vehiculo_marca,
      vehiculo_modelo,
      vehiculo_patente,
      copiloto_nombre,
      copiloto_dni,
      categoria
    } = req.body;

    // Verificar si ya existe un piloto con ese DNI
    const { data: existingPilot } = await supabaseAdmin
      .from('pilots')
      .select('id')
      .eq('dni', dni)
      .single();

    if (existingPilot) {
      return res.status(400).json({ error: 'Ya existe una inscripción con este DNI' });
    }

    // Insertar piloto
    const { data, error } = await supabaseAdmin
      .from('pilots')
      .insert({
        nombre,
        apellido,
        dni,
        email,
        telefono,
        fecha_nacimiento,
        licencia: licencia || null,
        vehiculo_marca: vehiculo_marca || null,
        vehiculo_modelo: vehiculo_modelo || null,
        vehiculo_patente: vehiculo_patente || null,
        copiloto_nombre: copiloto_nombre || null,
        copiloto_dni: copiloto_dni || null,
        categoria: categoria || null,
        estado: 'pendiente'
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return res.status(500).json({ error: 'Error al procesar la inscripción' });
    }

    res.status(201).json({ message: 'Inscripción realizada exitosamente', data });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Error al procesar la inscripción' });
  }
});

// Obtener inscripción por DNI (público)
router.get('/check/:dni', async (req, res) => {
  try {
    const { dni } = req.params;
    
    const { data: pilot, error } = await supabaseAdmin
      .from('pilots')
      .select('*')
      .eq('dni', dni)
      .single();
    
    if (error || !pilot) {
      return res.status(404).json({ error: 'No se encontró inscripción con ese DNI' });
    }

    res.json(pilot);
  } catch (error: any) {
    console.error('Check error:', error);
    res.status(500).json({ error: 'Error al consultar la inscripción' });
  }
});

export default router;
