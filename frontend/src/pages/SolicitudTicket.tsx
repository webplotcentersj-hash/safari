import { useState } from 'react';
import axios from 'axios';
import './SolicitudTicket.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
if (typeof window !== 'undefined') {
  axios.defaults.baseURL = API_BASE;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64 || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SolicitudTicket() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; text: string } | null>(null);
  const [formKey, setFormKey] = useState(0);

  const [emailConsulta, setEmailConsulta] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) {
      setMensaje({ tipo: 'error', text: 'Nombre y email son obligatorios.' });
      return;
    }
    if (!file) {
      setMensaje({ tipo: 'error', text: 'Tenés que subir el comprobante de pago (imagen o PDF).' });
      return;
    }
    setEnviando(true);
    setMensaje(null);
    try {
      let comprobanteBase64 = '';
      let fileName = '';
      if (file) {
        comprobanteBase64 = await fileToBase64(file);
        fileName = file.name;
      }
      const cant = Math.max(1, Math.min(100, cantidad));
      await axios.post('/ticket-solicitud', { nombre: nombre.trim(), email: email.trim(), cantidad: cant, comprobanteBase64, fileName });
      setMensaje({ tipo: 'ok', text: 'Solicitud enviada. Cuando la aprobemos podrás consultar tus tickets acá abajo.' });
      setNombre('');
      setEmail('');
      setCantidad(1);
      setFile(null);
      setFormKey((k) => k + 1);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Error al enviar. Reintentá.';
      setMensaje({ tipo: 'error', text: msg });
    } finally {
      setEnviando(false);
    }
  };

  const consultar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailConsulta.trim()) return;
    setConsultando(true);
    setSolicitudes([]);
    try {
      const { data } = await axios.get('/ticket-solicitud', { params: { email: emailConsulta.trim() } });
      console.log('📋 Solicitudes recibidas:', data);
      const solicitudesArray = Array.isArray(data) ? data : [];
      console.log('📋 Solicitudes procesadas:', solicitudesArray.map(s => ({
        id: s.id,
        estado: s.estado,
        ticket_codigos: s.ticket_codigos,
        ticket_codigo: s.ticket_codigo,
        cantidad: s.cantidad
      })));
      setSolicitudes(solicitudesArray);
    } catch (err: any) {
      console.error('❌ Error consultando:', err);
      setSolicitudes([]);
    } finally {
      setConsultando(false);
    }
  };

  const descargarPdfPorCodigo = async (codigo: string) => {
    const url = `/api/tickets?action=download&codigo=${encodeURIComponent(codigo)}&format=base64`;
    console.log('🔗 URL descarga por código:', url);
    await descargarPdfUrl(url, `ticket-${codigo}.pdf`);
  };
  const descargarPdfSolicitud = async (solicitudId: string) => {
    const url = `/api/tickets?action=download_solicitud&solicitud_id=${encodeURIComponent(solicitudId)}&format=base64`;
    console.log('🔗 URL descarga solicitud:', url);
    await descargarPdfUrl(url, 'tickets-solicitud.pdf');
  };
  const descargarPdfUrl = async (url: string, nombreArchivo: string) => {
    try {
      console.log('Descargando PDF desde:', url);
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        const text = await res.text();
        let errorMsg = 'No se pudo descargar el PDF.';
        try {
          const json = JSON.parse(text);
          errorMsg = json.error || errorMsg;
        } catch {
          errorMsg = text || errorMsg;
        }
        alert(errorMsg);
        console.error('Error respuesta:', res.status, errorMsg);
        return;
      }
      const data = await res.json().catch(async () => {
        const text = await res.text();
        console.error('No es JSON:', text.slice(0, 200));
        return { error: 'Respuesta inválida del servidor' };
      });
      if (data.error) {
        alert(data.error);
        return;
      }
      if (data.pdf && typeof data.pdf === 'string') {
        try {
          const binary = atob(data.pdf);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = data.filename || nombreArchivo;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
          console.log('PDF descargado:', data.filename || nombreArchivo);
        } catch (decodeErr: any) {
          console.error('Error decodificando base64:', decodeErr);
          alert('Error al procesar el PDF. Reintentá.');
        }
      } else {
        console.error('No hay PDF en la respuesta:', data);
        alert('No se recibió el PDF en la respuesta.');
      }
    } catch (err: any) {
      console.error('Error descargando PDF:', err);
      alert(err?.message || 'Error al descargar. Revisá la consola para más detalles.');
    }
  };

  return (
    <div className="solicitud-ticket" style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #1a472a 0%, #0d2818 100%)', color: '#fff' }}>
      <header className="solicitud-header">
        <div className="container" style={{ maxWidth: 960, margin: '0 auto', padding: '0 1rem' }}>
          <h1>Pedir ticket de entrada</h1>
          <p>Completá el formulario y subí tu comprobante de pago. Cuando lo aprobemos podrás descargar tu ticket.</p>
        </div>
      </header>

      <main className="solicitud-main container" style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1rem' }}>
        <section className="solicitud-form-card">
          <h2>Enviar solicitud</h2>
          <form key={formKey} onSubmit={enviar}>
            <div className="form-group">
              <label style={{ color: '#fff' }}>Nombre *</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Tu nombre" />
            </div>
            <div className="form-group">
              <label style={{ color: '#fff' }}>Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
            </div>
            <div className="form-group">
              <label style={{ color: '#fff' }}>Cantidad de tickets *</label>
              <input type="number" min={1} max={100} value={cantidad} onChange={(e) => setCantidad(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))} />
            </div>
            <div className="form-group">
              <label style={{ color: '#fff' }}>Comprobante de pago (imagen o PDF) *</label>
              <input type="file" accept="image/*,.pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            </div>
            {mensaje && <p className={`mensaje ${mensaje.tipo}`} role="alert">{mensaje.text}</p>}
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </form>
        </section>

        <section className="solicitud-consulta-card">
          <h2>Consultar mi ticket</h2>
          <p>Ingresá tu email para ver el estado de tus solicitudes y descargar el ticket si ya fue aprobado.</p>
          <form onSubmit={consultar}>
            <div className="form-group">
              <input type="email" value={emailConsulta} onChange={(e) => setEmailConsulta(e.target.value)} placeholder="tu@email.com" />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={consultando}>{consultando ? 'Buscando...' : 'Consultar'}</button>
          </form>
          {Array.isArray(solicitudes) && solicitudes.length > 0 && (
            <ul className="solicitudes-list">
              {solicitudes.map((s: { id?: string; nombre?: string; estado?: string; ticket_codigo?: string; ticket_codigos?: string[]; cantidad?: number }, i: number) => {
                const esAprobado = s.estado === 'aprobado';
                const codigosArray = Array.isArray(s.ticket_codigos) ? s.ticket_codigos : [];
                const tieneCodigos = codigosArray.length > 0;
                const tieneCodigo = !!s.ticket_codigo;
                const codigosParaMostrar = tieneCodigos ? codigosArray : (s.ticket_codigo ? [s.ticket_codigo] : []);
                const solicitudId = s.id;
                console.log(`🔍 Solicitud ${i}:`, { 
                  id: s.id, 
                  estado: s.estado, 
                  esAprobado, 
                  tieneCodigos, 
                  tieneCodigo, 
                  ticket_codigos: s.ticket_codigos, 
                  ticket_codigo: s.ticket_codigo,
                  codigosParaMostrar,
                  cantidad: s.cantidad
                });
                return (
                  <li key={s.id ?? `s-${i}`} className={`estado-${s.estado ?? ''}`}>
                    <span><strong>{s.nombre ?? ''}</strong> – {s.estado ?? ''}{s.cantidad && s.cantidad > 1 ? ` (${s.cantidad} tickets)` : ''}</span>
                    {esAprobado && (
                      <>
                        <p className="solicitud-descarga-note">Mismo ticket que en el panel de administración.</p>
                        {codigosParaMostrar.length > 0 ? (
                          <>
                            {tieneCodigos && solicitudId && (
                              <button type="button" className="btn-descarga" onClick={() => {
                                if (!solicitudId) return;
                                console.log('📥 Descargando todos los tickets de solicitud:', solicitudId);
                                descargarPdfSolicitud(solicitudId as string);
                              }}>Descargar todos (PDF)</button>
                            )}
                            {codigosParaMostrar.map((codigo: string, j: number) => (
                              <button key={j} type="button" className="btn-descarga" onClick={() => {
                                console.log('📥 Descargando ticket individual:', codigo);
                                descargarPdfPorCodigo(codigo);
                              }}>Ticket{codigosParaMostrar.length > 1 ? ` ${j + 1}` : ''} (PDF)</button>
                            ))}
                          </>
                        ) : (
                          <p className="sin-resultados" style={{ marginTop: '0.5rem', color: '#ffcdd2' }}>
                            ⚠️ Ticket aprobado pero sin códigos disponibles. ID: {s.id || 'N/A'}. Contactá al administrador.
                          </p>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {solicitudes.length === 0 && consultando === false && emailConsulta && (
            <p className="sin-resultados">No hay solicitudes con ese email.</p>
          )}
        </section>
      </main>
    </div>
  );
}
