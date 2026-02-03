import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_utils/supabase';
import { authenticateToken, requireAdmin } from '../../_utils/auth';
import { generatePlanillaInscripcionPDF } from '../../_utils/pdfGenerator';

/**
 * Endpoint dedicado para descargar planilla de inscripción en PDF.
 * Sin rewrite: la petición llega directo aquí y los headers (Authorization) se preservan.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await authenticateToken(req);
  if (!user || !requireAdmin(user)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const query = req.query || {};
  const categoria = String(query.categoria || 'todos').toLowerCase();
  const categoriaDetalle = typeof query.categoria_detalle === 'string' ? query.categoria_detalle.trim() : '';

  try {
    let queryBuilder = supabaseAdmin
      .from('pilots')
      .select('*')
      .order('numero', { ascending: true, nullsFirst: true })
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true });

    if (categoria !== 'todos') {
      if (categoria === 'moto_enduro') {
        queryBuilder = queryBuilder.eq('categoria', 'moto').eq('tipo_campeonato', 'enduro');
        if (categoriaDetalle) queryBuilder = queryBuilder.eq('categoria_enduro', categoriaDetalle);
      } else if (categoria === 'moto_travesias') {
        queryBuilder = queryBuilder.eq('categoria', 'moto').eq('tipo_campeonato', 'travesias');
        if (categoriaDetalle) queryBuilder = queryBuilder.eq('categoria_travesia_moto', categoriaDetalle);
      } else if (categoria === 'moto') {
        queryBuilder = queryBuilder.in('categoria', ['moto', 'cuatri']);
      } else if (!['auto', 'cuatri'].includes(categoria)) {
        return res.status(400).json({ error: 'Categoría debe ser todos, auto, moto, moto_enduro, moto_travesias o cuatri' });
      } else {
        queryBuilder = queryBuilder.eq('categoria', categoria);
        if (categoria === 'auto' && categoriaDetalle) queryBuilder = queryBuilder.eq('categoria_auto', categoriaDetalle);
        if (categoria === 'cuatri' && categoriaDetalle) queryBuilder = queryBuilder.eq('categoria_cuatri', categoriaDetalle);
      }
    }

    const { data: rawPilots, error } = await queryBuilder;
    if (error) throw error;
    let pilots = rawPilots || [];

    if (categoria === 'moto' && categoriaDetalle) {
      pilots = pilots.filter(
        (p: any) =>
          p.categoria_enduro === categoriaDetalle ||
          p.categoria_travesia_moto === categoriaDetalle ||
          (p.categoria === 'cuatri' && p.categoria_cuatri === categoriaDetalle)
      );
    }

    const label =
      categoria === 'todos'
        ? 'Todas las categorías'
        : categoria === 'auto'
          ? 'Auto'
          : categoria === 'moto'
            ? 'Moto y Cuatriciclos'
            : categoria === 'moto_enduro'
              ? 'Moto (Enduro)'
              : categoria === 'moto_travesias'
                ? 'Moto (Travesías)'
                : 'Cuatriciclo';
    const labelWithDetalle = categoriaDetalle ? `${label} — ${categoriaDetalle}` : label;
    const useLandscape = ['auto', 'moto', 'moto_enduro', 'moto_travesias', 'cuatri'].includes(categoria);
    const buffer = await generatePlanillaInscripcionPDF(pilots, labelWithDetalle, useLandscape);

    if (!buffer || buffer.length === 0) {
      return res.status(500).json({ error: 'No se pudo generar el PDF (buffer vacío)' });
    }

    const base64 = buffer.toString('base64');
    return res.status(200).json({ pdf: base64, filename: `planilla-inscripcion-${categoria}.pdf` });
  } catch (e: any) {
    console.error('Planilla inscripcion error:', e);
    return res.status(500).json({ error: e?.message || 'Error al generar la planilla' });
  }
}
