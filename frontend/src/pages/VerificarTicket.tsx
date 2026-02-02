import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VerificarTicket.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
if (typeof window !== 'undefined') {
  axios.defaults.baseURL = API_BASE;
}

export default function VerificarTicket() {
  const { codigo: codigoParam } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const [codigoInput, setCodigoInput] = useState(codigoParam || '');
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(!!codigoParam);
  const [error, setError] = useState<string | null>(null);
  const [marcando, setMarcando] = useState(false);

  const codigo = codigoParam?.trim() || codigoInput.trim();

  useEffect(() => {
    if (codigoParam) setCodigoInput(codigoParam);
  }, [codigoParam]);

  useEffect(() => {
    if (!codigo) {
      setTicket(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    axios
      .get(`/tickets/verify/${encodeURIComponent(codigo)}`)
      .then((res) => {
        setTicket(res.data);
        setError(null);
      })
      .catch((err) => {
        setTicket(null);
        setError(err.response?.data?.error || err.message || 'Ticket no encontrado');
      })
      .finally(() => setLoading(false));
  }, [codigoParam, codigo]);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoInput.trim()) return;
    navigate(`/verificar/${encodeURIComponent(codigoInput.trim())}`, { replace: true });
  };

  const marcarComoUsado = async () => {
    if (!ticket?.codigo || ticket.usado) return;
    setMarcando(true);
    try {
      await axios.patch(`/tickets/use/${encodeURIComponent(ticket.codigo)}`);
      setTicket({ ...ticket, usado: true });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al marcar el ticket');
    } finally {
      setMarcando(false);
    }
  };

  return (
    <div className="verificar-ticket">
      <header className="verificar-header">
        <div className="container">
          <h1>Verificar ticket</h1>
          <p>Ingresá el código del ticket o escaneá el QR para verificar y marcar como usado en la entrada.</p>
        </div>
      </header>

      <main className="verificar-main container">
        {!codigoParam && (
          <section className="verificar-buscar card">
            <h2>Ingresar código</h2>
            <form onSubmit={buscar}>
              <input
                type="text"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                placeholder="Ej: TKT-1234567890-ABC123"
                autoFocus
              />
              <button type="submit" className="btn btn-primary">Verificar</button>
            </form>
          </section>
        )}

        {loading && <p className="verificar-loading">Verificando…</p>}
        {error && !loading && (
          <section className="verificar-result card error">
            <h2>No encontrado</h2>
            <p>{error}</p>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/verificar')}>Verificar otro</button>
          </section>
        )}
        {ticket && !loading && (
          <section className="verificar-result card">
            <h2>{ticket.usado ? 'Ticket ya utilizado' : 'Ticket válido'}</h2>
            <div className={`status-badge big ${ticket.usado ? 'usado' : 'valido'}`}>
              {ticket.usado ? 'Ya usado' : 'Válido'}
            </div>
            <dl className="verificar-datos">
              <dt>Código</dt>
              <dd>{ticket.codigo}</dd>
              <dt>Nombre</dt>
              <dd>{ticket.nombre || '—'}</dd>
              <dt>Email</dt>
              <dd>{ticket.email || '—'}</dd>
              <dt>Tipo</dt>
              <dd>{ticket.tipo || '—'}</dd>
            </dl>
            {!ticket.usado && (
              <button
                type="button"
                className="btn btn-success"
                onClick={marcarComoUsado}
                disabled={marcando}
              >
                {marcando ? 'Marcando…' : 'Marcar como usado'}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/verificar')}>Verificar otro</button>
          </section>
        )}
      </main>
    </div>
  );
}
