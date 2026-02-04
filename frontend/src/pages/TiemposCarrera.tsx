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
      const url = API_BASE
        ? `${API_BASE.replace(/\/$/, '')}/api/admin?__route=public-race-display&_t=${Date.now()}`
        : `/api/admin?__route=public-race-display&_t=${Date.now()}`;
      const res = await axios.get<RaceDisplayData>(url, { baseURL: '', timeout: 8000 });
      setData(res.data);
      setError(null);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Error al cargar';
      setError(msg);
      setData((prev) => prev);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisplay();
  }, [fetchDisplay]);

  useEffect(() => {
    const interval = setInterval(fetchDisplay, 10000);
    return () => clearInterval(interval);
  }, [fetchDisplay]);

  const isRed = data?.semaphore === 'red';
  const stopMessage = (data?.stop_message ?? '').trim();
  const times = data?.times ?? [];

  return (
    <div className="tp-page">
      <div className="tp-bg" aria-hidden />

      <header className="tp-header">
        <div className="tp-header-inner">
          <img src="/logo.png" alt="Safari" className="tp-logo" />
          <h1 className="tp-title">Tiempos en vivo</h1>
          <div className="tp-semaphore-block">
            <div
              className={`tp-semaphore ${isRed ? 'tp-semaphore--red' : 'tp-semaphore--green'}`}
              role="status"
              aria-live="polite"
              aria-label={isRed ? 'Carrera parada' : 'Carrera en curso'}
            />
            <span className="tp-semaphore-text">
              {isRed ? 'Carrera parada' : 'Carrera en curso'}
            </span>
            <span className="tp-live" aria-hidden>● LIVE</span>
          </div>
        </div>
      </header>

      {isRed && stopMessage && (
        <div className="tp-alert" role="alert">
          <span className="tp-alert-label">Motivo de parada</span>
          <p className="tp-alert-message">{stopMessage}</p>
        </div>
      )}

      {error && !data && (
        <div className="tp-error">
          No se pudieron cargar los datos. Reintentando en unos segundos…
        </div>
      )}

      <main className="tp-main">
        {loading && !data ? (
          <div className="tp-skeleton">
            <div className="tp-skeleton-line" />
            <div className="tp-skeleton-line" />
            <div className="tp-skeleton-line" />
            <div className="tp-skeleton-line" />
          </div>
        ) : times.length > 0 ? (
          <>
            <div className="tp-table-wrap">
              <table className="tp-table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Nº</th>
                    <th>Piloto</th>
                    <th>Categoría</th>
                    <th>Tiempo</th>
                    <th>Etapa</th>
                  </tr>
                </thead>
                <tbody>
                  {times.map((row, index) => (
                    <tr key={row.id}>
                      <td className="tp-col-pos">{index + 1}</td>
                      <td className="tp-col-num">
                        {row.pilots?.numero != null
                          ? row.pilots.numero.toString().padStart(2, '0')
                          : '—'}
                      </td>
                      <td className="tp-col-piloto">
                        {row.pilots
                          ? `${row.pilots.nombre} ${row.pilots.apellido}`
                          : '—'}
                      </td>
                      <td className="tp-col-cat">
                        {row.categoria_detalle || row.categoria}
                      </td>
                      <td className="tp-col-tiempo">
                        <strong>{row.tiempo_formato || '—'}</strong>
                      </td>
                      <td className="tp-col-etapa">{row.etapa || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="tp-cards">
              {times.map((row, index) => (
                <article key={row.id} className="tp-card">
                  <span className="tp-card-pos">{index + 1}º</span>
                  <div className="tp-card-body">
                    <div className="tp-card-piloto">
                      {row.pilots
                        ? `${row.pilots.nombre} ${row.pilots.apellido}`
                        : '—'}
                    </div>
                    <div className="tp-card-meta">
                      <span>Nº {row.pilots?.numero != null ? row.pilots.numero.toString().padStart(2, '0') : '—'}</span>
                      <span>{row.categoria_detalle || row.categoria}</span>
                    </div>
                    <div className="tp-card-tiempo">
                      <strong>{row.tiempo_formato || '—'}</strong>
                      {row.etapa && <small>{row.etapa}</small>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="tp-empty">
            <p>Aún no hay tiempos cargados.</p>
            <p className="tp-empty-hint">Se actualizará automáticamente.</p>
          </div>
        )}
      </main>

      <footer className="tp-footer">
        <p>Actualización cada 10 s · Safari Tras las Sierras</p>
      </footer>
    </div>
  );
}
