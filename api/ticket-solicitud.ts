import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabase';

/**
 * POST /api/ticket-solicitud - Público: enviar solicitud de ticket (nombre, email, comprobante en base64)
 * GET /api/ticket-solicitud?email=xxx - Público: consultar estado de mis solicitudes por email
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, query } = req;
  const path = url?.split('?')[0] || '';

  if (method === 'POST' && (path === '/api/ticket-solicitud' || path.endsWith('/ticket-solicitud'))) {
    try {
      const body = req.body || {};
      const { nombre, email, comprobanteBase64, fileName } = body;
      if (!nombre || !email) {
        return res.status(400).json({ error: 'Nombre y email son requeridos' });
      }
      if (!comprobanteBase64 || typeof comprobanteBase64 !== 'string') {
        return res.status(400).json({ error: 'El comprobante de pago (imagen) es obligatorio' });
      }
      let comprobante_pago_url: string | null = null;
      {
        const buf = Buffer.from(comprobanteBase64, 'base64');
        const ext = (fileName && String(fileName).split('.').pop()) || 'jpg';
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { data: upload, error: uploadError } = await supabaseAdmin.storage
          .from('comprobantes-pago')
          .upload(safeName, buf, { contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`, upsert: false });
        if (uploadError) {
          console.error('Upload comprobante error:', uploadError);
          return res.status(500).json({ error: 'Error al subir el comprobante. Reintentá.' });
        }
        const { data: urlData } = supabaseAdmin.storage.from('comprobantes-pago').getPublicUrl(upload.path);
        comprobante_pago_url = urlData?.publicUrl || null;
      }
      if (!comprobante_pago_url) {
        return res.status(500).json({ error: 'Error al guardar el comprobante.' });
      }
      const { data: sol, error } = await supabaseAdmin
        .from('ticket_solicitudes')
        .insert({ nombre, email, comprobante_pago_url, estado: 'pendiente' })
        .select('id, estado, created_at')
        .single();
      if (error) {
        console.error('Insert ticket_solicitud error:', error);
        return res.status(500).json({ error: 'Error al registrar la solicitud.' });
      }
      return res.status(201).json({ message: 'Solicitud recibida. Te avisaremos cuando sea aprobada.', id: sol.id });
    } catch (e: any) {
      console.error('Ticket solicitud POST error:', e);
      return res.status(500).json({ error: 'Error al enviar la solicitud.' });
    }
  }

  if (method === 'GET' && (path === '/api/ticket-solicitud' || path.endsWith('/ticket-solicitud'))) {
    try {
      const email = (query.email as string)?.trim();
      if (!email) {
        return res.status(400).json({ error: 'Indicá tu email para consultar' });
      }
      const { data: list, error } = await supabaseAdmin
        .from('ticket_solicitudes')
        .select('id, nombre, email, estado, comprobante_pago_url, ticket_id, created_at')
        .eq('email', email)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Get ticket_solicitudes error:', error);
        return res.status(500).json({ error: 'Error al consultar.' });
      }
      const tickets: { [id: string]: { codigo: string } } = {};
      if (list?.length) {
        const ids = list.map((s: any) => s.ticket_id).filter(Boolean);
        if (ids.length) {
          const { data: t } = await supabaseAdmin.from('tickets').select('id, codigo').in('id', ids);
          if (t) t.forEach((x: any) => { tickets[x.id] = { codigo: x.codigo }; });
        }
      }
      const out = (list || []).map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        email: s.email,
        estado: s.estado,
        comprobante_pago_url: s.comprobante_pago_url,
        ticket_codigo: s.ticket_id ? tickets[s.ticket_id]?.codigo : null,
        created_at: s.created_at
      }));
      return res.json(out);
    } catch (e: any) {
      console.error('Ticket solicitud GET error:', e);
      return res.status(500).json({ error: 'Error al consultar.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
