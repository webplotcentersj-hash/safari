import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import './AdminScan.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API_BASE;

interface PilotData {
  id?: string;
  dni?: string;
  nombre?: string;
  apellido?: string;
  categoria?: string;
  numero?: number | null;
  categoria_detalle?: string | null;
  email?: string;
  telefono?: string;
  url?: string;
  // Formato corto (QR reducido para escanear mejor)
  n?: string;
  a?: string;
  d?: string;
  c?: string;
  cd?: string;
  e?: string;
  t?: string;
  num?: number | null;
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
  categoria_moto_china?: string;
  categoria_cuatri?: string;
  numero?: number;
  estado: string;
  comprobante_pago_url?: string;
}

export default function AdminScan() {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<PilotData | null>(null);
  const [pilotInfo, setPilotInfo] = useState<PilotInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authCheck, setAuthCheck] = useState<{ ok: boolean; status?: number } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handleScanSuccessRef = useRef<(text: string) => void>(() => {});
  const qrCodeRegionId = 'qr-reader';

  useEffect(() => {
    handleScanSuccessRef.current = handleScanSuccess;
  });

  useEffect(() => {
    if (!isAuthenticated) {
      const timer = setTimeout(() => navigate('/admin/login'), 2000);
      return () => clearTimeout(timer);
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isAuthenticated, navigate]);

  // Verificar que la API reconozca la sesión (diagnóstico)
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const headers: Record<string, string> = { Accept: 'application/json', Authorization: `Bearer ${token}` };
    axios.get('/admin/me', { headers, timeout: 8000 })
      .then((r) => setAuthCheck({ ok: r.data?.ok === true, status: r.status }))
      .catch((err) => setAuthCheck({ ok: false, status: err.response?.status }));
  }, [isAuthenticated, token]);

  // Iniciar cámara solo cuando el contenedor ya está visible (display: block)
  useEffect(() => {
    if (!scanning || !isAuthenticated) return;

    let mounted = true;
    const onDecode = (decodedText: string) => {
      handleScanSuccessRef.current(decodedText);
    };
    const noop = () => {};

    const startCamera = async () => {
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 100));
      if (!mounted) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Tu navegador no soporta acceso a la cámara. Usa Chrome o Safari.');
        setScanning(false);
        return;
      }

      try {
        const scanner = new Html5Qrcode(qrCodeRegionId);
        scannerRef.current = scanner;

        let cameraId: string | null = null;
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras?.length > 0) {
            const back = cameras.find(c => /back|rear|environment/i.test(c.label));
            cameraId = back ? back.id : cameras[0].id;
          }
        } catch (_) {}

        const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
        try {
          if (cameraId) {
            await scanner.start(cameraId, config, onDecode, noop);
          } else {
            await scanner.start({ facingMode: 'environment' }, config, onDecode, noop);
          }
        } catch (e1: any) {
          if (!mounted) return;
          try {
            await scanner.start({ facingMode: 'user' }, config, onDecode, noop);
          } catch (e2: any) {
            throw e2;
          }
        }
      } catch (err: any) {
        if (!mounted) return;
        const name = err?.name || '';
        const msg = err?.message || '';
        if (/NotAllowed|Permission/i.test(name) || /permission/i.test(msg)) {
          setError('Se necesitan permisos de cámara. Permití el acceso y recargá.');
        } else if (/NotFound|not found/i.test(name + msg)) {
          setError('No se encontró ninguna cámara.');
        } else if (/NotReadable|in use/i.test(msg)) {
          setError('La cámara está en uso por otra aplicación.');
        } else {
          setError(`Error: ${msg || name || 'desconocido'}. Recargá e intentá de nuevo.`);
        }
        setScanning(false);
      }
    };

    startCamera();
    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        try {
          scannerRef.current.clear();
        } catch (_) {}
        scannerRef.current = null;
      }
    };
  }, [scanning, isAuthenticated]);

  const startScanning = () => {
    setError(null);
    setScannedData(null);
    setPilotInfo(null);
    setSuccess(null);
    setScanning(true);
  };

  const fetchPilotById = async (pilotId: string): Promise<{ pilot: PilotInfo | null; status?: number; message?: string }> => {
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const base = typeof window !== 'undefined' ? window.location.origin + '/api' : (API_BASE || '/api');
      const url = `${base}/admin/pilots/${encodeURIComponent(pilotId)}`;
      if (typeof window !== 'undefined') console.log('GET piloto:', url);
      const res = await axios.get(url, {
        headers,
        timeout: 15000
      });
      const data = res.data;
      if (typeof data === 'string' && data.trim().startsWith('<')) return { pilot: null };
      const d = typeof data === 'string' ? (() => { try { return JSON.parse(data); } catch { return null; } })() : data;
      if (!d || typeof d !== 'object') return { pilot: null };
      return {
        pilot: {
          id: d.id || pilotId,
          nombre: d.nombre || '',
          apellido: d.apellido || '',
          dni: d.dni || '',
          email: d.email || '',
          telefono: d.telefono || '',
          categoria: d.categoria || '',
          categoria_auto: d.categoria_auto,
          categoria_moto: d.categoria_moto,
          categoria_moto_china: d.categoria_moto_china,
          categoria_cuatri: d.categoria_cuatri,
          numero: d.numero,
          estado: d.estado || 'pendiente',
          comprobante_pago_url: d.comprobante_pago_url
        }
      };
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message;
      console.error('fetchPilotById error:', status, err?.response?.data, msg);
      return { pilot: null, status, message: typeof msg === 'string' ? msg : undefined };
    }
  };

  const loadPilotById = async (pilotId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setPilotInfo(null);
    setScannedData(null);
    const maxRetries = 3;
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    let lastErr: { status?: number; message?: string } = {};
    for (let i = 0; i < maxRetries; i++) {
      const { pilot, status, message } = await fetchPilotById(pilotId);
      if (pilot) {
        setPilotInfo(pilot);
        setError(null);
        setLoading(false);
        return;
      }
      if (status !== undefined) lastErr = { status, message };
      if (i < maxRetries - 1) await delay(1000);
    }
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
    let errMsg = 'No se pudieron cargar los datos desde el servidor. Probá "Reintentar" o cerrando sesión y entrando de nuevo.';
    if (lastErr.status === 403) errMsg = 'Sesión expirada. Cerrando sesión y volvé a entrar, o tocá "Reintentar".';
    else if (lastErr.status === 404) errMsg = 'Piloto no encontrado en la base de datos.';
    else if (lastErr.message) errMsg = lastErr.message;
    setError(errMsg);
    setLoading(false);
  };

  const retryLoadPilot = async () => {
    if (!pilotInfo?.id) return;
    setError(null);
    await loadPilotById(pilotInfo.id);
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
      const raw = typeof decodedText === 'string' ? decodedText.trim() : String(decodedText || '');
      console.log('📱 QR escaneado (texto completo):', raw);
      console.log('📱 Longitud:', raw.length);
      
      // Detener el escáner primero
      await stopScanning();
      
      // Si el QR es una URL de aprobación, extraer ID y cargar piloto (QRs antiguos solo tienen URL)
      if (raw.includes('/admin/approve/')) {
        let pilotId = raw.split('/admin/approve/')[1]?.split('?')[0]?.split('#')[0]?.trim() || '';
        pilotId = pilotId.replace(/\/+$/, ''); // quitar barras finales
        if (pilotId) {
          await loadPilotById(pilotId);
          return;
        }
      }

      // Si el QR es solo un UUID (sin URL), cargar piloto por ID
      const uuidMatch = raw.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      if (uuidMatch) {
        await loadPilotById(raw);
        return;
      }
      
      let qrData: PilotData | null = null;
      
      // Intentar parsear como JSON (QRs nuevos traen JSON con nombre, DNI, etc.)
      try {
        qrData = JSON.parse(raw);
        console.log('✅ QR parseado como JSON:', qrData);
        
        if (!qrData || typeof qrData !== 'object') {
          qrData = null;
        } else {
        // Normalizar campos del QR (formato largo nombre/apellido o corto n/a para menos bytes)
        const nom = qrData.nombre ?? qrData.n ?? '';
        const ape = qrData.apellido ?? qrData.a ?? '';
        const dniVal = qrData.dni ?? qrData.d ?? '';
        const cat = qrData.categoria ?? qrData.c ?? '';
        const catDet = qrData.categoria_detalle ?? qrData.cd ?? null;
        const em = qrData.email ?? qrData.e ?? '';
        const tel = qrData.telefono ?? qrData.t ?? '';
        const numVal = qrData.numero ?? qrData.num ?? undefined;
        const pilotIdFromQr = qrData.id ?? '';

        // Si el JSON tiene URL de aprobación o id, cargar piloto aquí (sin navegar)
        if (qrData.url?.includes('/admin/approve/') || pilotIdFromQr) {
          const pilotId = pilotIdFromQr || qrData.url?.split('/admin/approve/')[1]?.split('?')[0]?.split('#')[0]?.trim();
          if (pilotId) {
            const pilotInfoFromQR: PilotInfo = {
              id: pilotId,
              nombre: nom,
              apellido: ape,
              dni: dniVal,
              email: em,
              telefono: tel,
              categoria: cat,
              categoria_auto: cat === 'auto' ? (catDet || undefined) : undefined,
              categoria_moto: cat === 'moto' ? (catDet || undefined) : undefined,
              categoria_moto_china: undefined,
              categoria_cuatri: cat === 'cuatri' ? (catDet || undefined) : undefined,
              numero: numVal ?? undefined,
              estado: 'pendiente',
              comprobante_pago_url: undefined
            };
            setPilotInfo(pilotInfoFromQR);
            setScannedData(qrData);
            setError(null);
            setLoading(true);
            try {
              const { pilot } = await fetchPilotById(pilotId);
              if (pilot) setPilotInfo(pilot);
            } catch (_) {
              setError('No se pudo conectar al servidor. Revisá los datos y tocá "Aprobar" o "Rechazar" si corresponde.');
            }
            setLoading(false);
            return;
          }
          setScannedData(qrData);
          setPilotInfo({
            id: '',
            nombre: nom,
            apellido: ape,
            dni: dniVal,
            email: em,
            telefono: tel,
            categoria: cat,
            categoria_auto: cat === 'auto' ? (catDet || undefined) : undefined,
            categoria_moto: cat === 'moto' ? (catDet || undefined) : undefined,
            categoria_moto_china: undefined,
            categoria_cuatri: cat === 'cuatri' ? (catDet || undefined) : undefined,
            numero: numVal ?? undefined,
            estado: 'pendiente',
            comprobante_pago_url: undefined
          });
          setError('El QR no contiene un ID válido del piloto.');
          return;
        }
        } // cierra else (qrData es object)
      } catch (parseError) {
        // Si no es JSON, intentar extraer ID (QR truncado o mal formado) o número
        console.log('⚠️ No es JSON válido, intentando otros formatos...');
        
        // Intentar extraer UUID del texto (QR truncado con "id":"uuid" o URL /admin/approve/uuid)
        const idFromJson = raw.match(/"id"\s*:\s*"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/i);
        const idFromUrl = raw.match(/\/admin\/approve\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        const extractedId = idFromJson?.[1] || idFromUrl?.[1];
        if (extractedId) {
          console.log('📌 ID extraído del QR (truncado):', extractedId);
          await loadPilotById(extractedId);
          return;
        }
        
        // Si es solo un número, buscar piloto por número
        const numeroMatch = raw.match(/^\d+$/);
        if (numeroMatch) {
          const numero = parseInt(raw, 10);
          console.log('🔢 QR contiene solo número:', numero);
          setLoading(true);
          setError(`Buscando piloto con número ${numero}...`);
          
          // Buscar piloto por número en la API (devuelve objeto único cuando hay ?numero=)
          try {
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const base = typeof window !== 'undefined' ? window.location.origin + '/api' : (API_BASE || '/api');
            const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
            const response = await axios.get(`${base}/admin/pilots?numero=${numero}`, { headers, timeout: 15000 });
            const data = response.data;
            const pilot = Array.isArray(data) ? data[0] : data;
            if (pilot && typeof pilot === 'object' && pilot.id) {
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
                categoria_moto_china: pilot.categoria_moto_china,
                categoria_cuatri: pilot.categoria_cuatri,
                numero: pilot.numero,
                estado: pilot.estado || 'pendiente',
                comprobante_pago_url: pilot.comprobante_pago_url
              });
              setError(null);
              setLoading(false);
              return;
            }
            setError(`No se encontró ningún piloto con el número ${numero}.`);
            setLoading(false);
            return;
          } catch (searchError: any) {
            console.error('Error buscando por número:', searchError);
            const status = searchError?.response?.status;
            setError(status === 403 ? 'Sesión expirada.' : `Error al buscar piloto con número ${numero}.`);
            setLoading(false);
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
    } catch (err: any) {
      console.error('❌ Error procesando QR:', err);
      setError(`Error al procesar el QR: ${err.message || 'Error desconocido'}.`);
    }
  };

  /** Aprueba por ID (llamado al hacer clic en "Aprobar Piloto"). */
  const approvePilotById = async (id: string): Promise<boolean> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const base = typeof window !== 'undefined' ? window.location.origin + '/api' : (API_BASE || '/api');
      const url = `${base}/admin/pilots/${encodeURIComponent(id)}/status`;
      await axios.patch(url, { estado: 'aprobado' }, { headers, timeout: 15000 });
      setSuccess('Piloto aprobado');
      setPilotInfo((prev) => (prev?.id === id ? { ...prev, estado: 'aprobado' } : prev));
      setError(null);
      setTimeout(() => {
        setScannedData(null);
        setPilotInfo(null);
        setSuccess(null);
      }, 2000);
      return true;
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      let msg = 'Error al aprobar el piloto.';
      if (status === 403) msg = 'Sesión expirada. Volvé a iniciar sesión.';
      else if (status === 404) msg = 'Piloto no encontrado.';
      else if (data?.error) msg = typeof data.error === 'string' ? data.error : msg;
      setError(msg);
      return false;
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const base = typeof window !== 'undefined' ? window.location.origin + '/api' : (API_BASE || '/api');
      const url = `${base}/admin/pilots/${pilotInfo.id}/status`;
      await axios.patch(url, { estado: status }, {
        headers,
        timeout: 15000
      });
      setSuccess(`Piloto ${status === 'aprobado' ? 'aprobado' : 'rechazado'} exitosamente`);
      
      setPilotInfo({ ...pilotInfo, estado: status });
      
      setTimeout(() => {
        setScannedData(null);
        setPilotInfo(null);
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      const status = err.response?.status;
      const data = err.response?.data;
      let msg = 'Error al actualizar el estado del piloto.';
      if (status === 403) msg = 'Sesión expirada. Volvé a iniciar sesión y probá de nuevo.';
      else if (status === 404) msg = 'Piloto no encontrado.';
      else if (data && typeof data === 'object' && data.error) msg = typeof data.error === 'string' ? data.error : msg;
      setError(msg);
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
          <p>Escaneá el QR para ver los datos del piloto. Luego aprobá o rechazá la inscripción manualmente.</p>
        </div>

        {authCheck && !authCheck.ok && (
          <div className="scan-alert scan-alert-error">
            <p>La API no reconoce tu sesión (código {authCheck.status ?? '?'}). Probá cerrar sesión y volver a entrar.</p>
            <button onClick={() => setAuthCheck(null)} className="alert-close">×</button>
          </div>
        )}

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

        {/* El div qr-reader debe existir en el DOM antes de iniciar el escáner */}
        <div className="scan-viewer" style={{ display: scanning ? 'block' : 'none' }}>
          <div id={qrCodeRegionId} className="qr-scanner"></div>
          {scanning && (
            <button onClick={stopScanning} className="btn btn-secondary btn-stop">
              ⏹ Detener Escáner
            </button>
          )}
        </div>

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
                  {pilotInfo.categoria === 'moto' && (pilotInfo.categoria_moto || pilotInfo.categoria_moto_china) && ` - ${pilotInfo.categoria_moto || pilotInfo.categoria_moto_china}`}
                  {pilotInfo.categoria === 'cuatri' && pilotInfo.categoria_cuatri && ` - ${pilotInfo.categoria_cuatri}`}
                </span>
              </div>
              {pilotInfo.numero && (
                <div className="detail-row">
                  <span className="detail-label">Número de Competencia:</span>
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

            {!pilotInfo.id && (
              <div className="scan-alert scan-alert-error" style={{ marginTop: '1rem' }}>
                <p>Este QR no tiene ID de piloto. No se puede aprobar ni rechazar desde aquí.</p>
              </div>
            )}
            {error && pilotInfo.id && (
              <div className="pilot-actions" style={{ marginTop: '0.5rem' }}>
                <button type="button" onClick={retryLoadPilot} className="btn btn-secondary btn-small" disabled={loading}>
                  🔄 Reintentar cargar datos
                </button>
              </div>
            )}
            <div className="pilot-actions-main">
              {pilotInfo.id && pilotInfo.estado !== 'aprobado' && (
                <button
                  onClick={() => updatePilotStatus('aprobado')}
                  className="btn btn-success btn-large"
                  disabled={loading}
                >
                  ✓ Aprobar Piloto
                </button>
              )}
              {pilotInfo.id && pilotInfo.estado !== 'rechazado' && (
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

