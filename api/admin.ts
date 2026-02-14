import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_utils/supabase';
import { authenticateToken, requireAdmin } from './_utils/auth';
import { generateTicketPDF, generatePlanillaInscripcionPDF } from './_utils/pdfGenerator';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, query, body } = req;
  const path = url?.split('?')[0] || '';
  const q = query || {};

  // Rewrite: /api/health → /api/admin?__route=health (reduce Serverless Functions en Vercel Hobby)
  if (String((q as any).__route) === 'health') {
    return res.json({ status: 'ok', message: 'Safari API is running' });
  }

  // Rewrite: /api/public/race-display → pantalla pública (sin auth)
  if (String((q as any).__route) === 'public-race-display') {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const [statusRes, timesRes] = await Promise.all([
        supabaseAdmin.from('race_status').select('semaphore, stop_message, updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabaseAdmin.from('race_times').select(`
          id, pilot_id, categoria, categoria_detalle, tiempo_segundos, tiempo_formato, etapa, fecha,
          pilots (id, nombre, apellido, numero, categoria, categoria_auto, categoria_moto)
        `).order('tiempo_segundos', { ascending: true })
      ]);
      const status = statusRes.data;
      const times = timesRes.data || [];
      const timesError = timesRes.error;
      if (statusRes.error) console.error('race_status error:', statusRes.error);
      if (timesError) console.error('race_times error:', timesError);
      return res.status(200).json({
        semaphore: status?.semaphore ?? 'green',
        stop_message: status?.stop_message ?? null,
        updated_at: status?.updated_at ?? null,
        times: timesError ? [] : (times || [])
      });
    } catch (e: unknown) {
      console.error('public-race-display error:', e);
      return res.status(500).json({ error: 'Error al cargar la pantalla de carrera' });
    }
  }

  // Rewrite: /api/public/rccronos-schedule → extrae tabla TRAMO/HORA/TIEMPOS de RC Cronos (sin auth)
  if (String((q as any).__route) === 'public-rccronos-schedule') {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const RCCRONOS_URL = 'https://rccronos.com.ar/safari-tras-la-sierra-2026/';
    const defaultEtapas = [
      { nombre: 'ETAPA UNO', ordenDia: 'ORDEN DIA 1', ordenDiaLink: 'https://drive.google.com/file/d/1HiqvGjxJqDZGxjH8aPpcjSMzATWGyRfH/view?usp=drive_link', tramos: [
        { tramo: 'PE1: USMO - BALDE DE LAS CHILCA', hora: '09:00HS', tiempos: 'PE/GRAL', tiemposLink: 'https://drive.google.com/file/d/1dUAyVmWzdLVG53CLVMemfNGy4vOs_PQI/view?usp=drive_link' },
        { tramo: 'PE2: BALDE DE LAS CHICA - COQUI QUINTANA', hora: '09:30HS', tiempos: 'PE/GRAL', tiemposLink: 'https://drive.google.com/file/d/1EyPCLdgQyFGbq-FB3IbDsE9eqzXePub1/view?usp=drive_link' }
      ]},
      { nombre: 'ETAPA DOS', ordenDia: 'ORDEN DIA 2', ordenDiaLink: 'https://drive.google.com/file/d/1jL6DPDhMaIK50Ud7R8hMDMg8fk2_tiSV/view?usp=drive_link', tramos: [
        { tramo: 'PE3: BALDE DE LAS CHILCAS - COQUI QUINTANA', hora: '09:00HS', tiempos: 'PE/GRAL', tiemposLink: 'https://drive.google.com/file/d/1PD2o-szuFyIMyBAqBvAW57ubGAy6O5HX/view?usp=drive_link' }
      ]}
    ];
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      // Caché corta para que la página de tiempos muestre lo actualizado de RC Cronos (poll cada 10s)
      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
      const response = await fetch(RCCRONOS_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        return res.status(200).json({ source: RCCRONOS_URL, updatedAt: new Date().toISOString(), etapas: defaultEtapas });
      }
      const html = await response.text();
      type RowWithRaw = { tramo: string; hora: string; tiempos: string; rawRow?: string };
      /** Extrae el href del primer enlace en la celda N (1-based) de la fila */
      const linkFromCell = (rawRow: string | undefined, cellIndex1Based: number): string | undefined => {
        if (!rawRow) return undefined;
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let idx = 0;
        let m;
        while ((m = cellRegex.exec(rawRow)) !== null) {
          idx++;
          if (idx === cellIndex1Based) {
            const href = m[1].match(/<a\s+href=["']([^"']+)["']/i);
            return href ? href[1] : undefined;
          }
        }
        return undefined;
      };
      const rows: RowWithRaw[] = [];
      const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || [];
      let tableBody: string | null = null;
      for (const tbl of allTables) {
        const inner = tbl.replace(/^<table[^>]*>|<\/table>$/gi, '');
        if (/PE1|TRAMO|ETAPA\s+UNO/i.test(inner)) { tableBody = inner; break; }
      }
      const firstTable = allTables[0];
      if (!tableBody && firstTable) tableBody = firstTable.replace(/^<table[^>]*>|<\/table>$/gi, '');
      if (tableBody) {
        const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let trMatch;
        while ((trMatch = trRegex.exec(tableBody)) !== null) {
          const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
          const cells: string[] = [];
          let cellMatch;
          while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
            cells.push(cellMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
          }
          if (cells.length >= 1) {
            const tramo = cells[0] || '';
            const hora = cells.length >= 2 ? cells[1] : '';
            const tiempos = cells.length >= 3 ? cells[2] : '';
            if (tramo.trim()) rows.push({ tramo, hora, tiempos, rawRow: trMatch[1] });
          }
        }
      }
      const ordenDiaLinkFromRaw = (rawRow: string | undefined) => linkFromCell(rawRow, 2);
      type TramoRow = { tramo: string; hora: string; tiempos: string; tiemposLink?: string };
      type EtapaItem = { nombre: string; ordenDia?: string; ordenDiaLink?: string; tramos: TramoRow[] };
      const etapas: EtapaItem[] = [];
      let currentEtapa: EtapaItem | null = null;
      const ordenDiaFallback: Record<string, { texto: string; link: string }> = {
        'ETAPA UNO': { texto: 'ORDEN DIA 1', link: 'https://drive.google.com/file/d/1HiqvGjxJqDZGxjH8aPpcjSMzATWGyRfH/view?usp=drive_link' },
        'ETAPA DOS': { texto: 'ORDEN DIA 2', link: 'https://drive.google.com/file/d/1jL6DPDhMaIK50Ud7R8hMDMg8fk2_tiSV/view?usp=drive_link' }
      };
      const skipHeaders = (t: string) => /^(TRAMO|HORA|TIEMPOS)$/i.test(t.trim());
      for (const row of rows) {
        if (skipHeaders(row.tramo)) continue;
        const isEtapaHeader = /ETAPA\s+(UNO|DOS|TRES|ONE|TWO|1|2|3)/i.test(row.tramo) && !/^PE\d/i.test(row.tramo);
        if (isEtapaHeader) {
          const ordenDia = row.hora?.trim() || ordenDiaFallback[row.tramo.toUpperCase()]?.texto;
          const ordenDiaLink = ordenDiaLinkFromRaw(row.rawRow) || ordenDiaFallback[row.tramo.toUpperCase()]?.link;
          currentEtapa = {
            nombre: row.tramo,
            ordenDia: ordenDia || undefined,
            ordenDiaLink: ordenDiaLink || undefined,
            tramos: []
          };
          etapas.push(currentEtapa);
        } else if (currentEtapa) {
          currentEtapa.tramos.push({
            tramo: row.tramo,
            hora: row.hora,
            tiempos: row.tiempos,
            tiemposLink: linkFromCell(row.rawRow, 3)
          });
        } else {
          currentEtapa = {
            nombre: '',
            tramos: [{
              tramo: row.tramo,
              hora: row.hora,
              tiempos: row.tiempos,
              tiemposLink: linkFromCell(row.rawRow, 3)
            }]
          };
          etapas.push(currentEtapa);
        }
      }
      if (etapas.length === 0 && rows.length > 0) {
        etapas.push({ nombre: 'Programa', tramos: rows.filter((r) => !skipHeaders(r.tramo)) });
      }
      const hasTramos = etapas.some((e) => e.tramos.length > 0);
      return res.status(200).json({
        source: RCCRONOS_URL,
        updatedAt: new Date().toISOString(),
        etapas: hasTramos ? etapas : defaultEtapas
      });
    } catch (e: unknown) {
      console.error('public-rccronos-schedule error:', e);
      return res.status(200).json({
        source: RCCRONOS_URL,
        updatedAt: new Date().toISOString(),
        etapas: defaultEtapas
      });
    }
  }

  // Rewrite: /api/public/prensa/pilots → todos los inscriptos (aprobados y pendientes), para página Prensa (sin auth)
  if (String((q as any).__route) === 'public-prensa-pilots') {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      const { data: pilots, error } = await supabaseAdmin
        .from('pilots')
        .select('id, nombre, apellido, numero, categoria, categoria_auto, categoria_moto, categoria_enduro, categoria_travesia_moto, categoria_cuatri, tipo_campeonato, provincia, departamento, copiloto_nombre')
        .order('categoria', { ascending: true })
        .order('numero', { ascending: true });
      if (error) {
        console.error('public-prensa-pilots error:', error);
        return res.status(500).json({ error: 'Error al obtener datos para prensa' });
      }
      return res.status(200).json(Array.isArray(pilots) ? pilots : []);
    } catch (e: unknown) {
      console.error('public-prensa-pilots error:', e);
      return res.status(500).json({ error: 'Error al obtener datos para prensa' });
    }
  }

  // Rewrite: /api/public/prensa/planilla-excel → Excel para prensa (todos los inscriptos, orden por categoría, resumen)
  if (String((q as any).__route) === 'public-prensa-planilla-excel') {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const rawCat = (q as any).categoria;
      const rawDet = (q as any).categoria_detalle;
      const categoria = String(Array.isArray(rawCat) ? rawCat[0] : rawCat || 'todos').toLowerCase().trim();
      const categoriaDetalle = (Array.isArray(rawDet) ? rawDet[0] : rawDet) ? String(Array.isArray(rawDet) ? rawDet[0] : rawDet).trim() : '';

      let queryBuilder = supabaseAdmin
        .from('pilots')
        .select('*');

      if (categoria !== 'todos') {
        if (categoria === 'moto_enduro') {
          queryBuilder = queryBuilder.eq('categoria', 'moto').eq('tipo_campeonato', 'enduro');
          if (categoriaDetalle) queryBuilder = queryBuilder.eq('categoria_enduro', categoriaDetalle);
        } else if (categoria === 'moto_travesias') {
          queryBuilder = queryBuilder.eq('categoria', 'moto').eq('tipo_campeonato', 'travesias');
          if (categoriaDetalle) queryBuilder = queryBuilder.eq('categoria_travesia_moto', categoriaDetalle);
        } else if (categoria === 'moto') {
          queryBuilder = queryBuilder.in('categoria', ['moto', 'cuatri']);
        } else {
          queryBuilder = queryBuilder.eq('categoria', categoria);
          if (categoria === 'auto' && categoriaDetalle) queryBuilder = queryBuilder.eq('categoria_auto', categoriaDetalle);
          if (categoria === 'cuatri' && categoriaDetalle) queryBuilder = queryBuilder.eq('categoria_cuatri', categoriaDetalle);
        }
      }

      const { data: rawPilots, error } = await queryBuilder;
      if (error) {
        console.error('public-prensa-planilla-excel query error:', error);
        return res.status(500).json({ error: 'Error al obtener pilotos' });
      }
      let pilots = (rawPilots || []) as any[];

      if (categoria === 'moto' && categoriaDetalle) {
        pilots = pilots.filter((p: any) =>
          p.categoria_enduro === categoriaDetalle ||
          p.categoria_travesia_moto === categoriaDetalle ||
          (p.categoria === 'cuatri' && p.categoria_cuatri === categoriaDetalle) ||
          (p.categoria === 'moto' && (p.categoria_moto === categoriaDetalle || p.categoria_moto_china === categoriaDetalle))
        );
      }

      const catOrder: Record<string, number> = { auto: 1, moto: 2, cuatri: 3 };
      const getCatDetalle = (p: any) => {
        if (p.categoria === 'auto') return p.categoria_auto || '';
        if (p.categoria === 'moto') return p.categoria_enduro || p.categoria_travesia_moto || p.categoria_moto || p.categoria_moto_china || '';
        if (p.categoria === 'cuatri') return p.categoria_cuatri || '';
        return '';
      };
      pilots.sort((a, b) => {
        const oA = catOrder[a.categoria] ?? 9;
        const oB = catOrder[b.categoria] ?? 9;
        if (oA !== oB) return oA - oB;
        const dA = getCatDetalle(a);
        const dB = getCatDetalle(b);
        if (dA !== dB) return dA.localeCompare(dB);
        const nA = a.numero != null ? Number(a.numero) : 9999;
        const nB = b.numero != null ? Number(b.numero) : 9999;
        return nA - nB;
      });

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Inscriptos prensa', { views: [{ state: 'frozen', ySplit: 1 }] });
      sheet.columns = [
        { header: 'Nombre', key: 'nombre', width: 28 },
        { header: 'Categoría', key: 'categoria', width: 22 },
        { header: 'Número', key: 'numero', width: 10 },
        { header: 'Provincia', key: 'provincia', width: 18 },
        { header: 'Departamento', key: 'departamento', width: 18 },
        { header: 'Copiloto', key: 'copiloto_nombre', width: 22 }
      ];

      sheet.addRow([]);
      sheet.addRow(['SAFARI TRAS LAS SIERRAS — PRENSA']);
      sheet.addRow(['Listado de inscriptos']);
      sheet.addRow([`Generado: ${new Date().toLocaleString('es-AR')} · ${pilots.length} inscripto(s)`]);
      sheet.addRow([]);
      sheet.addRow(['Nombre', 'Categoría', 'Número', 'Provincia', 'Departamento', 'Copiloto']);

      for (const p of pilots) {
        let catLabel = p.categoria === 'auto' ? (p.categoria_auto || 'Auto') : p.categoria === 'moto' ? (p.categoria_enduro || p.categoria_travesia_moto || p.categoria_moto || p.categoria_moto_china || 'Moto') : p.categoria === 'cuatri' ? (p.categoria_cuatri || 'Cuatriciclo') : p.categoria || '';
        sheet.addRow({
          nombre: `${(p.nombre || '').trim()} ${(p.apellido || '').trim()}`.trim(),
          categoria: catLabel,
          numero: p.numero != null ? String(p.numero) : '',
          provincia: p.provincia || '',
          departamento: p.departamento || '',
          copiloto_nombre: p.copiloto_nombre || ''
        });
      }

      const byCat: Record<string, number> = {};
      for (const p of pilots) {
        let k = p.categoria === 'auto' ? 'Auto' : p.categoria === 'moto' ? 'Moto' : p.categoria === 'cuatri' ? 'Cuatriciclo' : p.categoria || 'Otro';
        const det = getCatDetalle(p);
        if (det) k += ` — ${det}`;
        byCat[k] = (byCat[k] || 0) + 1;
      }
      sheet.addRow([]);
      sheet.addRow(['Resumen por categoría']);
      for (const [label, count] of Object.entries(byCat).sort(([a], [b]) => a.localeCompare(b))) {
        sheet.addRow([label, count]);
      }

      const filenamePart = categoriaDetalle
        ? `prensa-inscriptos-${categoria}-${categoriaDetalle.replace(/[^a-z0-9\u00C0-\u024F\-]/gi, '-')}.xlsx`
        : `prensa-inscriptos-${categoria}.xlsx`;
      const safeFilename = encodeURIComponent(filenamePart);

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filenamePart}"; filename*=UTF-8''${safeFilename}`);
      res.setHeader('X-Filename', filenamePart);
      res.status(200);
      await workbook.xlsx.write(res);
      return res.end();
    } catch (e: any) {
      console.error('public-prensa-planilla-excel error:', e);
      return res.status(500).json({ error: e?.message || 'Error al generar el Excel' });
    }
  }

  // Rewrite: /api/admin-setup → /api/admin?__route=admin-setup (reduce Serverless Functions)
  if (String((q as any).__route) === 'admin-setup') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const secretHeader =
        (req.headers['x-admin-setup-secret'] as string | undefined) ||
        (req.headers['X-Admin-Setup-Secret'] as string | undefined);
      const expectedSecret = process.env.ADMIN_SETUP_SECRET;
      if (!expectedSecret) {
        return res.status(500).json({ error: 'ADMIN_SETUP_SECRET no configurado en el servidor' });
      }
      if (!secretHeader || secretHeader !== expectedSecret) {
        return res.status(403).json({ error: 'Acceso denegado' });
      }
      const { email, password } = (body as any) || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
      }
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      if (error || !created?.user) {
        console.error('Create admin user error:', error);
        return res.status(500).json({ error: error?.message || 'No se pudo crear el usuario admin' });
      }
      const { error: upsertError } = await supabaseAdmin
        .from('users')
        .upsert({ id: created.user.id, email, role: 'admin' }, { onConflict: 'id' });
      if (upsertError) console.error('Upsert users role error:', upsertError);
      return res.status(201).json({
        message: 'Usuario admin creado',
        user: { id: created.user.id, email }
      });
    } catch (e: any) {
      console.error('Admin-setup crashed:', e);
      return res.status(500).json({ error: 'Error al crear el usuario admin' });
    }
  }

  // Rewrite: /api/ticket-solicitud → /api/admin?__route=ticket-solicitud (para no superar límite de funciones)
  if (String((q as any).__route) === 'ticket-solicitud') {
    if (method === 'POST') {
      try {
        const { nombre, email, comprobanteBase64, fileName, cantidad: cantidadBody } = body || {};
        if (!nombre || !email) return res.status(400).json({ error: 'Nombre y email son requeridos' });
        if (!comprobanteBase64 || typeof comprobanteBase64 !== 'string') return res.status(400).json({ error: 'El comprobante de pago (imagen o PDF) es obligatorio' });
        const cantidad = Math.max(1, Math.min(100, parseInt(String(cantidadBody || 1), 10) || 1));
        const buf = Buffer.from(comprobanteBase64, 'base64');
        const rawExt = (fileName && String(fileName).split('.').pop()?.toLowerCase()) || 'jpg';
        const ext = rawExt === 'pdf' ? 'pdf' : rawExt === 'png' ? 'png' : 'jpg';
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const contentType = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg';
        const { data: upload, error: uploadError } = await supabaseAdmin.storage.from('comprobantes-pago').upload(safeName, buf, { contentType, upsert: false });
        if (uploadError) { console.error('Upload comprobante error:', uploadError); return res.status(500).json({ error: 'Error al subir el comprobante. Reintentá.' }); }
        const { data: urlData } = supabaseAdmin.storage.from('comprobantes-pago').getPublicUrl(upload.path);
        const comprobante_pago_url = urlData?.publicUrl || null;
        if (!comprobante_pago_url) return res.status(500).json({ error: 'Error al guardar el comprobante.' });
        const { data: sol, error } = await supabaseAdmin.from('ticket_solicitudes').insert({ nombre, email, comprobante_pago_url, estado: 'pendiente', cantidad }).select('id, estado, created_at').single();
        if (error) { console.error('Insert ticket_solicitud error:', error); return res.status(500).json({ error: 'Error al registrar la solicitud.' }); }
        return res.status(201).json({ message: 'Solicitud recibida. Te avisaremos cuando sea aprobada.', id: sol.id });
      } catch (e: any) { console.error('Ticket solicitud POST error:', e); return res.status(500).json({ error: 'Error al enviar la solicitud.' }); }
    }
    if (method === 'GET') {
      try {
        const email = (q.email as string)?.trim();
        if (!email) return res.status(400).json({ error: 'Indicá tu email para consultar' });
        const { data: list, error } = await supabaseAdmin.from('ticket_solicitudes').select('id, nombre, email, estado, comprobante_pago_url, ticket_id, cantidad, created_at').eq('email', email).order('created_at', { ascending: false });
        if (error) { console.error('Get ticket_solicitudes error:', error); return res.status(500).json({ error: 'Error al consultar.' }); }
        const ticketCodigosBySolicitud: { [solicitudId: string]: string[] } = {};
        if (list?.length) {
          const { data: tList } = await supabaseAdmin.from('tickets').select('id, codigo, solicitud_id').in('solicitud_id', list.map((s: any) => s.id));
          if (tList) {
            for (const t of tList) {
              const sid = t.solicitud_id;
              if (sid) {
                if (!ticketCodigosBySolicitud[sid]) ticketCodigosBySolicitud[sid] = [];
                ticketCodigosBySolicitud[sid].push(t.codigo);
              }
            }
          }
          for (const s of list) {
            if (!ticketCodigosBySolicitud[s.id] && (s as any).ticket_id) {
              const { data: one } = await supabaseAdmin.from('tickets').select('codigo').eq('id', (s as any).ticket_id).single();
              if (one) ticketCodigosBySolicitud[s.id] = [one.codigo];
            }
          }
        }
        const out = (list || []).map((s: any) => ({
          id: s.id, nombre: s.nombre, email: s.email, estado: s.estado, comprobante_pago_url: s.comprobante_pago_url,
          cantidad: s.cantidad ?? 1,
          ticket_codigos: ticketCodigosBySolicitud[s.id] || [],
          ticket_codigo: (ticketCodigosBySolicitud[s.id] && ticketCodigosBySolicitud[s.id][0]) || null,
          created_at: s.created_at
        }));
        return res.json(out);
      } catch (e: any) { console.error('Ticket solicitud GET error:', e); return res.status(500).json({ error: 'Error al consultar.' }); }
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rewrite: GET /api/admin/pilots → /api/admin?__route=pilots (listado público para el dashboard)
  if (method === 'GET' && String((q as any).__route) === 'pilots') {
    try {
      const numeroParam = (q.numero as string) || (Array.isArray(q.numero) ? q.numero[0] : undefined);
      let queryBuilder = supabaseAdmin.from('pilots').select('*');
      if (numeroParam) {
        const numero = parseInt(String(numeroParam), 10);
        if (!isNaN(numero)) queryBuilder = queryBuilder.eq('numero', numero);
      } else {
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
      }
      const { data: pilots, error } = await queryBuilder;
      if (error) {
        console.error('Get pilots (__route=pilots) error:', error);
        return res.status(500).json({ error: 'Error al obtener pilotos', details: error.message });
      }
      const pilotsArray = Array.isArray(pilots) ? pilots : [];
      if (numeroParam && pilotsArray.length > 0) return res.status(200).json(pilotsArray[0]);
      return res.status(200).json(pilotsArray);
    } catch (e: any) {
      console.error('Get pilots (__route=pilots) catch:', e);
      return res.status(500).json({ error: 'Error al obtener pilotos', details: e?.message });
    }
  }

  // Crear cliente con token del usuario autenticado para consultas que respetan RLS
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  const supabaseWithAuth = token && supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  }) : null;

  // Rewrite: /api/admin/ticket-solicitudes → /api/admin?__subpath=ticket-solicitudes (Vercel no enruta /api/admin/xxx a admin.ts)
  if (String((q as any).__subpath) === 'ticket-solicitudes') {
    if (!token) return res.status(401).json({ error: 'No autorizado' });
    if (method === 'GET') {
      try {
        const client = supabaseWithAuth || supabaseAdmin;
        const { data: list, error } = await client.from('ticket_solicitudes').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        const out = list || [];
        if (out.length) {
          const { data: ticketsBySol } = await supabaseAdmin.from('tickets').select('solicitud_id, codigo').in('solicitud_id', out.map((s: any) => s.id));
          const bySol: { [id: string]: string[] } = {};
          if (ticketsBySol) for (const t of ticketsBySol) {
            if (t.solicitud_id) { if (!bySol[t.solicitud_id]) bySol[t.solicitud_id] = []; bySol[t.solicitud_id].push(t.codigo); }
          }
          for (const s of out) {
            (s as any).ticket_codigos = bySol[s.id] || [];
            if (!(s as any).cantidad) (s as any).cantidad = 1;
          }
        }
        return res.json(out);
      } catch (e: any) {
        console.error('Get ticket-solicitudes error:', e);
        return res.status(500).json({ error: 'Error al listar solicitudes' });
      }
    }
    if (method === 'PATCH') {
      const action = String((q as any).__action);
      const id = String((q as any).__id || (q as any).id || '').trim();
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      try {
        const { data: sol, error: fetchErr } = await supabaseAdmin.from('ticket_solicitudes').select('*').eq('id', id).single();
        if (fetchErr || !sol) return res.status(404).json({ error: 'Solicitud no encontrada' });
        if (sol.estado !== 'pendiente') return res.status(400).json({ error: 'La solicitud ya fue procesada' });
        if (action === 'reject') {
          await supabaseAdmin.from('ticket_solicitudes').update({ estado: 'rechazado' }).eq('id', id);
          return res.json({ message: 'Solicitud rechazada' });
        }
        if (action === 'approve') {
          const cantidad = Math.max(1, Math.min(100, parseInt(String((sol as any).cantidad || 1), 10) || 1));
          const codigos: string[] = [];
          let firstTicketId: string | null = null;
          for (let i = 0; i < cantidad; i++) {
            const codigo = `TKT-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const { data: newTicket, error: ticketErr } = await supabaseAdmin.from('tickets').insert({
              codigo, tipo: 'general', nombre: sol.nombre, dni: null, email: sol.email, precio: 0, usado: false, solicitud_id: id
            }).select('id').single();
            if (ticketErr) { console.error('Create ticket on approve error:', ticketErr); return res.status(500).json({ error: 'Error al crear el ticket' }); }
            codigos.push(codigo);
            if (!firstTicketId) firstTicketId = newTicket.id;
          }
          await supabaseAdmin.from('ticket_solicitudes').update({ estado: 'aprobado', ticket_id: firstTicketId }).eq('id', id);
          return res.json({ message: `Solicitud aprobada. ${cantidad} ticket(s) creado(s).`, ticket_id: firstTicketId, codigos, codigo: codigos[0] });
        }
        return res.status(400).json({ error: 'Acción no válida' });
      } catch (e: any) {
        console.error('Patch ticket-solicitud error:', e);
        return res.status(500).json({ error: 'Error al procesar' });
      }
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Setup (solo para bootstrap del primer admin) - protegido por secreto
  // POST /api/admin/setup/create-admin { email, password }
  if (method === 'POST' && path === '/api/admin/setup/create-admin') {
    try {
      const secretHeader = (req.headers['x-admin-setup-secret'] || req.headers['X-Admin-Setup-Secret']) as string | undefined;
      const expectedSecret = process.env.ADMIN_SETUP_SECRET;

      if (!expectedSecret) {
        return res.status(500).json({ error: 'ADMIN_SETUP_SECRET no configurado en el servidor' });
      }

      if (!secretHeader || secretHeader !== expectedSecret) {
        return res.status(403).json({ error: 'Acceso denegado' });
      }

      const { email, password } = body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
      }

      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (error || !created?.user) {
        console.error('Create admin user error:', error);
        return res.status(500).json({ error: error?.message || 'No se pudo crear el usuario admin' });
      }

      // Asegurar rol admin en public.users (por si el trigger no corre)
      const { error: upsertError } = await supabaseAdmin
        .from('users')
        .upsert({ id: created.user.id, email, role: 'admin' }, { onConflict: 'id' });

      if (upsertError) {
        console.error('Upsert users role error:', upsertError);
        // no fallamos el alta del auth user
      }

      return res.status(201).json({
        message: 'Usuario admin creado',
        user: { id: created.user.id, email }
      });
    } catch (e: any) {
      console.error('Setup create-admin crashed:', e);
      return res.status(500).json({ error: 'Error al crear el usuario admin' });
    }
  }

  // Admin - Pilots (endpoint público para lectura, ya que las políticas RLS son públicas)
  if (method === 'GET' && path === '/api/admin/pilots') {
    try {
      console.log('=== GET /api/admin/pilots ===');
      console.log('Request URL:', url);
      console.log('Request path:', path);
      console.log('Query params:', query);
      
      // Usar supabaseAdmin que tiene service_role_key (bypass RLS) o anon_key como fallback
      // Esto asegura que podamos leer los datos independientemente de las políticas RLS
      console.log('Fetching pilots from Supabase using supabaseAdmin...');
      console.log('Supabase URL configured:', !!supabaseUrl);
      console.log('Anon key configured:', !!supabaseAnonKey);
      console.log('Service role key configured:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      
      // Si hay un parámetro de número, buscar por número
      const numeroParam = query.numero as string | undefined;
      let queryBuilder = supabaseAdmin
        .from('pilots')
        .select('*');
      
      if (numeroParam) {
        const numero = parseInt(numeroParam, 10);
        console.log('Buscando piloto por número:', numero);
        queryBuilder = queryBuilder.eq('numero', numero);
      } else {
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
      }
      
      // Intentar consultar la tabla pilots usando supabaseAdmin
      console.log('Querying pilots table...');
      const { data: pilots, error } = await queryBuilder;
      
      console.log('Query result - error:', error);
      console.log('Query result - data:', pilots);
      console.log('Query result - data length:', pilots?.length);

      if (error) {
        console.error('Get pilots error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return res.status(500).json({ 
          error: 'Error al obtener pilotos',
          details: error.message 
        });
      }
      
      console.log(`Successfully fetched ${pilots?.length || 0} pilots from database`);
      if (pilots && pilots.length > 0) {
        console.log('Sample pilot data:', {
          id: pilots[0].id,
          nombre: pilots[0].nombre,
          apellido: pilots[0].apellido,
          dni: pilots[0].dni,
          estado: pilots[0].estado
        });
      } else {
        console.warn('No pilots found in database');
      }
      
      // Si se buscó por número y hay resultados, devolver el primer piloto (objeto único)
      if (numeroParam && pilots && pilots.length > 0) {
        console.log(`Piloto encontrado por número ${numeroParam}:`, pilots[0]);
        return res.status(200).json(pilots[0]);
      }
      
      // Asegurarse de devolver un array siempre
      const pilotsArray = Array.isArray(pilots) ? pilots : [];
      console.log(`Returning ${pilotsArray.length} pilots to frontend`);
      
      return res.status(200).json(pilotsArray);
    } catch (error: any) {
      console.error('Get pilots error (catch):', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return res.status(500).json({ 
        error: 'Error al obtener pilotos',
        details: error.message 
      });
    }
  }

  // Resto de endpoints: requiere sesión admin
  const user = await authenticateToken(req);
  if (!user || !requireAdmin(user)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const bodySafe = (body as Record<string, unknown>) || {};
  if (method === 'GET' && String((q as any).__route) === 'race-status') {
    try {
      const client = supabaseWithAuth || supabaseAdmin;
      const { data, error } = await client
        .from('race_status')
        .select('id, semaphore, stop_message, updated_at')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({
        id: data?.id,
        semaphore: data?.semaphore ?? 'green',
        stop_message: data?.stop_message ?? '',
        updated_at: data?.updated_at ?? null
      });
    } catch (e: any) {
      console.error('GET race-status error:', e);
      return res.status(500).json({ error: 'Error al obtener el estado', details: e?.message });
    }
  }
  if (method === 'PATCH' && String((q as any).__route) === 'race-status') {
    try {
      const semaphore = bodySafe.semaphore as string | undefined;
      const stop_message = bodySafe.stop_message as string | undefined;
      if (!semaphore || !['green', 'red'].includes(semaphore)) {
        return res.status(400).json({ error: 'semaphore debe ser "green" o "red"' });
      }
      const client = supabaseWithAuth || supabaseAdmin;
      const { data: row, error: selectErr } = await client.from('race_status').select('id').limit(1).maybeSingle();
      if (selectErr) {
        console.error('PATCH race-status select error:', selectErr);
        return res.status(500).json({ error: 'Error al leer el estado', details: selectErr.message });
      }
      if (!row?.id) {
        const { data: inserted, error: insErr } = await client
          .from('race_status')
          .insert({ semaphore, stop_message: stop_message ?? null })
          .select('id, semaphore, stop_message, updated_at')
          .single();
        if (insErr) {
          console.error('PATCH race-status insert error:', insErr);
          return res.status(500).json({ error: 'Error al guardar el estado', details: insErr.message });
        }
        return res.status(200).json(inserted);
      }
      const { data: updated, error } = await client
        .from('race_status')
        .update({
          semaphore,
          stop_message: stop_message != null ? String(stop_message).trim() || null : null
        })
        .eq('id', row.id)
        .select('id, semaphore, stop_message, updated_at')
        .single();
      if (error) {
        console.error('PATCH race-status update error:', error);
        return res.status(500).json({ error: 'Error al actualizar el estado', details: error.message });
      }
      return res.status(200).json(updated);
    } catch (e: any) {
      console.error('PATCH race-status error:', e);
      return res.status(500).json({ error: 'Error al actualizar el estado', details: e?.message });
    }
  }
  if (method === 'PATCH' && String((q as any).__route) === 'pilot-status') {
    // Actualizar estado del piloto (rewrite desde /api/admin/pilots/:id/status)
    try {
      const id = String((q as any).__id || '').trim();
      const estado = bodySafe.estado as string;
      if (!id) return res.status(400).json({ error: 'ID de piloto requerido' });
      if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
      const { data, error } = await supabaseAdmin.from('pilots').update({ estado }).eq('id', id).select().single();
      if (error) {
        console.error('❌ Error de Supabase al actualizar estado:', error);
        return res.status(500).json({ error: 'Error al actualizar el estado', details: error.message });
      }
      return res.status(200).json({ message: 'Estado actualizado exitosamente', pilot: data });
    } catch (e: any) {
      console.error('❌ Update status error (pilot-status route):', e);
      return res.status(500).json({ error: 'Error al actualizar el estado', details: e?.message || 'Error desconocido' });
    }
  } else if (method === 'GET' && ((q as any).__route === 'planilla-inscripcion' || path === '/api/admin/planilla-inscripcion' || path.endsWith('/admin/planilla-inscripcion'))) {
    try {
      const rawCat = (q as any).categoria;
      const rawDet = (q as any).categoria_detalle;
      const categoria = String(Array.isArray(rawCat) ? rawCat[0] : rawCat || 'todos').toLowerCase().trim();
      const categoriaDetalle = (Array.isArray(rawDet) ? rawDet[0] : rawDet) ? String(Array.isArray(rawDet) ? rawDet[0] : rawDet).trim() : '';
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
        pilots = pilots.filter((p: any) =>
          p.categoria_enduro === categoriaDetalle ||
          p.categoria_travesia_moto === categoriaDetalle ||
          (p.categoria === 'cuatri' && p.categoria_cuatri === categoriaDetalle) ||
          (p.categoria === 'moto' && (p.categoria_moto === categoriaDetalle || p.categoria_moto_china === categoriaDetalle))
        );
      }
      let label = categoria === 'todos' ? 'Todas las categorías' : categoria === 'auto' ? 'Auto' : categoria === 'moto' ? 'Moto y Cuatriciclos' : categoria === 'moto_enduro' ? 'Moto (Enduro)' : categoria === 'moto_travesias' ? 'Moto (Travesías)' : 'Cuatriciclo';
      const labelWithDetalle = categoriaDetalle ? `${label} — ${categoriaDetalle}` : label;
      const useLandscape = ['auto', 'moto', 'moto_enduro', 'moto_travesias', 'cuatri'].includes(categoria);
      const buffer = await generatePlanillaInscripcionPDF(pilots, labelWithDetalle, useLandscape);
      if (!buffer || buffer.length === 0) {
        return res.status(500).json({ error: 'No se pudo generar el PDF (buffer vacío)' });
      }
      const filenamePart = categoriaDetalle
        ? `planilla-inscripcion-${categoria}-${categoriaDetalle.replace(/[^a-z0-9\u00C0-\u024F\-]/gi, '-')}.pdf`
        : `planilla-inscripcion-${categoria}.pdf`;
      const safeFilename = encodeURIComponent(filenamePart);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filenamePart}"; filename*=UTF-8''${safeFilename}`);
      res.setHeader('X-Filename', filenamePart);
      res.setHeader('Content-Length', String(buffer.length));
      return res.status(200).end(buffer);
    } catch (e: any) {
      console.error('Planilla inscripcion error:', e);
      return res.status(500).json({ error: e?.message || 'Error al generar la planilla' });
    }
  } else if (method === 'GET' && ((q as any).__route === 'planilla-inscripcion-excel' || path === '/api/admin/planilla-inscripcion-excel' || path.endsWith('/admin/planilla-inscripcion-excel'))) {
    try {
      const rawCat = (q as any).categoria;
      const rawDet = (q as any).categoria_detalle;
      const categoria = String(Array.isArray(rawCat) ? rawCat[0] : rawCat || 'todos').toLowerCase().trim();
      const categoriaDetalle = (Array.isArray(rawDet) ? rawDet[0] : rawDet) ? String(Array.isArray(rawDet) ? rawDet[0] : rawDet).trim() : '';

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
        pilots = pilots.filter((p: any) =>
          p.categoria_enduro === categoriaDetalle ||
          p.categoria_travesia_moto === categoriaDetalle ||
          (p.categoria === 'cuatri' && p.categoria_cuatri === categoriaDetalle) ||
          (p.categoria === 'moto' && (p.categoria_moto === categoriaDetalle || p.categoria_moto_china === categoriaDetalle))
        );
      }

      let label = categoria === 'todos' ? 'Todas las categorías' : categoria === 'auto' ? 'Auto' : categoria === 'moto' ? 'Moto y Cuatriciclos' : categoria === 'moto_enduro' ? 'Moto (Enduro)' : categoria === 'moto_travesias' ? 'Moto (Travesías)' : 'Cuatriciclo';
      const labelWithDetalle = categoriaDetalle ? `${label} — ${categoriaDetalle}` : label;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Planilla');

      sheet.columns = [
        { header: 'Nº', key: 'numero', width: 6 },
        { header: 'Apellido', key: 'apellido', width: 18 },
        { header: 'Nombre', key: 'nombre', width: 18 },
        { header: 'DNI', key: 'dni', width: 14 },
        { header: 'Domicilio', key: 'domicilio', width: 28 },
        { header: 'Teléfono', key: 'telefono', width: 16 },
        { header: 'Edad', key: 'edad', width: 6 },
        { header: 'Nacionalidad', key: 'nacionalidad', width: 14 },
        { header: 'Provincia', key: 'provincia', width: 14 },
        { header: 'Departamento', key: 'departamento', width: 14 },
        { header: 'Tel. acompañante', key: 'telefono_acompanante', width: 18 },
        { header: 'Licencia', key: 'licencia', width: 14 },
        { header: '¿Tiene licencia?', key: 'tiene_licencia', width: 16 },
        { header: 'Tipo vehículo', key: 'categoria', width: 14 },
        { header: 'Categoría detalle', key: 'categoria_detalle', width: 24 },
        { header: 'Estado', key: 'estado', width: 12 },
        { header: 'Fecha inscripción', key: 'created_at', width: 18 }
      ];

      sheet.addRow([]);
      sheet.addRow(['SAFARI TRAS LAS SIERRAS']);
      sheet.addRow(['Planilla de inscripción', labelWithDetalle]);
      sheet.addRow([`Generado: ${new Date().toLocaleString('es-AR')} · ${pilots.length} inscripto(s)`]);
      sheet.addRow([]);

      for (const p of pilots) {
        const tieneLic = p.tiene_licencia === true || p.tiene_licencia === 'si' || p.tiene_licencia === 'sí' ? 'Sí' : 'No';
        let catDetalle: string;
        if (p.categoria === 'auto') {
          catDetalle = p.categoria_auto || '—';
        } else if (p.categoria === 'moto') {
          catDetalle = p.categoria_enduro || p.categoria_travesia_moto || p.categoria_moto || p.categoria_moto_china || '—';
        } else if (p.categoria === 'cuatri') {
          catDetalle = p.categoria_cuatri || '—';
        } else {
          catDetalle = '—';
        }
        sheet.addRow({
          numero: p.numero != null ? String(p.numero).padStart(2, '0') : '',
          apellido: p.apellido || '',
          nombre: p.nombre || '',
          dni: p.dni || '',
          domicilio: p.domicilio || '',
          telefono: p.telefono || '',
          edad: p.edad != null ? p.edad : '',
          nacionalidad: p.nacionalidad || '',
          provincia: p.provincia || '',
          departamento: p.departamento || '',
          telefono_acompanante: p.telefono_acompanante || '',
          licencia: p.licencia || '',
          tiene_licencia: tieneLic,
          categoria: p.categoria || '',
          categoria_detalle: catDetalle,
          estado: p.estado || '',
          created_at: p.created_at ? new Date(p.created_at).toLocaleString('es-AR') : ''
        });
      }

      const filenamePart = categoriaDetalle
        ? `planilla-inscripcion-${categoria}-${categoriaDetalle.replace(/[^a-z0-9\u00C0-\u024F\-]/gi, '-')}.xlsx`
        : `planilla-inscripcion-${categoria}.xlsx`;
      const safeFilename = encodeURIComponent(filenamePart);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filenamePart}"; filename*=UTF-8''${safeFilename}`);
      res.setHeader('X-Filename', filenamePart);
      res.statusCode = 200;
      await workbook.xlsx.write(res);
      return res.end();
    } catch (e: any) {
      console.error('Planilla inscripcion Excel error:', e);
      return res.status(500).json({ error: e?.message || 'Error al generar la planilla Excel' });
    }
  } else if (method === 'GET' && path.includes('/admin/pilots/') && !path.includes('/status') && !path.includes('/pdf')) {
    // Obtener piloto por ID — usar siempre supabaseAdmin (ya verificamos admin con nuestro JWT; RLS bloquearía con token de usuario)
    try {
      // Extraer el ID del path - puede venir como /api/admin/pilots/:id o /admin/pilots/:id
      let id = path.split('/admin/pilots/')[1];
      if (id) {
        id = id.split('/')[0].split('?')[0]; // Remover query params y rutas adicionales
      }
      if (!id) {
        id = query.id as string;
      }
      
      console.log('🔍 Buscando piloto con ID:', id);
      console.log('🔍 Path completo:', path);
      console.log('🔍 Query params:', query);
      
      if (!id) {
        return res.status(400).json({ error: 'ID de piloto requerido' });
      }
      
      const { data: pilot, error } = await supabaseAdmin
        .from('pilots')
        .select('*')
        .eq('id', id)
        .single();
      
      console.log('🔍 Resultado de la consulta:', { 
        hasPilot: !!pilot, 
        pilotId: pilot?.id,
        pilotNombre: pilot?.nombre,
        pilotApellido: pilot?.apellido,
        error: error?.message 
      });
      
      if (error) {
        console.error('❌ Error de Supabase:', error);
        return res.status(404).json({ error: 'Piloto no encontrado', details: error.message });
      }
      
      if (!pilot) {
        console.error('❌ Piloto no encontrado en la base de datos');
        return res.status(404).json({ error: 'Piloto no encontrado' });
      }
      
      console.log('✅ Piloto encontrado - Datos completos:', {
        id: pilot.id,
        nombre: pilot.nombre,
        apellido: pilot.apellido,
        dni: pilot.dni,
        email: pilot.email,
        telefono: pilot.telefono,
        categoria: pilot.categoria,
        estado: pilot.estado,
        numero: pilot.numero
      });
      
      // Asegurar que la respuesta sea JSON
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(pilot);
    } catch (error: any) {
      console.error('❌ Get pilot error (catch):', error);
      res.status(500).json({ error: 'Error al obtener el piloto', details: error.message });
    }
  } else if (method === 'PATCH' && path.includes('/admin/pilots/') && path.includes('/status')) {
    // Actualizar estado de piloto — usar siempre supabaseAdmin (ya verificamos admin; RLS bloquearía con token de usuario)
    try {
      // Extraer el ID del path - puede venir como /api/admin/pilots/:id/status o /admin/pilots/:id/status
      let id = path.split('/admin/pilots/')[1];
      if (id) {
        id = id.split('/status')[0].split('?')[0]; // Remover /status y query params
      }
      if (!id) {
        id = query.id as string;
      }
      
      const estado = (bodySafe.estado as string) || (body as any)?.estado;

      console.log('📤 Actualizando estado del piloto:', {
        id: id,
        estado: estado,
        path: path,
        method: method
      });

      if (!id) {
        return res.status(400).json({ error: 'ID de piloto requerido' });
      }

      if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const { data, error } = await supabaseAdmin
        .from('pilots')
        .update({ estado })
        .eq('id', id)
        .select()
        .single();

      console.log('🔍 Resultado de actualización:', { data, error });

      if (error) {
        console.error('❌ Error de Supabase al actualizar:', error);
        throw error;
      }
      
      console.log('✅ Estado actualizado exitosamente');
      res.json({ message: 'Estado actualizado exitosamente', pilot: data });
    } catch (error: any) {
      console.error('❌ Update status error (catch):', error);
      res.status(500).json({ error: 'Error al actualizar el estado', details: error.message });
    }
  } else if (method === 'DELETE' && path.includes('/admin/pilots/') && !path.includes('/status')) {
    // Eliminar piloto
    try {
      const client = supabaseWithAuth || supabaseAdmin;
      const id = path.split('/admin/pilots/')[1]?.split('/')[0] || query.id;
      const { error } = await client
        .from('pilots')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ message: 'Piloto eliminado exitosamente' });
    } catch (error: any) {
      console.error('Delete pilot error:', error);
      res.status(500).json({ error: 'Error al eliminar el piloto' });
    }
  }
  // Admin - Tickets - Listar todos
  else if (method === 'GET' && (path === '/api/admin/tickets' || path.endsWith('/admin/tickets')) && !path.includes('/pdf')) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ error: 'Error de configuración' });
      }
      
      const publicClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: tickets, error } = await publicClient
        .from('tickets')
        .select('*')
        .order('fecha_emision', { ascending: false });

      if (error) throw error;
      res.json(tickets || []);
    } catch (error: any) {
      console.error('Get tickets error:', error);
      res.json([]); // Devolver array vacío en lugar de error 500
    }
  } else if (method === 'GET' && path.includes('/admin/tickets/') && path.includes('/pdf')) {
    // Descargar ticket PDF
    try {
      const client = supabaseWithAuth || supabaseAdmin;
      const codigo = path.split('/admin/tickets/')[1]?.replace('/pdf', '') || query.codigo;
      
      if (!codigo) {
        return res.status(400).json({ error: 'Código requerido' });
      }

      const { data: ticket, error } = await client
        .from('tickets')
        .select('*')
        .eq('codigo', codigo)
        .single();
      
      if (error || !ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }

      const pdfBuffer = await generateTicketPDF(ticket);
      const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ticket-${codigo}.pdf`);
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (error: any) {
      console.error('Download PDF error:', error);
      res.status(500).json({ error: 'Error al generar el PDF' });
    }
  }
  // Admin - Stats
  else if (method === 'GET' && (path === '/api/admin/stats' || path.endsWith('/admin/stats'))) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ error: 'Error de configuración' });
      }
      
      const publicClient = createClient(supabaseUrl, supabaseAnonKey);
      const client = publicClient;
      
      const { count: totalPilots } = await client
        .from('pilots')
        .select('*', { count: 'exact', head: true });

      const { count: approvedPilots } = await client
        .from('pilots')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'aprobado');

      const { count: pendingPilots } = await client
        .from('pilots')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      const { count: totalTickets } = await client
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      const { count: usedTickets } = await client
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('usado', true);

      const { data: usedTicketsData } = await client
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
      // Devolver stats vacías en lugar de error para que el frontend no crashee
      res.json({
        pilots: { total: 0, approved: 0, pending: 0 },
        tickets: { total: 0, used: 0, available: 0 },
        revenue: 0
      });
    }
  }
  // Admin - Solicitudes de ticket (público sube comprobante, admin aprueba)
  else if (method === 'GET' && (path === '/api/admin/ticket-solicitudes' || path.endsWith('/admin/ticket-solicitudes'))) {
    try {
      const { data: list, error } = await supabaseAdmin
        .from('ticket_solicitudes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const out = list || [];
      if (out.length) {
        const { data: ticketsBySol } = await supabaseAdmin.from('tickets').select('solicitud_id, codigo').in('solicitud_id', out.map((s: any) => s.id));
        const bySol: { [id: string]: string[] } = {};
        if (ticketsBySol) for (const t of ticketsBySol) {
          if (t.solicitud_id) { if (!bySol[t.solicitud_id]) bySol[t.solicitud_id] = []; bySol[t.solicitud_id].push(t.codigo); }
        }
        for (const s of out) {
          (s as any).ticket_codigos = bySol[s.id] || [];
          if (!(s as any).cantidad) (s as any).cantidad = 1;
        }
      }
      res.json(out);
    } catch (e: any) {
      console.error('Get ticket-solicitudes error:', e);
      res.status(500).json({ error: 'Error al listar solicitudes' });
    }
  }
  else if (method === 'PATCH' && path.includes('/admin/ticket-solicitudes/')) {
    const id = path.split('/admin/ticket-solicitudes/')[1]?.split('/')[0] || (req.body && (req.body as any).id);
    if (!id) return res.status(400).json({ error: 'ID requerido' });
    const segment = path.split('/admin/ticket-solicitudes/')[1] || '';
    const action = segment.includes('approve') ? 'approve' : segment.includes('reject') ? 'reject' : null;
    try {
      const { data: sol, error: fetchErr } = await supabaseAdmin
        .from('ticket_solicitudes')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchErr || !sol) return res.status(404).json({ error: 'Solicitud no encontrada' });
      if (sol.estado !== 'pendiente') return res.status(400).json({ error: 'La solicitud ya fue procesada' });
      if (action === 'reject') {
        await supabaseAdmin.from('ticket_solicitudes').update({ estado: 'rechazado' }).eq('id', id);
        return res.json({ message: 'Solicitud rechazada' });
      }
      if (action === 'approve') {
        const cantidad = Math.max(1, Math.min(100, parseInt(String((sol as any).cantidad || 1), 10) || 1));
        const codigos: string[] = [];
        let firstTicketId: string | null = null;
        for (let i = 0; i < cantidad; i++) {
          const codigo = `TKT-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          const { data: newTicket, error: ticketErr } = await supabaseAdmin
            .from('tickets')
            .insert({
              codigo,
              tipo: 'general',
              nombre: sol.nombre,
              dni: null,
              email: sol.email,
              precio: 0,
              usado: false,
              solicitud_id: id
            })
            .select('id')
            .single();
          if (ticketErr) {
            console.error('Create ticket on approve error:', ticketErr);
            return res.status(500).json({ error: 'Error al crear el ticket' });
          }
          codigos.push(codigo);
          if (!firstTicketId) firstTicketId = newTicket.id;
        }
        await supabaseAdmin
          .from('ticket_solicitudes')
          .update({ estado: 'aprobado', ticket_id: firstTicketId })
          .eq('id', id);
        return res.json({ message: `Solicitud aprobada. ${cantidad} ticket(s) creado(s).`, ticket_id: firstTicketId, codigos, codigo: codigos[0] });
      }
      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e: any) {
      console.error('Patch ticket-solicitud error:', e);
      return res.status(500).json({ error: 'Error al procesar' });
    }
  } else {
    res.status(404).json({ error: 'Ruta no encontrada' });
  }
}

