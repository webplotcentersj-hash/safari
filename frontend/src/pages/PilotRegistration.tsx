import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { supabase } from '../config/supabase';

// Configurar base URL para producción
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API_BASE_URL;

// Logo del formulario de inscripción (solo este formulario)
const REGISTRATION_LOGO_URL = 'https://plotcenter.com.ar/wp-content/uploads/2026/02/ASER-logos-01-scaled.png';
import { Link, useLocation } from 'react-router-dom';
import './PilotRegistration.css';
import NumberSelector from '../components/NumberSelector';

// Función para generar imagen completa con QR y datos del piloto
async function generatePilotCardImage(
  qrDataUrl: string,
  nombre: string,
  apellido: string,
  numero: number | null,
  categoria: string,
  categoriaDetalle: string | null
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('No se pudo obtener contexto del canvas'));
      return;
    }

    // Dimensiones del canvas (más alto para evitar superposiciones)
    canvas.width = 1200;
    canvas.height = 2000;

    // Cargar logo
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.onload = () => {
      // Fondo con gradiente
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#1a472a');
      gradient.addColorStop(0.5, '#2d5a3d');
      gradient.addColorStop(1, '#1a472a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Variables de posición (espaciado mejorado)
      let currentY = 50;
      const padding = 40;
      const spacing = 50;

      // Logo en la parte superior
      const logoSize = 180;
      const logoX = (canvas.width - logoSize) / 2;
      const logoY = currentY;
      const logoHeight = logoSize * (logo.height / logo.width);
      ctx.drawImage(logo, logoX, logoY, logoSize, logoHeight);
      currentY += logoHeight + spacing;

      // Título
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('SAFARI TRAS LAS SIERRAS', canvas.width / 2, currentY);
      currentY += 60;
      
      ctx.font = '28px Arial';
      ctx.fillText('Valle Fértil - San Juan', canvas.width / 2, currentY);
      currentY += spacing + 30;

      // Sección del número (diseño tipo casco) - solo si hay número
      if (numero) {
        const numberX = canvas.width / 2;
        const numberY = currentY + 150; // Espacio para el casco
        
        // Sombra del casco
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(numberX + 5, numberY + 5, 140, 0, Math.PI * 2);
        ctx.fill();
        
        // Fondo circular tipo casco con gradiente
        const helmetGradient = ctx.createRadialGradient(numberX, numberY, 0, numberX, numberY, 140);
        helmetGradient.addColorStop(0, '#65b330');
        helmetGradient.addColorStop(0.7, '#5aa02a');
        helmetGradient.addColorStop(1, '#4a8a1f');
        ctx.fillStyle = helmetGradient;
        ctx.beginPath();
        ctx.arc(numberX, numberY, 140, 0, Math.PI * 2);
        ctx.fill();
        
        // Borde exterior del casco
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 12;
        ctx.stroke();
        
        // Borde interior
        ctx.strokeStyle = '#4a8a1f';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(numberX, numberY, 125, 0, Math.PI * 2);
        ctx.stroke();
        
        // Mini logo del Safari en la parte superior del casco
        const miniLogoSize = 50;
        const miniLogoX = numberX - miniLogoSize / 2;
        const miniLogoY = numberY - 90;
        ctx.drawImage(logo, miniLogoX, miniLogoY, miniLogoSize, miniLogoSize * (logo.height / logo.width));
        
        // Número en el centro (grande y destacado)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 150px Arial';
        
        // Sombra del número
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillText(numero.toString().padStart(2, '0'), numberX + 4, numberY + 4);
        
        // Número principal
        ctx.fillStyle = '#ffffff';
        ctx.fillText(numero.toString().padStart(2, '0'), numberX, numberY);
        
        // Texto "NÚMERO DE COMPETENCIA"
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Arial';
        ctx.textBaseline = 'top';
        ctx.fillText('NÚMERO DE COMPETENCIA', numberX, numberY + 160);
        
        currentY = numberY + 300; // Actualizar posición después del casco
      } else {
        currentY += 50;
      }

      // Línea separadora
      ctx.strokeStyle = '#65b330';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(padding, currentY);
      ctx.lineTo(canvas.width - padding, currentY);
      ctx.stroke();
      currentY += spacing + 20;

      // Información del piloto
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      // Nombre
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Arial';
      const fullName = `${nombre} ${apellido}`;
      // Dividir nombre si es muy largo
      if (fullName.length > 25) {
        const words = fullName.split(' ');
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(' ');
        const line2 = words.slice(mid).join(' ');
        ctx.fillText(line1, canvas.width / 2, currentY);
        currentY += 50;
        ctx.fillText(line2, canvas.width / 2, currentY);
      } else {
        ctx.fillText(fullName, canvas.width / 2, currentY);
      }
      currentY += 60;
      
      // Categoría
      const categoriaTexto = categoria === 'auto' ? 'AUTO' : categoria === 'moto' ? 'MOTO' : 'CUATRI';
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = '#65b330';
      ctx.fillText(categoriaTexto, canvas.width / 2, currentY);
      currentY += 50;
      
      // Subcategoría
      if (categoriaDetalle) {
        ctx.font = '32px Arial';
        ctx.fillStyle = '#ffffff';
        const subcat = categoriaDetalle.toUpperCase();
        // Dividir si es muy largo
        if (subcat.length > 30) {
          const words = subcat.split(' ');
          const mid = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(' ');
          const line2 = words.slice(mid).join(' ');
          ctx.fillText(line1, canvas.width / 2, currentY);
          currentY += 45;
          ctx.fillText(line2, canvas.width / 2, currentY);
        } else {
          ctx.fillText(subcat, canvas.width / 2, currentY);
        }
        currentY += 60;
      }

      // Línea separadora antes del QR
      ctx.strokeStyle = '#65b330';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(padding, currentY);
      ctx.lineTo(canvas.width - padding, currentY);
      ctx.stroke();
      currentY += spacing + 20;

      // Cargar y dibujar QR
      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous';
      qrImage.onload = () => {
        const qrSize = 450;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = currentY;
        
        // Fondo blanco para el QR
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX - 25, qrY - 25, qrSize + 50, qrSize + 50);
        
        // Borde del QR
        ctx.strokeStyle = '#65b330';
        ctx.lineWidth = 5;
        ctx.strokeRect(qrX - 25, qrY - 25, qrSize + 50, qrSize + 50);
        
        // QR
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
        
        currentY = qrY + qrSize + 50;
        
        // Texto debajo del QR
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Presenta este código en la acreditación', canvas.width / 2, currentY);
        currentY += 40;
        
        // Footer
        ctx.font = '20px Arial';
        ctx.fillStyle = '#cccccc';
        ctx.fillText('Este documento es personal e intransferible', canvas.width / 2, canvas.height - 50);
        
        // Convertir a data URL
        resolve(canvas.toDataURL('image/png', 1.0));
      };
      
      qrImage.onerror = () => reject(new Error('Error cargando QR'));
      qrImage.src = qrDataUrl;
    };
    
    logo.onerror = () => reject(new Error('Error cargando logo'));
    logo.src = '/logo.png';
  });
}

interface PilotFormData {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
  licencia: string;
  vehiculo_marca: string;
  vehiculo_modelo: string;
  vehiculo_patente: string;
  copiloto_nombre: string;
  copiloto_dni: string;
  categoria: string;
  categoria_auto?: string;
  categoria_moto?: string;
  categoria_moto_china?: string;
  categoria_cuatri?: string;
  tipo_campeonato?: string;
  categoria_enduro?: string;
  categoria_travesia_moto?: string;
  numero?: number;
  edad?: number;
  nacionalidad?: string;
  provincia?: string;
  departamento?: string;
  domicilio?: string;
  telefono_acompanante?: string;
  tiene_licencia?: boolean | string;
  comprobante_pago_url?: string;
}

export default function PilotRegistration() {
  const location = useLocation();
  const tipo = location.pathname === '/inscripcion/auto' ? 'auto' : location.pathname === '/inscripcion/moto' ? 'moto' : undefined;

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<PilotFormData>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [usedNumbers, setUsedNumbers] = useState<number[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [tipoMoto, setTipoMoto] = useState<'estandar' | 'china' | null>(null);
  /** Bajo "Moto": Campeonato Sanjuanino de Enduro o Travesías/Safari */
  const [tipoCampeonato, setTipoCampeonato] = useState<'enduro' | 'travesias' | null>(null);
  /** Solo cuando tipoCampeonato === 'travesias': Motos o Cuatriciclos */
  const [travesiasSub, setTravesiasSub] = useState<'moto' | 'cuatri' | null>(null);
  const [subTipoMoto, setSubTipoMoto] = useState<'moto' | 'cuatri' | null>(null);
  const categoryRequestedRef = useRef<string | null>(null);

  const watchDni = watch('dni');
  const watchCategoria = watch('categoria');

  // Formulario por ruta: /inscripcion/auto o /inscripcion/moto fijan la categoría
  useEffect(() => {
    if (tipo === 'auto') setValue('categoria', 'auto');
    if (tipo === 'moto') setValue('categoria', 'moto');
  }, [tipo, setValue]);

  /** Categoría efectiva para API: auto; moto (enduro o travesías moto) o cuatri (travesías cuatri). */
  const effectiveCategoria =
    tipo === 'auto'
      ? 'auto'
      : tipo === 'moto'
        ? (tipoCampeonato === 'travesias' && travesiasSub === 'cuatri'
            ? 'cuatri'
            : tipoCampeonato === 'enduro' || (tipoCampeonato === 'travesias' && travesiasSub === 'moto')
              ? 'moto'
              : subTipoMoto === 'cuatri'
                ? 'cuatri'
                : subTipoMoto === 'moto'
                  ? 'moto'
                  : '')
        : watchCategoria === 'auto'
          ? 'auto'
          : watchCategoria === 'moto' && (subTipoMoto === 'cuatri' || (tipoCampeonato === 'travesias' && travesiasSub === 'cuatri'))
            ? 'cuatri'
            : watchCategoria === 'moto' && (subTipoMoto === 'moto' || tipoCampeonato === 'enduro' || (tipoCampeonato === 'travesias' && travesiasSub === 'moto'))
              ? 'moto'
              : watchCategoria === 'moto'
                ? ''
                : watchCategoria;

  // Autos y motos usan números distintos: la API devuelve solo los usados para la categoría indicada.
  const loadUsedNumbers = async (categoria: 'auto' | 'moto' | 'cuatri') => {
    categoryRequestedRef.current = categoria;
    setLoadingNumbers(true);
    setUsedNumbers([]);
    setSelectedNumber(null);
    setValue('numero', undefined);
    try {
      const base = typeof window !== 'undefined' ? `${window.location.origin}/api` : (axios.defaults.baseURL || '/api');
      const response = await axios.get(`${base}/pilots/used-numbers?categoria=${categoria}`, { timeout: 10000 });
      if (categoryRequestedRef.current !== categoria) return;
      let data = response.data;
      if (typeof data === 'string') {
        if (data.trim().startsWith('<')) {
          setUsedNumbers([]);
          return;
        }
        try {
          data = JSON.parse(data);
        } catch {
          setUsedNumbers([]);
          return;
        }
      }
      const raw = Array.isArray(data) ? data : (data?.numbers ? data.numbers : []);
      const used: number[] = raw
        .map((n: any) => {
          const num = typeof n === 'string' ? parseInt(n, 10) : Number(n);
          return !isNaN(num) && num >= 1 && num <= 250 ? num : null;
        })
        .filter((n: number | null): n is number => n !== null);
      if (categoryRequestedRef.current !== categoria) return;
      setUsedNumbers([...new Set(used)].sort((a, b) => a - b));
    } catch (_) {
      if (categoryRequestedRef.current === categoria) setUsedNumbers([]);
    } finally {
      if (categoryRequestedRef.current === categoria) setLoadingNumbers(false);
    }
  };

  useEffect(() => {
    if (effectiveCategoria === 'auto' || effectiveCategoria === 'moto' || effectiveCategoria === 'cuatri') {
      loadUsedNumbers(effectiveCategoria as 'auto' | 'moto' | 'cuatri');
    } else {
      categoryRequestedRef.current = null;
      setSelectedNumber(null);
      setValue('numero', undefined);
      setUsedNumbers([]);
    }
  }, [effectiveCategoria, setValue]);

  const handleNumberSelect = (num: number) => {
    setSelectedNumber(num);
    setValue('numero', num, { shouldValidate: true });
  };

  // Mantener el número seleccionado en el formulario (evita que se pierda al enviar)
  useEffect(() => {
    if ((effectiveCategoria === 'auto' || effectiveCategoria === 'moto' || effectiveCategoria === 'cuatri') && selectedNumber != null) {
      setValue('numero', selectedNumber, { shouldValidate: false });
    }
  }, [effectiveCategoria, selectedNumber, setValue]);

  // Al cambiar de Moto a otro tipo, resetear estado de moto
  useEffect(() => {
    if (watchCategoria !== 'moto') {
      setTipoMoto(null);
      setSubTipoMoto(null);
      setTipoCampeonato(null);
      setTravesiasSub(null);
      setValue('categoria_moto_china', undefined);
      setValue('categoria_cuatri', undefined);
      setValue('tipo_campeonato', undefined);
      setValue('categoria_enduro', undefined);
      setValue('categoria_travesia_moto', undefined);
    }
  }, [watchCategoria, setValue]);

  const onSubmit = async (data: PilotFormData) => {
    setLoading(true);
    setMessage(null);

    try {
      if (!paymentFile) {
        setMessage({
          type: 'error',
          text: 'Debes adjuntar el comprobante de pago para completar la inscripción.'
        });
        setLoading(false);
        return;
      }


      if (!supabase) {
        setMessage({
          type: 'error',
          text: 'Error de configuración. Falta Supabase en el frontend.'
        });
        setLoading(false);
        return;
      }

      // Subir comprobante de pago a Supabase Storage
      const ext = paymentFile.name.split('.').pop() || 'jpg';
      const fileNameSafeDni = (data.dni || 'sin-dni').replace(/[^0-9A-Za-z_-]/g, '');
      const filePath = `comprobantes/${fileNameSafeDni}-${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('comprobantes')
        .upload(filePath, paymentFile);

      if (uploadError || !uploadData) {
        console.error('Error subiendo comprobante de pago:', uploadError);
        setMessage({
          type: 'error',
          text: 'No se pudo subir el comprobante de pago. Verificá el archivo e intenta nuevamente.'
        });
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase
        .storage
        .from('comprobantes')
        .getPublicUrl(uploadData.path);

      const comprobanteUrl = publicUrlData?.publicUrl;

      // Validar que la categoría esté presente (Auto o Moto; Moto puede ser moto o cuatriciclo)
      if (!data.categoria) {
        setMessage({
          type: 'error',
          text: 'Debes seleccionar el tipo de vehículo (Auto o Moto).'
        });
        setLoading(false);
        return;
      }
      if (data.categoria === 'moto' && !tipoCampeonato) {
        setMessage({
          type: 'error',
          text: 'Debes elegir campeonato (Enduro o Travesías/Safari).'
        });
        setLoading(false);
        return;
      }
      if (data.categoria === 'moto' && tipoCampeonato === 'travesias' && !travesiasSub) {
        setMessage({
          type: 'error',
          text: 'Debes elegir Motos o Cuatriciclos.'
        });
        setLoading(false);
        return;
      }

      // Validar campos requeridos para autos
      if (effectiveCategoria === 'auto') {
        if (!data.numero) {
          setMessage({
            type: 'error',
            text: 'Debes seleccionar tu número de competencia (01-250).'
          });
          setLoading(false);
          return;
        }
        if (!data.categoria_auto) {
          setMessage({
            type: 'error',
            text: 'Debes seleccionar una categoría de auto.'
          });
          setLoading(false);
          return;
        }
      }

      // Validar motos: según tipo_campeonato
      if (effectiveCategoria === 'moto') {
        if (tipoCampeonato === 'enduro' && !data.categoria_enduro) {
          setMessage({ type: 'error', text: 'Debes seleccionar una categoría del Campeonato Sanjuanino de Enduro.' });
          setLoading(false);
          return;
        }
        if (tipoCampeonato === 'travesias' && travesiasSub === 'moto' && !data.categoria_travesia_moto) {
          setMessage({ type: 'error', text: 'Debes seleccionar una categoría de moto (Travesías/Safari).' });
          setLoading(false);
          return;
        }
      }

      // Validar campos requeridos para cuatriciclos (también cuando eligió Moto y luego Cuatriciclo)
      if (effectiveCategoria === 'cuatri') {
        if (!data.categoria_cuatri) {
          setMessage({
            type: 'error',
            text: 'Debes seleccionar una categoría de cuatriciclo.'
          });
          setLoading(false);
          return;
        }
      }

      // Número de competencia: solo autos lo eligen; motos y cuatriciclos lo reciben después.
      const numeroToSend = effectiveCategoria === 'auto'
        ? (typeof data.numero === 'number' && data.numero >= 1 && data.numero <= 250
            ? data.numero
            : selectedNumber != null && selectedNumber >= 1 && selectedNumber <= 250
              ? selectedNumber
              : null)
        : null;

      if (effectiveCategoria === 'auto' && (numeroToSend == null || numeroToSend < 1 || numeroToSend > 250)) {
        setMessage({
          type: 'error',
          text: 'Debes seleccionar tu número de competencia (01-250).'
        });
        setLoading(false);
        return;
      }

      // Usamos la baseURL configurada (/api). Enviamos categoría efectiva y nuevos campos.
      const response = await axios.post('/pilots', {
        ...data,
        categoria: effectiveCategoria,
        numero: numeroToSend,
        categoria_auto: effectiveCategoria === 'auto' ? data.categoria_auto : null,
        categoria_moto: tipoCampeonato === 'enduro' ? (data.categoria_enduro || null) : null,
        categoria_moto_china: null,
        categoria_cuatri: effectiveCategoria === 'cuatri' ? data.categoria_cuatri : null,
        tipo_campeonato: tipoCampeonato || data.tipo_campeonato || null,
        categoria_enduro: tipoCampeonato === 'enduro' ? (data.categoria_enduro || null) : null,
        categoria_travesia_moto: tipoCampeonato === 'travesias' && travesiasSub === 'moto' ? (data.categoria_travesia_moto || null) : null,
        edad: data.edad != null && (typeof data.edad !== 'number' || !Number.isNaN(data.edad)) ? (typeof data.edad === 'number' ? data.edad : parseInt(String(data.edad), 10)) : null,
        nacionalidad: data.nacionalidad || null,
        provincia: data.provincia || null,
        departamento: data.departamento || null,
        domicilio: data.domicilio || null,
        telefono_acompanante: data.telefono_acompanante || null,
        tiene_licencia: data.tiene_licencia === 'si' || data.tiene_licencia === true,
        comprobante_pago_url: comprobanteUrl
      });
      const qrFromApi = response.data?.qrDataUrl as string | undefined;

      // Actualizar la lista de números usados después de una inscripción exitosa (solo autos eligen número)
      if (effectiveCategoria === 'auto' && numeroToSend != null) {
        setUsedNumbers(prev => [...prev, numeroToSend].sort((a, b) => a - b));
      }

      if (qrFromApi) {
        setQrDataUrl(qrFromApi);
        setMessage({
          type: 'success',
          text: '¡Inscripción realizada exitosamente! Podés descargar tu QR desde aquí.'
        });
      } else {
        setMessage({
          type: 'success',
          text: '¡Inscripción realizada exitosamente! Te contactaremos pronto.'
        });
      }
    } catch (error: any) {
      console.error('Error en inscripción:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error al procesar la inscripción. Por favor, intenta nuevamente.';
      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // Página de elección: /inscripcion (sin /auto ni /moto)
  if (!tipo) {
    return (
      <div className="registration-page">
        <div className="container">
          <Link to="/" className="back-link">← Volver al inicio</Link>
          <div className="registration-card">
            <div className="registration-header">
              <img src={REGISTRATION_LOGO_URL} alt="Safari Tras las Sierras" className="registration-logo" />
              <h1>Inscripción de Pilotos</h1>
              <p className="subtitle">Elegí el formulario según tu vehículo</p>
            </div>
            <div className="form-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <Link to="/inscripcion/auto" className="btn btn-primary" style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                🚗 Inscripción Autos
              </Link>
              <Link to="/inscripcion/moto" className="btn btn-primary" style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                🏍️ Inscripción Motos (y cuatriciclos)
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="registration-page">
      <div className="container">
        <Link to={tipo ? '/inscripcion' : '/'} className="back-link">← {tipo ? 'Elegir tipo de vehículo' : 'Volver al inicio'}</Link>
        
        <div className="registration-card">
          <div className="registration-header">
            <img src={REGISTRATION_LOGO_URL} alt="Safari Tras las Sierras" className="registration-logo" />
            <h1>Inscripción {tipo === 'auto' ? 'Autos' : 'Motos (y cuatriciclos)'}</h1>
            <p className="subtitle">Completa todos los campos para inscribirte en el Safari Tras las Sierras</p>
            <button
              type="button"
              onClick={() => setShowSecurityModal(true)}
              className="registration-security-link"
            >
              <span className="registration-security-icon">🛡️</span>
              Ver medidas de seguridad obligatorias
            </button>
          </div>

          {showSecurityModal && (
            <div className="registration-modal-overlay" onClick={() => setShowSecurityModal(false)}>
              <div className="registration-modal" onClick={(e) => e.stopPropagation()}>
                <div className="registration-modal-header">
                  <div className="registration-modal-title-wrap">
                    <span className="registration-modal-badge">Requisitos oficiales</span>
                    <h2>Medidas de seguridad · Safari 2026</h2>
                  </div>
                  <button type="button" className="registration-modal-close" onClick={() => setShowSecurityModal(false)} aria-label="Cerrar">×</button>
                </div>
                <div className="registration-modal-body">
                  <p className="registration-modal-intro">Estas son las medidas de seguridad para correr el <strong>Safari Tras las Sierras 2026</strong>.</p>
                  <div className="registration-modal-dates">
                    <span className="registration-modal-dates-label">📍 Valle Fértil</span>
                    <div className="registration-modal-dates-grid">
                      <span>🏍️ Motos: 6 al 8 de febrero</span>
                      <span>🚗 Autos: 13 al 15 de febrero</span>
                    </div>
                  </div>
                  <p className="registration-modal-source">El Gobierno de San Juan informa:</p>
                  <section className="registration-modal-section">
                    <h3><span className="registration-modal-section-icon">👥</span> Piloto y Copiloto</h3>
                    <ul>
                      <li>Cascos.</li>
                      <li>Buzo antiflama.</li>
                      <li>Butacas de competición.</li>
                      <li>Cinturón de 5 puntos.</li>
                    </ul>
                  </section>
                  <section className="registration-modal-section">
                    <h3><span className="registration-modal-section-icon">🚗</span> Auto</h3>
                    <p className="registration-modal-structure"><strong>Estructura para vuelco.</strong> Elementos mínimos: arco principal, arco delantero, barras longitudinales, barras de puertas (mínimo una por lado, generalmente en “X” o paralelas).</p>
                    <ul>
                      <li>Barreras en las ruedas de tracción.</li>
                      <li>Cubre batería.</li>
                      <li>Corta corriente interno y externo (VISIBLE).</li>
                      <li>Matafuego de 2 kg.</li>
                      <li>Red en los 2 laterales.</li>
                      <li>3 banderas de 30×30 cm: <span className="flag flag-amarilla">Amarilla</span> (peligro, reducir velocidad, no adelantar), <span className="flag flag-roja">Roja</span> (peligro extremo, detenerse), <span className="flag flag-blanca">Blanca</span> (vehículo lento).</li>
                    </ul>
                  </section>
                  <div className="registration-modal-warning">
                    <span className="registration-modal-warning-icon">⚠️</span>
                    <p>Todo aquel binomio que no cumpla estos requisitos no podrá ser de la partida en el Safari 2026.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tipo === 'moto' && tipoCampeonato && (
            <div className="registration-payment-box">
              <span className="registration-payment-icon">💳</span>
              <p className="registration-payment-text">Pagá acá la inscripción</p>
              <a
                href={tipoCampeonato === 'enduro' ? 'https://mpago.la/1zfu8A9' : 'https://mpago.la/16eEYR9'}
                target="_blank"
                rel="noopener noreferrer"
                className="registration-payment-link"
              >
                {tipoCampeonato === 'enduro' ? 'Mercado Pago · Inscripción Enduro' : 'Mercado Pago · Inscripción Travesías / Safari'}
              </a>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-section">
              <h2>Datos Personales</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    {...register('nombre', { required: 'El nombre es requerido' })}
                  />
                  {errors.nombre && <span className="error">{errors.nombre.message}</span>}
                </div>

                <div className="form-group">
                  <label>Apellido *</label>
                  <input
                    type="text"
                    {...register('apellido', { required: 'El apellido es requerido' })}
                  />
                  {errors.apellido && <span className="error">{errors.apellido.message}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>DNI *</label>
                  <input
                    type="text"
                    {...register('dni', { required: 'El DNI es requerido' })}
                  />
                  {errors.dni && <span className="error">{errors.dni.message}</span>}
                </div>

                <div className="form-group">
                  <label>Fecha de Nacimiento *</label>
                  <input
                    type="date"
                    {...register('fecha_nacimiento', { required: 'La fecha de nacimiento es requerida' })}
                  />
                  {errors.fecha_nacimiento && <span className="error">{errors.fecha_nacimiento.message}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    {...register('email', { 
                      required: 'El email es requerido',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Email inválido'
                      }
                    })}
                  />
                  {errors.email && <span className="error">{errors.email.message}</span>}
                </div>

                <div className="form-group">
                  <label>Teléfono *</label>
                  <input
                    type="tel"
                    {...register('telefono', { required: 'El teléfono es requerido' })}
                  />
                  {errors.telefono && <span className="error">{errors.telefono.message}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Edad</label>
                  <input type="number" min={1} max={120} {...register('edad', { valueAsNumber: true })} placeholder="Años" />
                </div>
                <div className="form-group">
                  <label>Nacionalidad</label>
                  <input type="text" {...register('nacionalidad')} placeholder="Ej. Argentina" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Provincia</label>
                  <input type="text" {...register('provincia')} placeholder="Ej. San Juan" />
                </div>
                <div className="form-group">
                  <label>Departamento</label>
                  <input type="text" {...register('departamento')} placeholder="Ej. Valle Fértil" />
                </div>
              </div>

              <div className="form-group">
                <label>Domicilio</label>
                <input type="text" {...register('domicilio')} placeholder="Calle, número, localidad" />
              </div>

              <div className="form-group">
                <label>Teléfono del acompañante</label>
                <input type="tel" {...register('telefono_acompanante')} placeholder="Opcional" />
              </div>

              <div className="form-group">
                <label>¿Tiene licencia? *</label>
                <div className="form-row-options" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="radio" value="si" {...register('tiene_licencia', { required: 'Indicá si tiene licencia' })} />
                    Sí
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="radio" value="no" {...register('tiene_licencia')} />
                    No
                  </label>
                </div>
                {errors.tiene_licencia && <span className="error">{errors.tiene_licencia.message}</span>}
              </div>
            </div>

            <div className="form-section">
              <h2>Datos del Copiloto (Opcional)</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre del Copiloto</label>
                  <input type="text" {...register('copiloto_nombre')} />
                </div>

                <div className="form-group">
                  <label>DNI del Copiloto</label>
                  <input type="text" {...register('copiloto_dni')} />
                </div>
              </div>
            </div>

            <div className="form-section">
              {/* Selector de tipo solo si se entra por /inscripcion sin /auto ni /moto (en ese caso se muestra la página de elección) */}
              {!tipo && (
                <div className="form-group">
                  <label>Tipo de Vehículo *</label>
                  <select {...register('categoria', { required: 'El tipo de vehículo es requerido' })}>
                    <option value="">Seleccione tipo de vehículo</option>
                    <option value="auto">Auto</option>
                    <option value="moto">Moto (y cuatriciclos)</option>
                  </select>
                  {errors.categoria && <span className="error">{errors.categoria.message}</span>}
                </div>
              )}

              {(tipo === 'auto' || watchCategoria === 'auto') && (
                <>
                  <div className="form-group">
                    <label>Categoría de Auto *</label>
                    <select {...register('categoria_auto', { 
                      required: watchCategoria === 'auto' ? 'Debes seleccionar una categoría' : false 
                    })}>
                      <option value="">Seleccione categoría</option>
                      <option value="1 A libres">1 A libres</option>
                      <option value="2 B 1000">2 B 1000</option>
                      <option value="4 C">4 C</option>
                      <option value="5 C plus">5 C plus</option>
                      <option value="6 D Plus">6 D Plus</option>
                      <option value="7 D Especial">7 D Especial</option>
                      <option value="8 RC5 8v">8 RC5 8v</option>
                      <option value="9 RC5 16v">9 RC5 16v</option>
                      <option value="10 E">10 E</option>
                      <option value="11 G">11 G</option>
                      <option value="12 Jeep Libres">12 Jeep Libres</option>
                      <option value="13 Fuerza Libre">13 Fuerza Libre</option>
                      <option value="14 4X4">14 4X4</option>
                      <option value="15 Integrales">15 Integrales</option>
                      <option value="16 UTV Aspirados">16 UTV Aspirados</option>
                      <option value="17 UTV Turbos">17 UTV Turbos</option>
                      <option value="Mejor Vallisto">Mejor Vallisto</option>
                      <option value="GENERAL">GENERAL</option>
                    </select>
                    {errors.categoria_auto && <span className="error">{errors.categoria_auto.message}</span>}
                  </div>

                  <div className="form-group">
                    <p className="form-hint">Los números de Auto son independientes de Moto y Cuatriciclos.</p>
                    {loadingNumbers ? (
                      <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <p>Cargando números disponibles...</p>
                      </div>
                    ) : (
                      <NumberSelector
                        selectedNumber={selectedNumber}
                        onSelect={handleNumberSelect}
                        usedNumbers={usedNumbers}
                      />
                    )}
                    {errors.numero && <span className="error">{errors.numero.message}</span>}
                  </div>
                </>
              )}

              {/* MOTOS: elegir campeonato (Enduro o Travesías/Safari) */}
              {(tipo === 'moto' || watchCategoria === 'moto') && !tipoCampeonato && (
                <div className="form-group">
                  <label>¿Qué campeonato? *</label>
                  <div className="form-row-options" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="radio" name="tipoCampeonato" onChange={() => { setTipoCampeonato('enduro'); setTravesiasSub(null); setValue('tipo_campeonato', 'enduro'); setValue('categoria_travesia_moto', undefined); setValue('categoria_cuatri', undefined); }} />
                      Campeonato Sanjuanino de Enduro
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="radio" name="tipoCampeonato" onChange={() => { setTipoCampeonato('travesias'); setValue('tipo_campeonato', 'travesias'); setValue('categoria_enduro', undefined); }} />
                      Campeonato de Travesías / Safari
                    </label>
                  </div>
                </div>
              )}

              {/* Enduro: categorías del Campeonato Sanjuanino de Enduro */}
              {(tipo === 'moto' || watchCategoria === 'moto') && tipoCampeonato === 'enduro' && (
                <>
                  <div className="form-group">
                    <button type="button" className="back-link" onClick={() => { setTipoCampeonato(null); setValue('tipo_campeonato', undefined); setValue('categoria_enduro', undefined); }} style={{ marginBottom: '0.5rem' }}>← Cambiar campeonato</button>
                  </div>
                  <div className="form-group">
                    <label>Categoría (Campeonato Sanjuanino de Enduro) *</label>
                    <select {...register('categoria_enduro', { required: tipoCampeonato === 'enduro' ? 'Debes seleccionar una categoría' : false })}>
                      <option value="">Seleccione categoría</option>
                      <option value="Senior A">Senior A</option>
                      <option value="Junior A">Junior A</option>
                      <option value="Junior B">Junior B</option>
                      <option value="Master Senior (39 a 49 años)">Master Senior (39 a 49 años)</option>
                      <option value="Master A (39 a 49 años)">Master A (39 a 49 años)</option>
                      <option value="Master B (39 a 49 años)">Master B (39 a 49 años)</option>
                      <option value="Master C (desde 50 años)">Master C (desde 50 años)</option>
                      <option value="Master D (desde 50 años)">Master D (desde 50 años)</option>
                      <option value="Promocional">Promocional</option>
                      <option value="Principiante">Principiante</option>
                      <option value="Enduro">Enduro</option>
                      <option value="Junior Kids">Junior Kids</option>
                    </select>
                    {errors.categoria_enduro && <span className="error">{errors.categoria_enduro.message}</span>}
                  </div>
                  <div className="form-group">
                    <p className="form-hint" style={{ padding: '0.75rem', background: '#f0f7f0', borderRadius: '8px', color: '#2d5a2d' }}>El número de competencia se te asignará luego.</p>
                  </div>
                </>
              )}

              {/* Travesías: Motos o Cuatriciclos */}
              {(tipo === 'moto' || watchCategoria === 'moto') && tipoCampeonato === 'travesias' && !travesiasSub && (
                <div className="form-group">
                  <label>¿Motos o Cuatriciclos? *</label>
                  <div className="form-row-options" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="radio" name="travesiasSub" onChange={() => { setTravesiasSub('moto'); setValue('categoria_cuatri', undefined); }} />
                      Motos
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="radio" name="travesiasSub" onChange={() => { setTravesiasSub('cuatri'); setValue('categoria_travesia_moto', undefined); setValue('categoria', 'cuatri'); }} />
                      Cuatriciclos
                    </label>
                  </div>
                </div>
              )}

              {/* Travesías - Motos: categorías */}
              {(tipo === 'moto' || watchCategoria === 'moto') && tipoCampeonato === 'travesias' && travesiasSub === 'moto' && (
                <>
                  <div className="form-group">
                    <button type="button" className="back-link" onClick={() => { setTravesiasSub(null); setValue('categoria_travesia_moto', undefined); setValue('categoria', 'moto'); }} style={{ marginBottom: '0.5rem' }}>← Motos / Cuatriciclos</button>
                  </div>
                  <div className="form-group">
                    <label>Categoría de Moto (Travesías / Safari) *</label>
                    <select {...register('categoria_travesia_moto', { required: travesiasSub === 'moto' ? 'Debes seleccionar una categoría' : false })}>
                      <option value="">Seleccione categoría</option>
                      <option value="110 cc semi">110 cc semi</option>
                      <option value="110 cc libre">110 cc libre</option>
                      <option value="150 cc china">150 cc china</option>
                      <option value="200 cc China">200 cc China</option>
                      <option value="250 cc China">250 cc China</option>
                      <option value="250 cc 4v">250 cc 4v</option>
                    </select>
                    {errors.categoria_travesia_moto && <span className="error">{errors.categoria_travesia_moto.message}</span>}
                  </div>
                  <div className="form-group">
                    <p className="form-hint" style={{ padding: '0.75rem', background: '#f0f7f0', borderRadius: '8px', color: '#2d5a2d' }}>El número de competencia se te asignará luego.</p>
                  </div>
                </>
              )}

              {/* Travesías - Cuatriciclos: categorías */}
              {(tipo === 'moto' || watchCategoria === 'moto') && tipoCampeonato === 'travesias' && travesiasSub === 'cuatri' && (
                <>
                  <div className="form-group">
                    <button type="button" className="back-link" onClick={() => { setTravesiasSub(null); setValue('categoria_cuatri', undefined); setValue('categoria', 'moto'); }} style={{ marginBottom: '0.5rem' }}>← Motos / Cuatriciclos</button>
                  </div>
                  <div className="form-group">
                    <label>Categoría de Cuatriciclo (Travesías / Safari) *</label>
                    <select {...register('categoria_cuatri', { required: effectiveCategoria === 'cuatri' ? 'Debes seleccionar una categoría' : false })}>
                      <option value="">Seleccione categoría</option>
                      <option value="200 cc Chino">200 cc Chino</option>
                      <option value="250 chino">250 chino</option>
                      <option value="450 open kids">450 open kids</option>
                    </select>
                    {errors.categoria_cuatri && <span className="error">{errors.categoria_cuatri.message}</span>}
                  </div>
                  <div className="form-group">
                    <p className="form-hint" style={{ padding: '0.75rem', background: '#f0f7f0', borderRadius: '8px', color: '#2d5a2d' }}>El número de competencia se te asignará luego.</p>
                  </div>
                </>
              )}

              {/* Input oculto para numero solo en autos (motos/cuatris no eligen número) */}
              {effectiveCategoria === 'auto' && (
                <input
                  type="hidden"
                  {...register('numero', {
                    required: effectiveCategoria === 'auto' ? 'Debes seleccionar un número' : false,
                    validate: (value) => {
                      const n = value != null ? Number(value) : NaN;
                      if (effectiveCategoria === 'auto' && (!value || isNaN(n) || n < 1 || n > 250)) {
                        return 'El número debe estar entre 01 y 250';
                      }
                      return true;
                    }
                  })}
                />
              )}
            </div>

            <div className="form-section">
              <h2>Documentos</h2>
              
              <div className="form-group">
                <label>Adjuntar comprobante de pago (obligatorio)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPaymentFile(file);
                  }}
                  required
                />
                <small className="helper-text">
                  Podés subir una foto del comprobante o un PDF. Tamaño máximo recomendado: 5MB.
                </small>
              </div>

            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Inscripción'}
            </button>
          </form>

          {message && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'} ${message.type === 'success' ? 'alert-success-prominent' : ''}`} style={{ marginTop: '2rem' }}>
              {message.type === 'success' && (
                <div className="success-icon">✓</div>
              )}
              <div className="alert-content">
                <strong>{message.type === 'success' ? '¡Éxito!' : 'Error'}</strong>
                <p>{message.text}</p>
              </div>
            </div>
          )}

          {qrDataUrl && (
            <div className="qr-section" style={{ marginTop: '2rem' }}>
              <div className="qr-container">
                <h3>✅ Tu código QR de inscripción</h3>
                <p className="qr-description">
                  Guardalo en tu teléfono o descargalo para presentarlo en la acreditación del evento.
                </p>
                <div className="qr-preview">
                  <img src={qrDataUrl} alt="QR de inscripción" className="qr-image" />
                </div>
                <div className="qr-actions">
                  <button
                    onClick={async () => {
                      try {
                        const nombre = watch('nombre') || '';
                        const apellido = watch('apellido') || '';
                        const numero = watch('numero');
                        const cat = effectiveCategoria || watch('categoria') || '';
                        const categoriaDetalle = cat === 'auto' 
                          ? watch('categoria_auto') || ''
                          : cat === 'moto'
                            ? (watch('categoria_moto') || watch('categoria_moto_china') || '')
                            : watch('categoria_cuatri') || '';
                        
                        const fullImage = await generatePilotCardImage(
                          qrDataUrl!,
                          nombre,
                          apellido,
                          numero || null,
                          cat,
                          categoriaDetalle || null
                        );
                        
                        const link = document.createElement('a');
                        link.href = fullImage;
                        link.download = `safari-inscripcion-${nombre}-${apellido}-${numero?.toString().padStart(2, '0') || 'sin-numero'}-${Date.now()}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } catch (error) {
                        console.error('Error generando imagen:', error);
                        alert('Error al generar la imagen. Descargando solo el QR.');
                        // Fallback: descargar solo el QR
                        const link = document.createElement('a');
                        link.href = qrDataUrl!;
                        link.download = `qr-inscripcion-${watchDni || 'safari'}-${Date.now()}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}
                    className="btn btn-primary"
                  >
                    📥 Descargar Tarjeta Completa
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(qrDataUrl!);
                      alert('QR copiado al portapapeles');
                    }}
                    className="btn btn-secondary"
                  >
                    📋 Copiar QR
                  </button>
                </div>
                <div className="qr-info">
                  <p><strong>DNI:</strong> {watchDni}</p>
                  <p><strong>Nombre:</strong> {watch('nombre')} {watch('apellido')}</p>
                  {watch('numero') && <p><strong>Número de competencia:</strong> {watch('numero')?.toString().padStart(2, '0')}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

