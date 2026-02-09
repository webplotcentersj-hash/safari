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
      const list = Array.isArray(data) ? data : [];
      setPilots(list.filter((p: PilotPrensa) => (p.categoria || '').toLowerCase() === 'auto'));
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
    const params = new URLSearchParams();
    params.set('categoria', 'auto');
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
          <h1>Prensa (Autos)</h1>
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
              En esta sección podés consultar y descargar el listado de inscriptos de <strong>autos</strong> para la competencia (aprobados y pendientes).
              El archivo incluye: nombre, categoría, número, provincia, departamento y nombre del copiloto.
              Los datos se descargan ordenados por categoría e incluyen un resumen de cantidad de inscriptos por categoría.
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
              <section className="prensa-filtros">
                <h2>Descargar planilla</h2>
                <p className="prensa-filtros-desc">
                  Elegí una categoría (opcional) y hacé clic en Descargar Excel para obtener la planilla de autos.
                </p>
                <div className="prensa-filtros-row">
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

              <section className="prensa-clasificaciones-motos">
                <h2>Competencia de motos — Fin de semana en Valle Fértil</h2>
                <p className="prensa-nota">
                  El Safari Tras las Sierras vivió una nueva fecha del campeonato de motos en Valle Fértil, San Juan, 
                  con pruebas de Travesía y Enduro el sábado y la definición por categorías el domingo 8 de febrero. 
                  Gran participación de pilotos de la región en las distintas cilindradas y categorías.
                </p>

                <h3 className="prensa-clasif-sub">Sábado — Campeonato Travesía</h3>
                <div className="prensa-clasif-grid">
                  <div className="prensa-clasif-cat">
                    <strong>110CC Libre</strong>
                    <ol><li>Norte Cristian (53)</li><li>Davighi Alfredo Daniel (120)</li><li>Elizondo Armando (123)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>150CC China</strong>
                    <ol><li>Funez Franco (136)</li><li>Reinoso Gerardo (22)</li><li>Fernández Eduardo (76)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>250CC 4V</strong>
                    <ol><li>León Franco (160)</li><li>Becerra Lucas (163)</li><li>Romero Cesar (164)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>Cuadri 450CC Open</strong>
                    <ol><li>Domínguez Aldo (49)</li><li>Savina Juan Cruz (180)</li><li>Oviedo Ulises (182)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>Cuadri 250CC Chino</strong>
                    <ol><li>Casivar Lautaro (77)</li><li>Gómez Francisco (74)</li><li>Valdez Pablo (93)</li></ol>
                  </div>
                </div>

                <h3 className="prensa-clasif-sub">Sábado — Campeonato Enduro</h3>
                <div className="prensa-clasif-grid">
                  <div className="prensa-clasif-cat">
                    <strong>Senior A</strong>
                    <ol><li>Martínez Juan Cruz (1)</li><li>Hierrezuelo Fernando (4)</li><li>Sosa Luciano (2)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>Junior A</strong>
                    <ol><li>Bolzonella Tomás (234)</li><li>García Santiago (233)</li><li>Martín Mariano (246)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>Master Senior</strong>
                    <ol><li>Vargas Benjamín (41)</li><li>Navarro Ariel (40)</li><li>Del Carril Marcelo (240)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>Master A</strong>
                    <ol><li>García Federico (253)</li><li>Jofre José Luis (51)</li><li>Sirvente Daniel (229)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>Promocional</strong>
                    <ol><li>Carbajal Joaquín (100)</li><li>Berrocal Ismael (281)</li><li>Sosa Máximo (103)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>Enduro</strong>
                    <ol><li>Aurieme Luciano (90)</li><li>Valdez Víctor (119)</li><li>Clever Miguel (92)</li></ol>
                  </div>
                </div>

                <h3 className="prensa-clasif-sub">Domingo — Resultados por categorías</h3>
                <div className="prensa-clasif-grid">
                  <div className="prensa-clasif-cat">
                    <strong>110CC Libre</strong>
                    <ol><li>Elizondo Fabian Andrés (125)</li><li>Norte Cristian (53)</li><li>Giménez Braian (112)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>150CC China</strong>
                    <ol><li>Funez Franco (136)</li><li>Avanzatti Demian (132)</li><li>Reinoso Gerardo (22)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>250CC 4V</strong>
                    <ol><li>Becerra Lucas (163)</li><li>León Franco (160)</li><li>Jofre Lucio (13)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>Senior A</strong>
                    <ol><li>Martínez Juan Cruz (1)</li><li>Hierrezuelo Fernando (4)</li><li>Nacusi Elías (3)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>Master A</strong>
                    <ol><li>Sirvente Daniel (229)</li><li>Jofre José Luis (51)</li><li>Blanco David (225)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>Promocional</strong>
                    <ol><li>Carbajal Joaquín (100)</li><li>Berrocal Ismael (281)</li><li>Paredes David (107)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>Principiante</strong>
                    <ol><li>Batezzatti Santiago (114)</li><li>Ferrer Maximiliano (247)</li><li>Balderramo Diego (169)</li></ol>
                  </div>
                  <div className="prensa-clasif-cat">
                    <strong>Enduro</strong>
                    <ol><li>Valdez Víctor (119)</li><li>Aurieme Luciano (90)</li><li>Marcial José (56)</li></ol>
                  </div>
                </div>
              </section>

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
