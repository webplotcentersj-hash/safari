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
  email?: string;
  telefono?: string;
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
      
      // Verificar si hay soporte para getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Tu navegador no soporta acceso a la cámara. Por favor, usa un navegador moderno como Chrome o Safari.');
        return;
      }

      const scanner = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = scanner;

      // Intentar obtener cámaras disponibles
      let cameraId: string | null = null;
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          // Buscar cámara trasera primero
          const backCamera = cameras.find(cam => 
            cam.label.toLowerCase().includes('back') || 
            cam.label.toLowerCase().includes('rear') ||
            cam.label.toLowerCase().includes('environment')
          );
          cameraId = backCamera ? backCamera.id : cameras[0].id;
        }
      } catch (camError: any) {
        console.log('No se pudieron obtener las cámaras, usando configuración por defecto:', camError);
      }

      // Intentar iniciar el escáner
      try {
        if (cameraId) {
          // Usar ID de cámara específico
          await scanner.start(
            cameraId,
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
        } else {
          // Usar facingMode como fallback
          await scanner.start(
            { facingMode: 'environment' },
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
        }
        setScanning(true);
      } catch (startError: any) {
        // Si falla, intentar con cámara frontal
        console.log('Intentando con cámara frontal...', startError);
        try {
          await scanner.start(
            { facingMode: 'user' },
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
        } catch (retryError: any) {
          throw retryError;
        }
      }
    } catch (err: any) {
      console.error('Error iniciando escáner:', err);
      let errorMsg = 'Error al acceder a la cámara.';
      
      const errorName = err.name || '';
      const errorMessage = err.message || '';
      
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || errorMessage.includes('Permission') || errorMessage.includes('permission')) {
        errorMsg = 'Se necesitan permisos de cámara. Por favor, permite el acceso a la cámara en la configuración del navegador y recarga la página.';
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError' || errorMessage.includes('NotFound') || errorMessage.includes('not found')) {
        errorMsg = 'No se encontró ninguna cámara en el dispositivo.';
      } else if (errorName === 'NotReadableError' || errorMessage.includes('NotReadable') || errorMessage.includes('in use')) {
        errorMsg = 'La cámara está siendo usada por otra aplicación. Cierra otras apps que usen la cámara e intenta nuevamente.';
      } else {
        errorMsg = `Error: ${errorMessage || errorName || 'Error desconocido'}. Por favor, recarga la página e intenta nuevamente.`;
      }
      
      setError(errorMsg);
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
      console.log('📱 QR escaneado (texto completo):', decodedText);
      console.log('📱 Tipo:', typeof decodedText);
      console.log('📱 Longitud:', decodedText.length);
      
      // Detener el escáner primero
      await stopScanning();
      
      let qrData: PilotData | null = null;
      
      // Intentar parsear como JSON
      try {
        qrData = JSON.parse(decodedText);
        console.log('✅ QR parseado como JSON:', qrData);
      } catch (parseError) {
        // Si no es JSON, puede ser solo un número (QR antiguo) o formato diferente
        console.log('⚠️ No es JSON válido, intentando otros formatos...');
        
        // Si es solo un número, buscar piloto por número
        const numeroMatch = decodedText.match(/^\d+$/);
        if (numeroMatch) {
          const numero = parseInt(decodedText, 10);
          console.log('🔢 QR contiene solo número:', numero);
          setError(`QR contiene solo el número ${numero}. Buscando piloto por número...`);
          
          // Buscar piloto por número en la API
          try {
            const response = await axios.get(`/admin/pilots?numero=${numero}`);
            if (response.data && response.data.length > 0) {
              const pilot = response.data[0];
              setPilotInfo({
                id: pilot.id,
                nombre: pilot.nombre,
                apellido: pilot.apellido,
                dni: pilot.dni,
                email: pilot.email || 'No disponible',
                telefono: pilot.telefono || 'No disponible',
                categoria: pilot.categoria || '',
                categoria_auto: pilot.categoria_auto,
                categoria_moto: pilot.categoria_moto,
                numero: pilot.numero,
                estado: pilot.estado || 'pendiente',
                comprobante_pago_url: pilot.comprobante_pago_url
              });
              setError(null);
              return;
            } else {
              setError(`No se encontró ningún piloto con el número ${numero}.`);
              return;
            }
          } catch (searchError: any) {
            console.error('Error buscando por número:', searchError);
            setError(`Error al buscar piloto con número ${numero}.`);
            return;
          }
        } else {
          throw new Error('Formato de QR no reconocido');
        }
      }
      
      if (!qrData) {
        setError('No se pudo leer la información del QR.');
        return;
      }
      
      setScannedData(qrData);
      
      // Si el QR tiene toda la información, crear un objeto PilotInfo con los datos del QR
      if (qrData.nombre && qrData.apellido && qrData.dni) {
        const pilotInfoFromQR: PilotInfo = {
          id: qrData.id,
          nombre: qrData.nombre,
          apellido: qrData.apellido,
          dni: qrData.dni,
          email: qrData.email || 'No disponible',
          telefono: qrData.telefono || 'No disponible',
          categoria: qrData.categoria,
          categoria_auto: qrData.categoria === 'auto' ? qrData.categoria_detalle || undefined : undefined,
          categoria_moto: qrData.categoria === 'moto' ? qrData.categoria_detalle || undefined : undefined,
          numero: qrData.numero || undefined,
          estado: 'pendiente', // Estado por defecto, se actualizará si se obtiene de la API
          comprobante_pago_url: undefined
        };
        console.log('✅ Información del piloto desde QR:', pilotInfoFromQR);
        setPilotInfo(pilotInfoFromQR);
      } else {
        console.warn('⚠️ QR no tiene información completa:', qrData);
        setError('El QR no contiene toda la información necesaria. Intentando buscar por ID...');
      }
      
      // Intentar obtener información completa del piloto desde la API (para estado actual y comprobante)
      if (qrData.id) {
        await fetchPilotInfo(qrData.id);
      } else {
        setError('El QR no contiene un ID válido del piloto.');
      }
    } catch (err: any) {
      console.error('❌ Error procesando QR:', err);
      console.error('❌ Texto del QR:', decodedText);
      setError(`Error al procesar el QR: ${err.message || 'Error desconocido'}. Texto escaneado: ${decodedText.substring(0, 100)}`);
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

