import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './AdminApprove.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API_BASE_URL;

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
  numero?: number;
  estado: string;
  comprobante_pago_url?: string;
}

export default function AdminApprove() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [pilotInfo, setPilotInfo] = useState<PilotInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      // Guardar la URL actual para redirigir después del login
      const returnUrl = `/admin/approve/${id}`;
      // Redirigir al login con el returnUrl
      navigate(`/admin/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (id) {
      fetchPilotInfo(id);
    } else {
      setError('ID de piloto no proporcionado');
      setLoading(false);
    }
  }, [id, isAuthenticated, navigate]);

  const fetchPilotInfo = async (pilotId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/admin/pilots/${pilotId}`);
      setPilotInfo(response.data);
    } catch (err: any) {
      console.error('Error obteniendo información del piloto:', err);
      setError('No se pudo cargar la información del piloto. Verifica que el ID sea correcto.');
    } finally {
      setLoading(false);
    }
  };

  const updatePilotStatus = async (status: 'aprobado' | 'rechazado') => {
    if (!pilotInfo) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await axios.patch(`/admin/pilots/${pilotInfo.id}/status`, { estado: status });
      setSuccess(`✅ Piloto ${pilotInfo.nombre} ${pilotInfo.apellido} ${status === 'aprobado' ? 'APROBADO' : 'RECHAZADO'} exitosamente.`);
      setPilotInfo(prev => prev ? { ...prev, estado: status } : null);
      setLoading(false);
      
      // NO redirigir automáticamente - dejar que el admin decida si quiere aprobar otro o ir al dashboard
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      setError('Error al actualizar el estado del piloto. Intenta nuevamente.');
      setLoading(false);
    }
  };

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
          <button onClick={() => navigate('/admin')} className="btn btn-primary">
            Volver al Dashboard
          </button>
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
              <h2>{pilotInfo.nombre} {pilotInfo.apellido}</h2>
              <span className={`status-badge status-${pilotInfo.estado}`}>
                {pilotInfo.estado === 'aprobado' ? '✓ Aprobado' : 
                 pilotInfo.estado === 'rechazado' ? '✗ Rechazado' : 
                 '⏳ Pendiente'}
              </span>
            </div>

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
                  {pilotInfo.categoria ? (pilotInfo.categoria === 'auto' ? 'AUTO' : 'MOTO') : 'No disponible'}
                  {pilotInfo.categoria === 'auto' && pilotInfo.categoria_auto && ` - ${pilotInfo.categoria_auto}`}
                  {pilotInfo.categoria === 'moto' && pilotInfo.categoria_moto && ` - ${pilotInfo.categoria_moto}`}
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

