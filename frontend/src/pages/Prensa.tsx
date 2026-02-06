import { useState, useEffect, useCallback } from 'react';
import './Prensa.css';

const SITE_HOME = 'https://safaritraslassierras.com.ar/';
const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface PilotPrensa {
  id: string;
  nombre: string;
  apellido: string;
  numero: number | null;
  categoria: string;
  categoria_auto?: string | null;
  categoria_moto?: string | null;
  categoria_enduro?: string | null;
  categoria_travesia_moto?: string | null;
  categoria_cuatri?: string | null;
  tipo_campeonato?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  copiloto_nombre?: string | null;
}

type VehiculoFilter = 'all' | 'auto' | 'moto' | 'cuatri';

function getCategoriaLabel(p: PilotPrensa): string {
  if (p.categoria === 'auto' && p.categoria_auto) return p.categoria_auto;
  if (p.categoria === 'moto') {
    if (p.tipo_campeonato === 'enduro' && p.categoria_enduro) return `Enduro — ${p.categoria_enduro}`;
    if (p.tipo_campeonato === 'travesias' && p.categoria_travesia_moto) return `Travesías — ${p.categoria_travesia_moto}`;
    if (p.categoria_moto) return p.categoria_moto;
    return 'Moto';
  }
  if (p.categoria === 'cuatri' && p.categoria_cuatri) return p.categoria_cuatri;
  if (p.categoria === 'auto') return 'Auto';
  if (p.categoria === 'cuatri') return 'Cuatriciclo';
  return p.categoria_auto || p.categoria_moto || '—';
}

export default function Prensa() {
  const [pilots, setPilots] = useState<PilotPrensa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehiculoFilter, setVehiculoFilter] = useState<VehiculoFilter>('all');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');

  const fetchPilots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/public/prensa/pilots`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setPilots(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      console.error('Error fetching prensa pilots:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPilots();
  }, [fetchPilots]);

  const categoriaOptions = Array.from(
    new Set(pilots.map((p) => getCategoriaLabel(p)).filter((l) => l && l !== '—'))
  ).sort();

  const filteredPilots = pilots.filter((p) => {
    if (vehiculoFilter !== 'all') {
      const cat = p.categoria?.toLowerCase();
      if (vehiculoFilter === 'auto' && cat !== 'auto') return false;
      if (vehiculoFilter === 'moto' && cat !== 'moto') return false;
      if (vehiculoFilter === 'cuatri' && cat !== 'cuatri') return false;
    }
    if (categoriaFilter !== 'all' && getCategoriaLabel(p) !== categoriaFilter) return false;
    return true;
  });

  const summaryByCategory: Record<string, number> = {};
  for (const p of pilots) {
    const label = getCategoriaLabel(p);
    const key = label && label !== '—' ? label : 'Otro';
    summaryByCategory[key] = (summaryByCategory[key] || 0) + 1;
  }
  const summaryEntries = Object.entries(summaryByCategory).sort(([a], [b]) => a.localeCompare(b));

  const downloadExcel = () => {
    let categoria = 'todos';
    if (vehiculoFilter === 'auto') categoria = 'auto';
    else if (vehiculoFilter === 'moto') categoria = 'moto';
    else if (vehiculoFilter === 'cuatri') categoria = 'cuatri';

    const params = new URLSearchParams();
    params.set('categoria', categoria);
    if (categoriaFilter !== 'all') params.set('categoria_detalle', categoriaFilter);

    const url = `${API_BASE}/public/prensa/planilla-excel?${params.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="prensa-page">
      <header className="prensa-header">
        <div className="prensa-header-inner">
          <a href={SITE_HOME} className="prensa-back-link" rel="noopener noreferrer">
            ← Volver al sitio
          </a>
          <img src="/logo.png" alt="Safari Tras las Sierras" className="prensa-logo" />
          <h1>Prensa</h1>
          <p className="prensa-subtitle">Safari Tras las Sierras — Valle Fértil, San Juan</p>
          <div className="prensa-header-logos logos-carousel">
            <div className="logos-carousel-track" aria-hidden="true">
              <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-04-scaled.png" alt="" />
              <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-05-2-scaled.png" alt="" />
              <img src="https://plotcenter.com.ar/wp-content/uploads/2026/02/insumos-para-figma-12.png" alt="" />
              <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-04-scaled.png" alt="" />
              <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-05-2-scaled.png" alt="" />
              <img src="https://plotcenter.com.ar/wp-content/uploads/2026/02/insumos-para-figma-12.png" alt="" />
            </div>
          </div>
        </div>
      </header>

      <main className="prensa-main">
        <div className="prensa-main-inner">
          <section className="prensa-info">
            <p>
              En esta sección podés consultar y descargar el listado de inscriptos para la competencia (aprobados y pendientes).
              El archivo incluye: nombre, categoría, número, provincia, departamento y nombre del copiloto (en autos).
              Los datos se descargan ordenados por categoría (autos, motos, cuatriciclos) e incluyen un resumen de
              cantidad de inscriptos por categoría.
            </p>
          </section>

          {loading ? (
            <div className="prensa-loading">Cargando datos...</div>
          ) : error ? (
            <div className="prensa-error">
              <p>{error}</p>
              <button type="button" onClick={fetchPilots} className="prensa-retry">
                Reintentar
              </button>
            </div>
          ) : (
            <>
              <section className="prensa-resumen">
                <h2>Resumen por categoría</h2>
                <div className="prensa-resumen-grid">
                  {summaryEntries.length === 0 ? (
                    <p className="prensa-resumen-empty">No hay inscriptos.</p>
                  ) : (
                    summaryEntries.map(([label, count]) => (
                      <div key={label} className="prensa-resumen-item">
                        <span className="prensa-resumen-label">{label}</span>
                        <span className="prensa-resumen-count">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="prensa-filtros">
                <h2>Descargar planilla</h2>
                <p className="prensa-filtros-desc">
                  Elegí el tipo de vehículo y, si querés, una categoría específica. Luego hacé clic en Descargar Excel.
                </p>
                <div className="prensa-filtros-row">
                  <div className="prensa-filtros-group">
                    <label>Tipo</label>
                    <div className="prensa-filtros-btns">
                      {(['all', 'auto', 'moto', 'cuatri'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          className={`prensa-filter-btn ${vehiculoFilter === v ? 'active' : ''}`}
                          onClick={() => {
                            setVehiculoFilter(v);
                            setCategoriaFilter('all');
                          }}
                        >
                          {v === 'all' ? 'Todos' : v === 'auto' ? 'Autos' : v === 'moto' ? 'Motos' : 'Cuatriciclos'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="prensa-filtros-group">
                    <label>Categoría</label>
                    <select
                      className="prensa-select"
                      value={categoriaFilter}
                      onChange={(e) => setCategoriaFilter(e.target.value)}
                    >
                      <option value="all">Todas</option>
                      {categoriaOptions.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="prensa-download-row">
                  <span className="prensa-count">
                    {filteredPilots.length} inscripto{filteredPilots.length !== 1 ? 's' : ''} con el filtro actual
                  </span>
                  <button type="button" className="prensa-download-btn" onClick={downloadExcel}>
                    Descargar Excel
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <footer className="prensa-footer">
        <div className="prensa-footer-logos logos-carousel">
          <div className="logos-carousel-track" aria-hidden="true">
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-04-scaled.png" alt="" />
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-05-2-scaled.png" alt="" />
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/02/insumos-para-figma-12.png" alt="" />
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-04-scaled.png" alt="" />
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/01/Logos-marcas-05-2-scaled.png" alt="" />
            <img src="https://plotcenter.com.ar/wp-content/uploads/2026/02/insumos-para-figma-12.png" alt="" />
          </div>
        </div>
        <a href={SITE_HOME} rel="noopener noreferrer">
          safaritraslassierras.com.ar
        </a>
      </footer>
    </div>
  );
}
