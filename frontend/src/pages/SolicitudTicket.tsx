import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './SolicitudTicket.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API_BASE;

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
  const [file, setFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; text: string } | null>(null);

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
      setMensaje({ tipo: 'error', text: 'Tenés que subir el comprobante de pago (imagen).' });
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
      await axios.post('/ticket-solicitud', { nombre: nombre.trim(), email: email.trim(), comprobanteBase64, fileName });
      setMensaje({ tipo: 'ok', text: 'Solicitud enviada. Cuando la aprobemos podrás consultar tu ticket acá abajo.' });
      setNombre('');
      setEmail('');
      setFile(null);
    } catch (err: any) {
      setMensaje({ tipo: 'error', text: err.response?.data?.error || 'Error al enviar. Reintentá.' });
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
      setSolicitudes(Array.isArray(data) ? data : []);
    } catch {
      setSolicitudes([]);
    } finally {
      setConsultando(false);
    }
  };

  return (
    <div className="solicitud-ticket">
      <header className="solicitud-header">
        <div className="container">
          <Link to="/" className="back-link">← Volver</Link>
          <h1>Pedir ticket de entrada</h1>
          <p>Completá el formulario y subí tu comprobante de pago. Cuando lo aprobemos podrás descargar tu ticket.</p>
        </div>
      </header>

      <main className="solicitud-main container">
        <section className="solicitud-form-card">
          <h2>Enviar solicitud</h2>
          <form onSubmit={enviar}>
            <div className="form-group">
              <label>Nombre *</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Tu nombre" />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
            </div>
            <div className="form-group">
              <label>Comprobante de pago (imagen) *</label>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            </div>
            {mensaje && <p className={`mensaje ${mensaje.tipo}`}>{mensaje.text}</p>}
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
          {solicitudes.length > 0 && (
            <ul className="solicitudes-list">
              {solicitudes.map((s) => (
                <li key={s.id} className={`estado-${s.estado}`}>
                  <span><strong>{s.nombre}</strong> – {s.estado}</span>
                  {s.estado === 'aprobado' && s.ticket_codigo && (
                    <a href={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/tickets/download/${s.ticket_codigo}`} target="_blank" rel="noopener noreferrer" className="btn-descarga">Descargar ticket (PDF)</a>
                  )}
                </li>
              ))}
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
