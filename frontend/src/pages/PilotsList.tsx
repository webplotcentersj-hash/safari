import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import './PilotsList.css';

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
  numero?: number;
}

export default function PilotsList() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPilots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('=== FETCHING PILOTS DIRECTLY FROM SUPABASE ===');
      console.log('Supabase client available:', !!supabase);
      
      if (!supabase) {
        const errorMsg = 'Supabase client no está configurado. Verificá que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estén configuradas en Vercel.';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      // Consultar directamente desde Supabase usando el cliente del frontend
      const { data: pilotsData, error: supabaseError } = await supabase
        .from('pilots')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Supabase query result - error:', supabaseError);
      console.log('Supabase query result - data:', pilotsData);
      console.log('Supabase query result - data length:', pilotsData?.length);

      if (supabaseError) {
        console.error('Supabase error:', supabaseError);
        throw new Error(supabaseError.message || 'Error al cargar los pilotos desde Supabase');
      }

      const pilotsArray = Array.isArray(pilotsData) ? pilotsData : [];
      console.log(`✅ Successfully loaded ${pilotsArray.length} pilots`);
      
      if (pilotsArray.length > 0) {
        console.log('First pilot:', pilotsArray[0]);
      }
      
      setPilots(pilotsArray);
    } catch (err: any) {
      console.error('❌ Error fetching pilots:', err);
      setError(err.message || 'Error al cargar los pilotos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPilots();
    // Actualizar cada 10 segundos
    const interval = setInterval(fetchPilots, 10000);
    return () => clearInterval(interval);
  }, [fetchPilots]);

  const filteredPilots = pilots.filter((pilot) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      pilot.nombre?.toLowerCase().includes(search) ||
      pilot.apellido?.toLowerCase().includes(search) ||
      pilot.dni?.toLowerCase().includes(search) ||
      pilot.email?.toLowerCase().includes(search) ||
      pilot.categoria_auto?.toLowerCase().includes(search) ||
      pilot.categoria_moto?.toLowerCase().includes(search) ||
      pilot.numero?.toString().includes(search)
    );
  });

  const approvedPilots = filteredPilots.filter(p => p.estado === 'aprobado');
  const pendingPilots = filteredPilots.filter(p => p.estado === 'pendiente');

  return (
    <div className="pilots-list-page">
      <header className="pilots-header">
        <div className="container">
          <Link to="/" className="back-link">← Volver al inicio</Link>
          <img src="/logo.png" alt="Safari Tras las Sierras" className="pilots-logo" />
          <h1>Pilotos Inscritos</h1>
          <p className="subtitle">Lista de todos los pilotos inscritos en el Safari Tras las Sierras</p>
        </div>
      </header>

      <main className="pilots-main">
        <div className="container">
          {loading ? (
            <div className="loading">Cargando pilotos...</div>
          ) : error ? (
            <div className="alert alert-error">
              <strong>Error:</strong> {error}
              <button onClick={fetchPilots} className="btn btn-primary btn-sm" style={{ marginLeft: '10px' }}>
                Reintentar
              </button>
            </div>
          ) : (
            <>
              <div className="pilots-stats">
                <div className="stat-box">
                  <span className="stat-label">Total Inscritos:</span>
                  <span className="stat-value">{pilots.length}</span>
                </div>
                <div className="stat-box stat-approved">
                  <span className="stat-label">Aprobados:</span>
                  <span className="stat-value">{approvedPilots.length}</span>
                </div>
                <div className="stat-box stat-pending">
                  <span className="stat-label">Pendientes:</span>
                  <span className="stat-value">{pendingPilots.length}</span>
                </div>
              </div>

              <div className="search-section">
                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido, DNI, email, categoría o número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              {filteredPilots.length === 0 ? (
                <div className="empty-state">
                  <p>No se encontraron pilotos{searchTerm ? ' que coincidan con la búsqueda' : ''}.</p>
                </div>
              ) : (
                <div className="pilots-grid">
                  {filteredPilots.map((pilot) => (
                    <div key={pilot.id} className={`pilot-card ${pilot.estado}`}>
                      <div className="pilot-card-header">
                        <div className="pilot-name">
                          <h3>{pilot.nombre} {pilot.apellido}</h3>
                          {pilot.numero && (
                            <span className="pilot-number">#{pilot.numero.toString().padStart(2, '0')}</span>
                          )}
                        </div>
                        <span className={`status-badge status-${pilot.estado}`}>
                          {pilot.estado === 'aprobado' ? '✓ Aprobado' : 
                           pilot.estado === 'rechazado' ? '✗ Rechazado' : 
                           '⏳ Pendiente'}
                        </span>
                      </div>
                      
                      <div className="pilot-details">
                        <div className="detail-row">
                          <span className="detail-label">DNI:</span>
                          <span className="detail-value">{pilot.dni}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Email:</span>
                          <span className="detail-value">{pilot.email}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Teléfono:</span>
                          <span className="detail-value">{pilot.telefono}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Vehículo:</span>
                          <span className="detail-value">
                            {pilot.categoria === 'auto' ? '🚗 Auto' : 
                             pilot.categoria === 'moto' ? '🏍️ Moto' : 
                             'N/A'}
                          </span>
                        </div>
                        {(pilot.categoria_auto || pilot.categoria_moto) && (
                          <div className="detail-row">
                            <span className="detail-label">Categoría:</span>
                            <span className="detail-value category-badge">
                              {pilot.categoria_auto || pilot.categoria_moto}
                            </span>
                          </div>
                        )}
                        <div className="detail-row">
                          <span className="detail-label">Fecha de inscripción:</span>
                          <span className="detail-value">
                            {new Date(pilot.created_at).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="pilots-footer">
        <div className="container">
          <p>Desarrollado con ❤️ por <strong>Plot Center</strong> 2026</p>
        </div>
      </footer>
    </div>
  );
}

