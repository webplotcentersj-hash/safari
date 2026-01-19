import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export async function generateTicketPDF(ticket: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);

    // Header
    doc.fontSize(24)
       .fillColor('#1a472a')
       .text('SAFARI TRAS LAS SIERRAS', { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(16)
       .fillColor('#333')
       .text('Valle Fértil - San Juan', { align: 'center' });
    
    doc.moveDown(2);

    // Ticket info
    doc.fontSize(20)
       .fillColor('#1a472a')
       .text('TICKET DE ENTRADA', { align: 'center' });
    
    doc.moveDown(2);

    // Código del ticket
    doc.fontSize(14)
       .fillColor('#000')
       .text(`Código: ${ticket.codigo}`, { align: 'left' });
    
    doc.moveDown();
    doc.text(`Tipo: ${ticket.tipo}`, { align: 'left' });
    doc.moveDown();
    doc.text(`Nombre: ${ticket.nombre}`, { align: 'left' });
    
    if (ticket.dni) {
      doc.moveDown();
      doc.text(`DNI: ${ticket.dni}`, { align: 'left' });
    }
    
    if (ticket.email) {
      doc.moveDown();
      doc.text(`Email: ${ticket.email}`, { align: 'left' });
    }
    
    doc.moveDown();
    doc.fontSize(16)
       .fillColor('#1a472a')
       .text(`Precio: $${ticket.precio.toFixed(2)}`, { align: 'left' });
    
    doc.moveDown(2);
    
    // Fecha
    const fecha = new Date(ticket.fecha_emision).toLocaleString('es-AR');
    doc.fontSize(10)
       .fillColor('#666')
       .text(`Fecha de emisión: ${fecha}`, { align: 'left' });
    
    doc.moveDown(3);
    
    // Footer
    doc.fontSize(10)
       .fillColor('#666')
       .text('Este ticket es personal e intransferible.', { align: 'center' });
    doc.text('Presentar este documento en la entrada del evento.', { align: 'center' });
    
    // QR Code placeholder (puedes agregar una librería de QR codes si lo deseas)
    doc.moveDown(2);
    doc.fontSize(8)
       .fillColor('#999')
       .text(`Código de verificación: ${ticket.codigo}`, { align: 'center' });

    doc.end();
  });
}

