import { useState, useEffect, useCallback } from 'react';
import './PilotsList.css';

const SITE_HOME = 'https://safaritraslassierras.com.ar/';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface Pilot {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  estado: string;
  created_at: string;
  categoria?: string;
  categoria_auto?: string;
  categoria_moto?: string;
  categoria_enduro?: string;
  categoria_travesia_moto?: string;
  categoria_cuatri?: string;
  tipo_campeonato?: string;
  numero?: number;
}

type VehiculoFilter = 'all' | 'auto' | 'moto' | 'cuatri';
type CategoriaFilter = 'all' | string;

export default function PilotsList() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehiculoFilter, setVehiculoFilter] = useState<VehiculoFilter>('all');
  const [categoriaFilter, setCategoriaFilter] = useState<CategoriaFilter>('all');

  const fetchPilots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/admin/pilots`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.details || `Error ${res.status}`);
      }
      const data = await res.json();
      const pilotsArray = Array.isArray(data) ? data : [];
      setPilots(pilotsArray);
    } catch (err: any) {
      console.error('Error fetching pilots:', err);
      setError(err.message || 'Error al cargar los pilotos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPilots();
    // Actualizar cada 30 segundos (menos agresivo)
    const interval = setInterval(fetchPilots, 30000);
    return () => clearInterval(interval);
  }, [fetchPilots]);

  const getCategoriaLabel = (p: Pilot) => {
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
  };

  const categoriaOptions = Array.from(
    new Set(
      pilots
        .map((p) => getCategoriaLabel(p))
        .filter((label) => label && label !== '—'),
    ),
  ).sort();

  const filteredPilots = pilots.filter((pilot) => {
    if (vehiculoFilter !== 'all') {
      const cat = pilot.categoria?.toLowerCase();
      if (vehiculoFilter === 'auto' && cat !== 'auto') return false;
      if (vehiculoFilter === 'moto' && cat !== 'moto') return false;
      if (vehiculoFilter === 'cuatri' && cat !== 'cuatri') return false;
    }

    if (categoriaFilter !== 'all') {
      if (getCategoriaLabel(pilot) !== categoriaFilter) return false;
    }

    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      pilot.nombre?.toLowerCase().includes(search) ||
      pilot.apellido?.toLowerCase().includes(search) ||
      pilot.dni?.toLowerCase().includes(search) ||
      pilot.email?.toLowerCase().includes(search) ||
      pilot.categoria_auto?.toLowerCase().includes(search) ||
      pilot.categoria_moto?.toLowerCase().includes(search) ||
      pilot.categoria_enduro?.toLowerCase().includes(search) ||
      pilot.categoria_travesia_moto?.toLowerCase().includes(search) ||
      pilot.categoria_cuatri?.toLowerCase().includes(search) ||
      pilot.numero?.toString().includes(search)
    );
  });

  const getVehiculoLabel = (p: Pilot) => {
    if (p.categoria === 'auto') return 'Auto';
    if (p.categoria === 'moto') return 'Moto';
    if (p.categoria === 'cuatri') return 'Cuatriciclo';
    return '—';
  };

  return (
    <div className="pilots-list-page">
      <header className="pilots-header">
        <div className="pilots-header-inner">
          <a href={SITE_HOME} className="back-link" rel="noopener noreferrer">← Volver al sitio</a>
          <img src="/logo.png" alt="Safari Tras las Sierras" className="pilots-logo" />
          <h1>Pilotos Inscritos</h1>
          <p className="subtitle">Safari Tras las Sierras — Valle Fértil, San Juan</p>
        </div>
      </header>

      <main className="pilots-main">
        <div className="pilots-main-inner">
          {loading ? (
            <div className="pilots-loading">Cargando lista...</div>
          ) : error ? (
            <div className="pilots-error">
              <p>{error}</p>
              <button type="button" onClick={fetchPilots} className="pilots-retry">Reintentar</button>
            </div>
          ) : (
            <>
              <div className="pilots-toolbar">
                <span className="pilots-count">{filteredPilots.length} inscripto{filteredPilots.length !== 1 ? 's' : ''}</span>
                <div className="pilots-filters">
                  <button
                    type="button"
                    className={`pilots-filter-btn ${vehiculoFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setVehiculoFilter('all')}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className={`pilots-filter-btn ${vehiculoFilter === 'auto' ? 'active' : ''}`}
                    onClick={() => setVehiculoFilter('auto')}
                  >
                    Autos
                  </button>
                  <button
                    type="button"
                    className={`pilots-filter-btn ${vehiculoFilter === 'moto' ? 'active' : ''}`}
                    onClick={() => setVehiculoFilter('moto')}
                  >
                    Motos
                  </button>
                  <button
                    type="button"
                    className={`pilots-filter-btn ${vehiculoFilter === 'cuatri' ? 'active' : ''}`}
                    onClick={() => setVehiculoFilter('cuatri')}
                  >
                    Cuatriciclos
                  </button>
                </div>
                <select
                  className="pilots-category-select"
                  value={categoriaFilter}
                  onChange={(e) => setCategoriaFilter(e.target.value as CategoriaFilter)}
                >
                  <option value="all">Todas las categorías</option>
                  {categoriaOptions.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Buscar por nombre, categoría o número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pilots-search"
                />
              </div>

              {filteredPilots.length === 0 ? (
                <div className="pilots-empty">
                  No hay pilotos
                  {searchTerm || vehiculoFilter !== 'all' || categoriaFilter !== 'all'
                    ? ' que coincidan con el filtro'
                    : ''}.
                </div>
              ) : (
                <>
                  <div className="pilots-table-wrap pilots-desktop-only">
                    <table className="pilots-table">
                      <thead>
                        <tr>
                          <th>Nº</th>
                          <th>Nombre</th>
                          <th>Vehículo</th>
                          <th>Categoría</th>
                          <th>Fecha inscripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPilots.map((pilot) => (
                          <tr key={pilot.id}>
                            <td className="col-num">{pilot.numero != null ? pilot.numero.toString().padStart(2, '0') : '—'}</td>
                            <td className="col-name">{pilot.nombre} {pilot.apellido}</td>
                            <td className="col-vehiculo">{getVehiculoLabel(pilot)}</td>
                            <td className="col-categoria">{getCategoriaLabel(pilot)}</td>
                            <td className="col-fecha">{new Date(pilot.created_at).toLocaleDateString('es-AR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pilots-cards-mobile">
                    {filteredPilots.map((pilot) => (
                      <div key={pilot.id} className="pilot-card-mobile">
                        <div className="pilot-card-mobile-row pilot-card-mobile-header">
                          <span className="pilot-card-mobile-num">{pilot.numero != null ? '#' + pilot.numero.toString().padStart(2, '0') : '—'}</span>
                          <span className="pilot-card-mobile-name">{pilot.nombre} {pilot.apellido}</span>
                        </div>
                        <div className="pilot-card-mobile-row">
                          <span className="pilot-card-mobile-label">Vehículo</span>
                          <span className="pilot-card-mobile-value">{getVehiculoLabel(pilot)}</span>
                        </div>
                        <div className="pilot-card-mobile-row">
                          <span className="pilot-card-mobile-label">Categoría</span>
                          <span className="pilot-card-mobile-value">{getCategoriaLabel(pilot)}</span>
                        </div>
                        <div className="pilot-card-mobile-row">
                          <span className="pilot-card-mobile-label">Fecha inscripción</span>
                          <span className="pilot-card-mobile-value">{new Date(pilot.created_at).toLocaleDateString('es-AR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="pilots-footer">
        <a href={SITE_HOME} rel="noopener noreferrer">safaritraslassierras.com.ar</a>
      </footer>
    </div>
  );
}

