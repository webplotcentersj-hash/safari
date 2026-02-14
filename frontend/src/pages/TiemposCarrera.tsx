import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { supabase } from '../config/supabase';
import './TiemposCarrera.css';

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

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

interface RccronosRow {
  tramo: string;
  hora: string;
  tiempos: string;
}

interface RccronosEtapa {
  nombre: string;
  tramos: RccronosRow[];
}

interface RccronosSchedule {
  source: string;
  updatedAt: string;
  etapas: RccronosEtapa[];
}

const RCCRONOS_SOURCE = 'https://rccronos.com.ar/safari-tras-la-sierra-2026/';
const DEFAULT_SCHEDULE: RccronosSchedule = {
  source: RCCRONOS_SOURCE,
  updatedAt: new Date().toISOString(),
  etapas: [
    { nombre: 'ETAPA UNO', tramos: [
      { tramo: 'PE1: USMO - BALDE DE LAS CHILCA', hora: '09:00HS', tiempos: '' },
      { tramo: 'PE2: BALDE DE LAS CHICA - COQUI QUINTANA', hora: '09:30HS', tiempos: '' }
    ]},
    { nombre: 'ETAPA DOS', tramos: [
      { tramo: 'PE3: BALDE DE LAS CHILCAS - COQUI QUINTANA', hora: '09:00HS', tiempos: '' }
    ]}
  ]
};

export default function TiemposCarrera() {
  const [data, setData] = useState<RaceDisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<RccronosSchedule | null>(DEFAULT_SCHEDULE);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  const fetchFromSupabase = useCallback(async (): Promise<RaceDisplayData | null> => {
    if (!supabase) return null;
    try {
      const [statusRes, timesRes] = await Promise.all([
        supabase
          .from('race_status')
          .select('semaphore, stop_message, updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('race_times')
          .select(`
            id, pilot_id, categoria, categoria_detalle, tiempo_segundos, tiempo_formato, etapa, fecha,
            pilots (id, nombre, apellido, numero, categoria, categoria_auto, categoria_moto)
          `)
          .order('tiempo_segundos', { ascending: true })
      ]);
      const status = statusRes.data;
      const rawTimes = timesRes.error ? [] : (timesRes.data || []);
      const times: RaceTimeRow[] = rawTimes.map((row: { pilots?: PilotInfo | PilotInfo[] | null; [key: string]: unknown }) => ({
        ...row,
        pilots: Array.isArray(row.pilots) ? row.pilots[0] ?? null : row.pilots ?? null
      })) as RaceTimeRow[];
      return {
        semaphore: (status?.semaphore === 'red' ? 'red' : 'green') as 'green' | 'red',
        stop_message: status?.stop_message ?? null,
        updated_at: status?.updated_at ?? null,
        times
      };
    } catch {
      return null;
    }
  }, []);

  const fetchFromApi = useCallback(async (): Promise<RaceDisplayData | null> => {
    try {
      const url = API_BASE
        ? `${API_BASE.replace(/\/$/, '')}/api/admin?__route=public-race-display&_t=${Date.now()}`
        : `/api/admin?__route=public-race-display&_t=${Date.now()}`;
      const res = await axios.get<RaceDisplayData>(url, {
        baseURL: '',
        timeout: 8000,
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      });
      return res.data;
    } catch {
      return null;
    }
  }, []);

  const fetchDisplay = useCallback(async () => {
    const fromDb = await fetchFromSupabase();
    if (fromDb) {
      setData(fromDb);
      setError(null);
    } else {
      const fromApi = await fetchFromApi();
      if (fromApi) {
        setData(fromApi);
        setError(null);
      } else {
        setError('Error al cargar');
        setData((prev) => prev);
      }
    }
    setLoading(false);
  }, [fetchFromSupabase, fetchFromApi]);

  useEffect(() => {
    fetchDisplay();
  }, [fetchDisplay]);

  // Actualización en tiempo real vía Supabase Realtime (cuando hay Supabase)
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('tiempos-carrera-live')
      .on(
        'postgres_changes',
        { schema: 'public', table: 'race_times', event: '*' },
        () => { fetchDisplay(); }
      )
      .on(
        'postgres_changes',
        { schema: 'public', table: 'race_status', event: '*' },
        () => { fetchDisplay(); }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDisplay]);

  // Polling de respaldo cada 2 s (por si Realtime no está habilitado o falla)
  const POLL_INTERVAL_MS = 2000;
  useEffect(() => {
    const interval = setInterval(fetchDisplay, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDisplay]);

  useEffect(() => {
    const url = API_BASE
      ? `${API_BASE.replace(/\/$/, '')}/api/public/rccronos-schedule`
      : '/api/public/rccronos-schedule';
    let cancelled = false;
    setScheduleLoading(true);
    fetch(`${url}?_t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: RccronosSchedule | null) => {
        if (!cancelled) setSchedule(json?.etapas?.length ? json : DEFAULT_SCHEDULE);
      })
      .catch(() => {
        if (!cancelled) setSchedule(DEFAULT_SCHEDULE);
      })
      .finally(() => {
        if (!cancelled) setScheduleLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // RC Cronos: actualización en tiempo real cada 10 s (programa y tiempos por tramo)
  const RCCRONOS_POLL_MS = 10000;
  useEffect(() => {
    const t = setInterval(() => {
      const url = API_BASE
        ? `${API_BASE.replace(/\/$/, '')}/api/public/rccronos-schedule`
        : '/api/public/rccronos-schedule';
      fetch(`${url}?_t=${Date.now()}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((json: RccronosSchedule | null) => {
          if (json?.etapas) setSchedule(json);
        })
        .catch(() => {});
    }, RCCRONOS_POLL_MS);
    return () => clearInterval(t);
  }, []);

  const isRed = data?.semaphore === 'red';
  const stopMessage = (data?.stop_message ?? '').trim();
  const times = data?.times ?? [];

  return (
    <div className="tp-page">
      <div className="tp-bg" aria-hidden />

      <header className="tp-header">
        <div className="tp-header-top">
          <a href="https://safaritraslassierras.com.ar/" className="tp-back" rel="noopener noreferrer">← VOLVER AL INICIO</a>
        </div>
        <h1 className="tp-title">Tiempos</h1>
        <p className="tp-subtitle">Resultados oficiales del Safari Tras las Sierras. Actualizados en vivo desde la app.</p>
        <div className="tp-header-line" aria-hidden>
          <span className="tp-dot" />
          <span className="tp-dot" />
        </div>
      </header>

      <div
        className={`tp-status-block ${isRed ? 'tp-status-block--red' : 'tp-status-block--green'}`}
        role="status"
        aria-live="polite"
        aria-label={isRed ? 'Carrera parada' : 'Carrera en curso'}
      >
        <ClockIcon className="tp-status-block-icon" />
        <span className="tp-status-block-text">{isRed ? 'Carrera parada' : 'Carrera en curso'}</span>
      </div>

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

      {!scheduleLoading && schedule && schedule.etapas.length > 0 && (
        <section className="tp-rccronos" aria-label="Programa y tiempos por tramo">
          <h2 className="tp-rccronos-title">Programa y tiempos por tramo</h2>
          <p className="tp-rccronos-source">
            Datos actualizados desde{' '}
            <a href={schedule.source} target="_blank" rel="noopener noreferrer">RC Cronos</a> (cronómetro oficial).
          </p>
          <div className="tp-rccronos-tables">
            {schedule.etapas.map((etapa, i) => (
              <div key={i} className="tp-rccronos-block">
                {etapa.nombre && <h3 className="tp-rccronos-etapa">{etapa.nombre}</h3>}
                <div className="tp-rccronos-table-wrap">
                  <table className="tp-rccronos-table">
                    <thead>
                      <tr>
                        <th>Tramo</th>
                        <th>Hora</th>
                        <th>Tiempos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {etapa.tramos.map((row, j) => (
                        <tr key={j}>
                          <td>{row.tramo}</td>
                          <td>{row.hora || '—'}</td>
                          <td>{row.tiempos || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
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
        ) : null}
      </main>

      <footer className="tp-footer">
        <p className="tp-footer-support">CON EL APOYO DE</p>
        <div className="tp-footer-logos logos-carousel">
          <div className="logos-carousel-track" aria-hidden="true">
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-04-scaled.png" alt="" />
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-05-2-scaled.png" alt="" />
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/02/insumos-para-figma-12.png" alt="" />
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-04-scaled.png" alt="" />
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-05-2-scaled.png" alt="" />
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/02/insumos-para-figma-12.png" alt="" />
          </div>
        </div>
        <p className="tp-footer-update">Actualización en tiempo real · Safari Tras las Sierras</p>
      </footer>
    </div>
  );
}
