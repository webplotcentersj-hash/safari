import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './TiemposCarrera.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface PilotInfo {
  id: string;
  nombre: string;
  apellido: string;
  numero: number | null;
  categoria: string;
  categoria_auto: string | null;
  categoria_moto: string | null;
}

interface RaceTimeRow {
  id: string;
  pilot_id: string;
  categoria: string;
  categoria_detalle: string | null;
  tiempo_segundos: number | null;
  tiempo_formato: string | null;
  etapa: string | null;
  fecha: string;
  pilots: PilotInfo | null;
}

interface RaceDisplayData {
  semaphore: 'green' | 'red';
  stop_message: string | null;
  updated_at: string | null;
  times: RaceTimeRow[];
}

export default function TiemposCarrera() {
  const [data, setData] = useState<RaceDisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDisplay = useCallback(async () => {
    try {
      const url = API_BASE ? `${API_BASE}/api/public/race-display` : '/api/public/race-display';
      const res = await axios.get<RaceDisplayData>(url);
      setData(res.data);
      setError(null);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Error al cargar';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisplay();
  }, [fetchDisplay]);

  useEffect(() => {
    const interval = setInterval(fetchDisplay, 15000);
    return () => clearInterval(interval);
  }, [fetchDisplay]);

  if (loading && !data) {
    return (
      <div className="tiempos-carrera">
        <div className="tiempos-loading">Cargando tiempos…</div>
      </div>
    );
  }

  const isRed = data?.semaphore === 'red';
  const stopMessage = (data?.stop_message ?? '').trim();

  return (
    <div className="tiempos-carrera">
      <header className="tiempos-header">
        <div className="tiempos-header-inner">
          <img src="/logo.png" alt="Safari" className="tiempos-logo" />
          <h1>Tiempos de carrera</h1>
          <div className="tiempos-semaphore-wrap">
            <div
              className={`tiempos-semaphore ${isRed ? 'semaphore-red' : 'semaphore-green'}`}
              title={isRed ? 'Carrera parada' : 'Carrera en curso'}
              aria-label={isRed ? 'Carrera parada' : 'Carrera en curso'}
            />
            <span className="tiempos-semaphore-label">
              {isRed ? 'Carrera parada' : 'Carrera en curso'}
            </span>
          </div>
        </div>
      </header>

      {isRed && stopMessage && (
        <div className="tiempos-stop-banner" role="alert">
          <strong>Motivo de parada:</strong> {stopMessage}
        </div>
      )}

      {error && (
        <div className="tiempos-error">
          No se pudieron cargar los tiempos. Reintentando…
        </div>
      )}

      <main className="tiempos-main">
        <div className="tiempos-table-wrap">
          {data?.times && data.times.length > 0 ? (
            <table className="tiempos-table">
              <thead>
                <tr>
                  <th>Pos.</th>
                  <th>Nº</th>
                  <th>Piloto</th>
                  <th>Categoría</th>
                  <th>Tiempo</th>
                  <th>Etapa</th>
                </tr>
              </thead>
              <tbody>
                {data.times.map((row, index) => (
                  <tr key={row.id}>
                    <td className="col-pos">{index + 1}</td>
                    <td className="col-num">
                      {row.pilots?.numero != null
                        ? row.pilots.numero.toString().padStart(2, '0')
                        : '—'}
                    </td>
                    <td className="col-piloto">
                      {row.pilots
                        ? `${row.pilots.nombre} ${row.pilots.apellido}`
                        : '—'}
                    </td>
                    <td className="col-cat">
                      {row.categoria_detalle || row.categoria}
                    </td>
                    <td className="col-tiempo">
                      <strong>{row.tiempo_formato || '—'}</strong>
                    </td>
                    <td className="col-etapa">{row.etapa || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="tiempos-empty">Aún no hay tiempos cargados.</p>
          )}
        </div>
      </main>

      <footer className="tiempos-footer">
        <p>Actualización automática cada 15 s · Safari Tras las Sierras</p>
      </footer>
    </div>
  );
}
