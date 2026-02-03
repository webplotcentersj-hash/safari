import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

async function drawTicketPage(doc: any, ticket: any): Promise<void> {
  const precio = typeof ticket.precio === 'number' ? ticket.precio : parseFloat(ticket.precio) || 0;
  const fecha = ticket.fecha_emision || ticket.created_at
    ? new Date(ticket.fecha_emision || ticket.created_at).toLocaleString('es-AR')
    : new Date().toLocaleString('es-AR');

  const qrBuffer = await QRCode.toBuffer(ticket.codigo, {
    width: 256,
    margin: 2,
    errorCorrectionLevel: 'M'
  });

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const col1Width = pageWidth * 0.58;
  const col2Width = pageWidth * 0.42;

  doc.fontSize(22).fillColor('#1a472a').text('SAFARI TRAS LAS SIERRAS', { align: 'center' });
  doc.fontSize(14).fillColor('#333').text('Valle Fértil - San Juan', { align: 'center' });
  doc.moveDown(1.5);
  doc.fontSize(18).fillColor('#1a472a').text('TICKET DE ENTRADA', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(9).fillColor('#666').text('ID único (presentar o escanear en entrada)', doc.page.margins.left, doc.y);
  doc.moveDown(0.25);
  const codeBoxY = doc.y;
  doc.rect(doc.page.margins.left, codeBoxY, pageWidth, 32).fillAndStroke('#e8f5e9', '#1a472a');
  doc.fillColor('#1a472a').fontSize(12).text(ticket.codigo, doc.page.margins.left, codeBoxY + 10, { width: pageWidth, align: 'center' });
  doc.y = codeBoxY + 32;
  doc.moveDown(0.5);

  const startY = doc.y;
  doc.fontSize(11).fillColor('#333');
  doc.text(`Tipo: ${String(ticket.tipo).toUpperCase()}`, doc.page.margins.left, doc.y);
  doc.moveDown(0.4);
  doc.text(`Nombre: ${ticket.nombre || '—'}`, doc.page.margins.left, doc.y);
  doc.moveDown(0.4);
  if (ticket.dni) { doc.text(`DNI: ${ticket.dni}`, doc.page.margins.left, doc.y); doc.moveDown(0.4); }
  if (ticket.email) { doc.text(`Email: ${ticket.email}`, doc.page.margins.left, doc.y); doc.moveDown(0.4); }
  doc.fontSize(14).fillColor('#1a472a').text(`Precio: $${precio.toFixed(2)}`, doc.page.margins.left, doc.y);
  doc.moveDown(0.6);
  doc.fontSize(9).fillColor('#666').text(`Emitido: ${fecha}`, doc.page.margins.left, doc.y);

  const qrSize = 100;
  const qrX = doc.page.margins.left + col1Width + (col2Width - qrSize) / 2;
  const qrY = startY;
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
  doc.fontSize(8).fillColor('#666').text('Escanear en entrada', qrX, qrY + qrSize + 4, { width: qrSize, align: 'center' });
  doc.y = Math.max(doc.y, qrY + qrSize + 24);
  doc.moveDown(1.5);
  doc.fontSize(10).fillColor('#666').text('Este ticket es personal e intransferible. Presentar en la entrada.', { align: 'center' });
}

export async function generateTicketPDF(ticket: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    drawTicketPage(doc, ticket).then(() => doc.end()).catch(reject);
  });
}

/** Genera un único PDF con una página por ticket (para descargar todos los tickets de una solicitud). */
export async function generateTicketsPDF(tickets: any[]): Promise<Buffer> {
  if (!tickets.length) return Buffer.alloc(0);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    (async () => {
      for (let i = 0; i < tickets.length; i++) {
        if (i > 0) doc.addPage();
        await drawTicketPage(doc, tickets[i]);
      }
      doc.end();
    })().catch(reject);
  });
}

function getCategoriaDetalle(p: any): string {
  if (p.categoria === 'auto') return p.categoria_auto || '—';
  if (p.categoria === 'moto') {
    return p.categoria_enduro || p.categoria_travesia_moto || p.categoria_moto || p.categoria_moto_china || '—';
  }
  if (p.categoria === 'cuatri') return p.categoria_cuatri || '—';
  return '—';
}

/** Genera PDF con la planilla de inscripción (lista de pilotos por categoría). */
export async function generatePlanillaInscripcionPDF(pilots: any[], categoriaLabel: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 36, bottom: 36, left: 28, right: 28 } });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const fontSize = 8;
    const rowHeight = 14;
    const headerHeight = 22;
    const cols = [
      { key: 'numero', label: 'Nº', w: 0.05 },
      { key: 'apellido', label: 'Apellido', w: 0.14 },
      { key: 'nombre', label: 'Nombre', w: 0.12 },
      { key: 'dni', label: 'DNI', w: 0.12 },
      { key: 'email', label: 'Email', w: 0.18 },
      { key: 'telefono', label: 'Teléfono', w: 0.11 },
      { key: 'categoriaDetalle', label: 'Categoría', w: 0.14 },
      { key: 'estado', label: 'Estado', w: 0.14 }
    ];

    function drawHeader(y: number) {
      let x = doc.page.margins.left;
      doc.fontSize(fontSize).fillColor('#1a472a').font('Helvetica-Bold');
      for (const col of cols) {
        const w = pageWidth * col.w;
        doc.text(col.label, x, y, { width: w, ellipsis: true });
        x += w;
      }
      doc.font('Helvetica');
      doc.strokeColor('#1a472a').lineWidth(0.5).moveTo(doc.page.margins.left, y + 12).lineTo(doc.page.margins.left + pageWidth, y + 12).stroke();
    }

    function drawRow(p: any, index: number, y: number) {
      let x = doc.page.margins.left;
      doc.fillColor('#333').fontSize(fontSize).font('Helvetica');
      const numero = p.numero != null ? String(p.numero) : '—';
      const apellido = (p.apellido || '—').toString().slice(0, 22);
      const nombre = (p.nombre || '—').toString().slice(0, 20);
      const dni = (p.dni || '—').toString().slice(0, 14);
      const email = (p.email || '—').toString().slice(0, 28);
      const telefono = (p.telefono || '—').toString().slice(0, 14);
      const catDet = getCategoriaDetalle(p).slice(0, 18);
      const estado = (p.estado || '—').toString();
      const vals = [numero, apellido, nombre, dni, email, telefono, catDet, estado];
      for (let i = 0; i < cols.length; i++) {
        const w = pageWidth * cols[i].w;
        doc.text(vals[i], x, y, { width: w, ellipsis: true });
        x += w;
      }
    }

    doc.fontSize(18).fillColor('#1a472a').text('SAFARI TRAS LAS SIERRAS', { align: 'center' });
    doc.fontSize(11).fillColor('#333').text('Valle Fértil - San Juan', { align: 'center' });
    doc.moveDown(0.6);
    doc.fontSize(14).fillColor('#1a472a').text(`Planilla de inscripción — ${categoriaLabel}`, { align: 'center' });
    doc.fontSize(9).fillColor('#666').text(`Generado: ${new Date().toLocaleString('es-AR')} · ${pilots.length} inscripto(s)`, { align: 'center' });
    doc.moveDown(0.8);

    let y = doc.y;
    const maxY = doc.page.height - doc.page.margins.bottom - rowHeight;
    let isFirstPage = true;

    for (let i = 0; i < pilots.length; i++) {
      if (!isFirstPage && y <= doc.page.margins.top + headerHeight + rowHeight) {
        doc.addPage();
        y = doc.page.margins.top;
        isFirstPage = false;
      }
      if (y === doc.page.margins.top || (isFirstPage && i === 0)) {
        drawHeader(y);
        y += headerHeight;
      }
      if (y > maxY) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader(y);
        y += headerHeight;
      }
      drawRow(pilots[i], i, y);
      y += rowHeight;
    }

    doc.end();
  });
}










