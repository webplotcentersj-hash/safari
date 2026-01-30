import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './AdminApprove.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API_BASE;

interface PilotInfo {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  categoria: string;
  categoria_auto?: string;
  categoria_moto?: string;
  categoria_cuatri?: string;
  numero?: number;
  estado: string;
  comprobante_pago_url?: string;
}

export default function AdminApprove() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isRestoring, token } = useAuth();
  const [pilotInfo, setPilotInfo] = useState<PilotInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 AdminApprove useEffect:', { id, isAuthenticated, isRestoring });
    
    // Esperar a que termine de restaurar la sesión
    if (isRestoring) {
      console.log('⏳ Esperando a que termine la restauración de sesión...');
      return;
    }

    if (!isAuthenticated) {
      console.log('❌ No autenticado, redirigiendo al login');
      // Guardar la URL actual para redirigir después del login
      const returnUrl = `/admin/approve/${id}`;
      // Redirigir al login con el returnUrl
      navigate(`/admin/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (id) {
      fetchPilotInfo(id);
    } else {
      console.error('❌ ID de piloto no proporcionado');
      setError('ID de piloto no proporcionado');
      setLoading(false);
    }
  }, [id, isAuthenticated, isRestoring, navigate]);

  const fetchPilotInfo = async (pilotId: string) => {
    setLoading(true);
    setError(null);
    const maxRetries = 3;
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(`/admin/pilots/${pilotId}`, {
          headers: { Accept: 'application/json' },
          timeout: 15000
        });
        let pilotData = response.data;
        if (typeof pilotData === 'string') {
          if (pilotData.trim().startsWith('<')) {
            throw new Error('HTML');
          }
          try {
            pilotData = JSON.parse(pilotData);
          } catch {
            throw new Error('Invalid JSON');
          }
        }
        if (typeof pilotData !== 'object' || pilotData === null) {
          throw new Error('No data');
        }
        const mapped: PilotInfo = {
          id: pilotData.id || pilotId,
          nombre: pilotData.nombre || '',
          apellido: pilotData.apellido || '',
          dni: pilotData.dni || '',
          email: pilotData.email || '',
          telefono: pilotData.telefono || '',
          categoria: pilotData.categoria || '',
          categoria_auto: pilotData.categoria_auto,
          categoria_moto: pilotData.categoria_moto,
          categoria_cuatri: pilotData.categoria_cuatri,
          numero: pilotData.numero,
          estado: pilotData.estado || 'pendiente',
          comprobante_pago_url: pilotData.comprobante_pago_url
        };
        setPilotInfo(mapped);
        setLoading(false);
        return;
      } catch (err: any) {
        const isLast = attempt === maxRetries;
        if (isLast) {
          setPilotInfo({
            id: pilotId,
            nombre: 'Piloto',
            apellido: `(ID: ${pilotId.substring(0, 8)}…)`,
            dni: '',
            email: '',
            telefono: '',
            categoria: '',
            estado: 'pendiente'
          });
          const status = err.response?.status;
          const data = err.response?.data;
          if (status === 403) {
            setError('Acceso denegado. Comprobá que estés logueado como admin.');
          } else if (status === 404) {
            setError('Piloto no encontrado. Verificá el QR.');
          } else if (data && typeof data === 'object' && data.error) {
            setError(typeof data.error === 'string' ? data.error : 'Error del servidor.');
          } else {
            setError('No se cargaron los datos. Podés aprobar o rechazar igual.');
          }
        }
        if (!isLast) await delay(1000);
      }
    }
    setLoading(false);
  };

  const updatePilotStatus = async (status: 'aprobado' | 'rechazado') => {
    if (!pilotInfo) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('📤 Actualizando estado del piloto:', {
        id: pilotInfo.id,
        status: status
      });
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await axios.patch(`/admin/pilots/${pilotInfo.id}/status`, { estado: status }, {
        headers,
        timeout: 15000
      });
      console.log('✅ Estado actualizado exitosamente:', response.data);
      
      setSuccess(`✅ Piloto ${pilotInfo.nombre || ''} ${pilotInfo.apellido || ''} ${status === 'aprobado' ? 'APROBADO' : 'RECHAZADO'} exitosamente.`);
      setPilotInfo(prev => prev ? { ...prev, estado: status } : null);
      setLoading(false);
      
      // NO redirigir automáticamente - dejar que el admin decida si quiere aprobar otro o ir al dashboard
    } catch (err: any) {
      console.error('❌ Error actualizando estado:', err);
      console.error('❌ Error response:', err.response);
      console.error('❌ Error status:', err.response?.status);
      console.error('❌ Error data:', err.response?.data);
      console.error('❌ URL intentada:', `/admin/pilots/${pilotInfo.id}/status`);
      
      const errorMessage = err.response?.data?.error 
        || err.message 
        || 'Error al actualizar el estado del piloto. Intenta nuevamente.';
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Si está restaurando la sesión, mostrar loading
  if (isRestoring) {
    return (
      <div className="admin-approve">
        <div className="approve-loading">
          <p>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-approve">
        <div className="approve-error">
          <p>Debes iniciar sesión para aprobar pilotos</p>
          <p>Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  if (loading && !pilotInfo) {
    return (
      <div className="admin-approve">
        <div className="approve-loading">
          <p>Cargando información del piloto...</p>
        </div>
      </div>
    );
  }

  if (error && !pilotInfo) {
    return (
      <div className="admin-approve">
        <div className="approve-error">
          <p>{error}</p>
          <div className="approve-error-actions">
            {id && (
              <button onClick={() => fetchPilotInfo(id)} className="btn btn-secondary">
                Reintentar
              </button>
            )}
            <button onClick={() => navigate('/admin')} className="btn btn-primary">
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-approve">
      <div className="approve-container">
        <div className="approve-header">
          <div className="approve-title-section">
            <img src="/logo.png" alt="Safari Logo" className="approve-logo" />
            <h1>✅ Aprobar/Rechazar Piloto</h1>
            <p className="approve-subtitle">Escanea el QR del piloto para ver su información y aprobar su inscripción</p>
          </div>
        </div>

        {error && (
          <div className="approve-alert approve-alert-error">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="alert-close">×</button>
          </div>
        )}

        {success && (
          <div className="approve-alert approve-alert-success">
            <p>{success}</p>
          </div>
        )}

        {pilotInfo && (
          <div className="pilot-info-card">
            <div className="pilot-header">
              <h2>
                {pilotInfo.nombre && pilotInfo.apellido 
                  ? `${pilotInfo.nombre} ${pilotInfo.apellido}` 
                  : pilotInfo.id 
                    ? `Piloto ID: ${pilotInfo.id.substring(0, 8)}...` 
                    : 'Piloto'}
              </h2>
              <span className={`status-badge status-${pilotInfo.estado || 'pendiente'}`}>
                {pilotInfo.estado === 'aprobado' ? '✓ Aprobado' : 
                 pilotInfo.estado === 'rechazado' ? '✗ Rechazado' : 
                 '⏳ Pendiente'}
              </span>
            </div>
            
            {(!pilotInfo.nombre || !pilotInfo.dni) && (
              <div className="approve-alert approve-alert-error" style={{ marginBottom: '16px' }}>
                <p>⚠️ Los datos del piloto no se cargaron completamente. Verifica la consola para más detalles.</p>
                <button 
                  onClick={() => {
                    if (id) {
                      fetchPilotInfo(id);
                    }
                  }} 
                  className="btn btn-secondary btn-small"
                  style={{ marginTop: '8px' }}
                >
                  🔄 Reintentar Carga
                </button>
              </div>
            )}

            <div className="pilot-details">
              <div className="detail-row">
                <span className="detail-label">Nombre Completo:</span>
                <span className="detail-value">{pilotInfo.nombre} {pilotInfo.apellido}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">DNI:</span>
                <span className="detail-value">{pilotInfo.dni}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{pilotInfo.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Teléfono:</span>
                <span className="detail-value">{pilotInfo.telefono}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Categoría:</span>
                <span className="detail-value">
                  {pilotInfo.categoria ? (pilotInfo.categoria === 'auto' ? 'AUTO' : pilotInfo.categoria === 'moto' ? 'MOTO' : 'CUATRI') : 'No disponible'}
                  {pilotInfo.categoria === 'auto' && pilotInfo.categoria_auto && ` - ${pilotInfo.categoria_auto}`}
                  {pilotInfo.categoria === 'moto' && pilotInfo.categoria_moto && ` - ${pilotInfo.categoria_moto}`}
                  {pilotInfo.categoria === 'cuatri' && pilotInfo.categoria_cuatri && ` - ${pilotInfo.categoria_cuatri}`}
                </span>
              </div>
              {pilotInfo.numero && (
                <div className="detail-row">
                  <span className="detail-label">Número de Competencia:</span>
                  <span className="detail-value">#{pilotInfo.numero.toString().padStart(2, '0')}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">ID de Inscripción:</span>
                <span className="detail-value" style={{ fontSize: '11px', wordBreak: 'break-all' }}>{pilotInfo.id}</span>
              </div>
            </div>

            {pilotInfo.comprobante_pago_url && (
              <div className="pilot-actions">
                <a 
                  href={pilotInfo.comprobante_pago_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-small"
                >
                  📄 Ver Comprobante de Pago
                </a>
              </div>
            )}

            <div className="pilot-actions-main">
              <div className="action-buttons-group">
                {pilotInfo.estado !== 'aprobado' && (
                  <button
                    onClick={() => updatePilotStatus('aprobado')}
                    className="btn btn-success btn-large"
                    disabled={loading}
                  >
                    ✓ APROBAR PILOTO
                  </button>
                )}
                {pilotInfo.estado !== 'rechazado' && (
                  <button
                    onClick={() => updatePilotStatus('rechazado')}
                    className="btn btn-danger btn-large"
                    disabled={loading}
                  >
                    ✗ RECHAZAR PILOTO
                  </button>
                )}
              </div>
              
              {success && (
                <div className="success-actions">
                  <button
                    onClick={() => {
                      setPilotInfo(null);
                      setSuccess(null);
                      setError(null);
                      // Limpiar y permitir escanear otro QR o ingresar otro ID
                    }}
                    className="btn btn-primary"
                  >
                    🔄 Aprobar Otro Piloto
                  </button>
                </div>
              )}
              
              <button
                onClick={() => navigate('/admin')}
                className="btn btn-secondary"
                disabled={loading}
              >
                ← Ir al Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

