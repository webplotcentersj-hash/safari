import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateToken, requireAdmin } from '../_utils/auth';

/**
 * GET /api/admin/me — Verifica que el token de admin sea válido.
 * Útil para diagnosticar si el problema es de auth o de otra ruta.
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

  try {
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      return res.status(403).json({ error: 'Acceso denegado', ok: false });
    }
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ ok: true, email: user.email });
  } catch (e: any) {
    console.error('admin/me error:', e);
    return res.status(500).json({ error: e?.message || 'Error', ok: false });
  }
}
