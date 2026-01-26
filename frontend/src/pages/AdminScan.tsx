import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import './AdminScan.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API_BASE_URL;

interface PilotData {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
  categoria: string;
  numero: number | null;
  categoria_detalle: string | null;
}

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

export default function AdminScan() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<PilotData | null>(null);
  const [pilotInfo, setPilotInfo] = useState<PilotInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = 'qr-reader';

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirigir al login después de un breve delay
      const timer = setTimeout(() => {
        navigate('/admin/login');
      }, 2000);
      return () => clearTimeout(timer);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isAuthenticated, navigate]);

  const startScanning = async () => {
    try {
      setError(null);
      setScannedData(null);
      setPilotInfo(null);
      setSuccess(null);
      
      // Solicitar permisos de cámara explícitamente primero
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        // Detener el stream temporal para que Html5Qrcode lo maneje
        stream.getTracks().forEach(track => track.stop());
      } catch (permError: any) {
        console.error('Error de permisos:', permError);
        if (permError.name === 'NotAllowedError' || permError.name === 'PermissionDeniedError') {
          setError('Se necesitan permisos de cámara. Por favor, permite el acceso a la cámara en la configuración del navegador.');
        } else if (permError.name === 'NotFoundError') {
          setError('No se encontró ninguna cámara en el dispositivo.');
        } else {
          setError('Error al acceder a la cámara: ' + permError.message);
        }
        return;
      }
      
      const scanner = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // Cámara trasera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignorar errores de escaneo continuo
        }
      );

      setScanning(true);
    } catch (err: any) {
      console.error('Error iniciando escáner:', err);
      if (err.message?.includes('Permission') || err.message?.includes('permission')) {
        setError('Se necesitan permisos de cámara. Por favor, permite el acceso a la cámara en la configuración del navegador.');
      } else {
        setError('Error al acceder a la cámara: ' + (err.message || 'Error desconocido'));
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Error deteniendo escáner:', err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    try {
      // Parsear el JSON del QR
      const qrData: PilotData = JSON.parse(decodedText);
      setScannedData(qrData);
      
      // Detener el escáner
      await stopScanning();
      
      // Obtener información completa del piloto
      await fetchPilotInfo(qrData.id);
    } catch (err: any) {
      console.error('Error parseando QR:', err);
      setError('QR inválido. Asegúrate de escanear el código de inscripción correcto.');
    }
  };

  const fetchPilotInfo = async (pilotId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/admin/pilots/${pilotId}`);
      setPilotInfo(response.data);
    } catch (err: any) {
      console.error('Error obteniendo información del piloto:', err);
      setError('Error al obtener información del piloto.');
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
      setSuccess(`Piloto ${status === 'aprobado' ? 'aprobado' : 'rechazado'} exitosamente`);
      
      // Actualizar estado local
      setPilotInfo({ ...pilotInfo, estado: status });
      
      // Limpiar después de 2 segundos
      setTimeout(() => {
        setScannedData(null);
        setPilotInfo(null);
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      setError(err.response?.data?.error || 'Error al actualizar el estado del piloto');
    } finally {
      setLoading(false);
    }
  };

  const resetScan = () => {
    setScannedData(null);
    setPilotInfo(null);
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirigir al login después de un breve delay
      const timer = setTimeout(() => {
        navigate('/admin/login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="admin-scan">
        <div className="scan-error">
          <p>Debes iniciar sesión para usar el escáner</p>
          <p>Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-scan">
      <div className="scan-container">
        <div className="scan-header">
          <h1>📱 Escanear QR de Inscripción</h1>
          <p>Escanea el código QR del piloto para aprobar o rechazar su inscripción</p>
        </div>

        {error && (
          <div className="scan-alert scan-alert-error">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="alert-close">×</button>
          </div>
        )}

        {success && (
          <div className="scan-alert scan-alert-success">
            <p>{success}</p>
          </div>
        )}

        {!scanning && !scannedData && (
          <div className="scan-controls">
            <button onClick={startScanning} className="btn btn-primary btn-large">
              📷 Iniciar Escáner
            </button>
          </div>
        )}

        {scanning && (
          <div className="scan-viewer">
            <div id={qrCodeRegionId} className="qr-scanner"></div>
            <button onClick={stopScanning} className="btn btn-secondary btn-stop">
              ⏹ Detener Escáner
            </button>
          </div>
        )}

        {loading && (
          <div className="scan-loading">
            <p>Cargando información del piloto...</p>
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
                  {pilotInfo.categoria === 'auto' ? 'AUTO' : 'MOTO'}
                  {pilotInfo.categoria === 'auto' && pilotInfo.categoria_auto && ` - ${pilotInfo.categoria_auto}`}
                  {pilotInfo.categoria === 'moto' && pilotInfo.categoria_moto && ` - ${pilotInfo.categoria_moto}`}
                </span>
              </div>
              {pilotInfo.numero && (
                <div className="detail-row">
                  <span className="detail-label">Número:</span>
                  <span className="detail-value">#{pilotInfo.numero.toString().padStart(2, '0')}</span>
                </div>
              )}
            </div>

            {pilotInfo.comprobante_pago_url && (
              <div className="pilot-actions">
                <a 
                  href={pilotInfo.comprobante_pago_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-small"
                >
                  📄 Ver Comprobante
                </a>
              </div>
            )}

            <div className="pilot-actions-main">
              {pilotInfo.estado !== 'aprobado' && (
                <button
                  onClick={() => updatePilotStatus('aprobado')}
                  className="btn btn-success btn-large"
                  disabled={loading}
                >
                  ✓ Aprobar Piloto
                </button>
              )}
              {pilotInfo.estado !== 'rechazado' && (
                <button
                  onClick={() => updatePilotStatus('rechazado')}
                  className="btn btn-danger btn-large"
                  disabled={loading}
                >
                  ✗ Rechazar Piloto
                </button>
              )}
              <button
                onClick={resetScan}
                className="btn btn-secondary btn-large"
              >
                🔄 Escanear Otro
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

