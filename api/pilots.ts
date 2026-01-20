import type { VercelRequest, VercelResponse } from '@vercel/node';

// Handler mínimo para estabilizar la función y evitar errores 500 en producción.
// De momento solo devuelve los datos que llegan, sin tocar la base de datos.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  if (method === 'POST') {
    return res.status(201).json({
      message: 'Inscripción recibida (modo prueba, sin guardar en BD).',
      data: req.body || null
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
