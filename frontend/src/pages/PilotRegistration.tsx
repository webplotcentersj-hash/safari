import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { supabase } from '../config/supabase';

// Configurar base URL para producción
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API_BASE_URL;
import { Link } from 'react-router-dom';
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

    // Dimensiones del canvas
    canvas.width = 1200;
    canvas.height = 1600;

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

      // Logo en la parte superior
      const logoSize = 200;
      const logoX = (canvas.width - logoSize) / 2;
      const logoY = 40;
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize * (logo.height / logo.width));

      // Título
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('SAFARI TRAS LAS SIERRAS', canvas.width / 2, logoY + logoSize * (logo.height / logo.width) + 60);
      
      ctx.font = '32px Arial';
      ctx.fillText('Valle Fértil - San Juan', canvas.width / 2, logoY + logoSize * (logo.height / logo.width) + 100);

      // Sección del número (diseño tipo casco)
      if (numero) {
        const numberX = canvas.width / 2;
        const numberY = logoY + logoSize * (logo.height / logo.width) + 200;
        
        // Sombra del casco
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(numberX + 5, numberY + 5, 130, 0, Math.PI * 2);
        ctx.fill();
        
        // Fondo circular tipo casco con gradiente
        const helmetGradient = ctx.createRadialGradient(numberX, numberY, 0, numberX, numberY, 130);
        helmetGradient.addColorStop(0, '#65b330');
        helmetGradient.addColorStop(0.7, '#5aa02a');
        helmetGradient.addColorStop(1, '#4a8a1f');
        ctx.fillStyle = helmetGradient;
        ctx.beginPath();
        ctx.arc(numberX, numberY, 130, 0, Math.PI * 2);
        ctx.fill();
        
        // Borde exterior del casco
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 10;
        ctx.stroke();
        
        // Borde interior
        ctx.strokeStyle = '#4a8a1f';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(numberX, numberY, 120, 0, Math.PI * 2);
        ctx.stroke();
        
        // Mini logo del Safari en la parte superior del casco
        const miniLogoSize = 60;
        const miniLogoX = numberX - miniLogoSize / 2;
        const miniLogoY = numberY - 80;
        ctx.drawImage(logo, miniLogoX, miniLogoY, miniLogoSize, miniLogoSize * (logo.height / logo.width));
        
        // Número en el centro (grande y destacado)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 140px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Sombra del número
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillText(numero.toString().padStart(2, '0'), numberX + 3, numberY + 3);
        
        // Número principal
        ctx.fillStyle = '#ffffff';
        ctx.fillText(numero.toString().padStart(2, '0'), numberX, numberY);
        
        // Texto "NÚMERO DE COMPETENCIA"
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('NÚMERO DE COMPETENCIA', numberX, numberY + 100);
      }

      // Información del piloto
      const infoY = logoY + logoSize * (logo.height / logo.width) + 400;
      
      // Nombre
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${nombre} ${apellido}`, canvas.width / 2, infoY);
      
      // Categoría
      const categoriaTexto = categoria === 'auto' ? 'AUTO' : 'MOTO';
      ctx.font = '36px Arial';
      ctx.fillStyle = '#65b330';
      ctx.fillText(categoriaTexto, canvas.width / 2, infoY + 60);
      
      // Subcategoría
      if (categoriaDetalle) {
        ctx.font = '32px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(categoriaDetalle.toUpperCase(), canvas.width / 2, infoY + 110);
      }

      // Cargar y dibujar QR
      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous';
      qrImage.onload = () => {
        const qrSize = 500;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = infoY + 180;
        
        // Fondo blanco para el QR
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
        
        // Borde del QR
        ctx.strokeStyle = '#65b330';
        ctx.lineWidth = 4;
        ctx.strokeRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
        
        // QR
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
        
        // Texto debajo del QR
        ctx.fillStyle = '#ffffff';
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Presenta este código en la acreditación', canvas.width / 2, qrY + qrSize + 60);
        
        // Footer
        ctx.font = '24px Arial';
        ctx.fillStyle = '#cccccc';
        ctx.fillText('Este documento es personal e intransferible', canvas.width / 2, canvas.height - 40);
        
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
  numero?: number;
  // estos campos no los completa el usuario, los llenamos nosotros con las URLs
  comprobante_pago_url?: string;
}

export default function PilotRegistration() {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<PilotFormData>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [usedNumbers, setUsedNumbers] = useState<number[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);

  const watchDni = watch('dni');
  const watchCategoria = watch('categoria');

  // Cargar números ya usados cuando se selecciona una categoría
  useEffect(() => {
    console.log('🔄 useEffect ejecutado. watchCategoria:', watchCategoria);
    if (watchCategoria === 'auto' || watchCategoria === 'moto') {
      console.log('✅ Categoría válida detectada, cargando números...');
      loadUsedNumbers();
    } else {
      console.log('⚠️ Categoría no válida o no seleccionada');
      setSelectedNumber(null);
      setValue('numero', undefined);
      setUsedNumbers([]);
    }
  }, [watchCategoria, setValue]);

  const loadUsedNumbers = async () => {
    setLoadingNumbers(true);
    try {
      // Usar endpoint público específico para números usados
      // Pasar la categoría para obtener solo números usados de esa categoría
      const categoria = watchCategoria === 'auto' ? 'auto' : 'moto';
      console.log('🔍 Cargando números usados para categoría:', categoria);
      console.log('🔍 URL completa:', `/pilots/used-numbers?categoria=${categoria}`);
      
      // La baseURL ya incluye /api, así que solo necesitamos /pilots/used-numbers
      const endpointUrl = `/pilots/used-numbers?categoria=${categoria}`;
      console.log('🔍 URL completa del endpoint:', endpointUrl);
      console.log('🔍 BaseURL configurada:', axios.defaults.baseURL);
      console.log('🔍 URL final será:', axios.defaults.baseURL + endpointUrl);
      
      const response = await axios.get(endpointUrl);
      
      console.log('📊 Respuesta completa:', response);
      console.log('📊 Respuesta status:', response.status);
      console.log('📊 Respuesta data:', response.data);
      console.log('📊 Tipo de data:', typeof response.data);
      console.log('📊 ¿Es array?', Array.isArray(response.data));
      
      if (!response.data) {
        console.error('❌ La respuesta está vacía o es null');
        setUsedNumbers([]);
        return;
      }
      
      const used = Array.isArray(response.data) ? response.data.map((n: any) => {
        // Asegurar que todos los números sean enteros
        const num = typeof n === 'string' ? parseInt(n, 10) : Number(n);
        console.log('🔢 Procesando:', n, '->', num, '(tipo original:', typeof n, ')');
        return !isNaN(num) && num >= 1 && num <= 250 ? num : null;
      }).filter((n: number | null) => n !== null) as number[] : [];
      
      console.log('✅ Números usados procesados (enteros):', used);
      console.log('✅ Cantidad final:', used.length);
      
      if (used.length === 0) {
        console.warn('⚠️ ADVERTENCIA: No se encontraron números usados, pero debería haber algunos');
      }
      
      setUsedNumbers(used);
    } catch (error: any) {
      console.error('❌ Error cargando números usados:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      // Si falla, continuar sin restricciones (pero el backend validará)
      setUsedNumbers([]);
    } finally {
      setLoadingNumbers(false);
    }
  };

  const handleNumberSelect = (num: number) => {
    setSelectedNumber(num);
    setValue('numero', num, { shouldValidate: true });
  };

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

      // Validar que la categoría esté presente
      if (!data.categoria) {
        setMessage({
          type: 'error',
          text: 'Debes seleccionar el tipo de vehículo (Auto o Moto).'
        });
        setLoading(false);
        return;
      }

      // Validar campos requeridos para autos
      if (data.categoria === 'auto') {
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

      // Validar campos requeridos para motos
      if (data.categoria === 'moto') {
        if (!data.categoria_moto) {
          setMessage({
            type: 'error',
            text: 'Debes seleccionar una categoría de moto.'
          });
          setLoading(false);
          return;
        }
        if (!data.numero) {
          setMessage({
            type: 'error',
            text: 'Debes seleccionar tu número de competencia (01-250).'
          });
          setLoading(false);
          return;
        }
      }

      // Usamos la baseURL configurada (/api) y acá solo la ruta relativa.
      // La función de Vercel es `api/pilots.ts`, cuya ruta real es `/api/pilots`.
      const response = await axios.post('/pilots', {
        ...data,
        numero: (data.categoria === 'auto' || data.categoria === 'moto') ? data.numero : null,
        categoria_auto: data.categoria === 'auto' ? data.categoria_auto : null,
        categoria_moto: data.categoria === 'moto' ? data.categoria_moto : null,
        comprobante_pago_url: comprobanteUrl
      });
      const qrFromApi = response.data?.qrDataUrl as string | undefined;

      // Actualizar la lista de números usados después de una inscripción exitosa
      if ((data.categoria === 'auto' || data.categoria === 'moto') && data.numero) {
        setUsedNumbers(prev => [...prev, data.numero!].sort((a, b) => a - b));
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

  return (
    <div className="registration-page">
      <div className="container">
        <Link to="/" className="back-link">← Volver al inicio</Link>
        
        <div className="registration-card">
          <div className="registration-header">
            <img src="/logo.png" alt="Safari Tras las Sierras" className="registration-logo" />
            <h1>Inscripción de Pilotos</h1>
            <p className="subtitle">Completa todos los campos para inscribirte en el Safari Tras las Sierras</p>
          </div>

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
              <div className="form-group">
                <label>Tipo de Vehículo *</label>
                <select {...register('categoria', { required: 'El tipo de vehículo es requerido' })}>
                  <option value="">Seleccione tipo de vehículo</option>
                  <option value="auto">Auto</option>
                  <option value="moto">Moto</option>
                </select>
                {errors.categoria && <span className="error">{errors.categoria.message}</span>}
              </div>

              {watchCategoria === 'auto' && (
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
                    <input
                      type="hidden"
                      {...register('numero', { 
                        required: watchCategoria === 'auto' ? 'Debes seleccionar un número' : false,
                        validate: (value) => {
                          if (watchCategoria === 'auto' && (!value || value < 1 || value > 250)) {
                            return 'El número debe estar entre 01 y 250';
                          }
                          return true;
                        }
                      })}
                    />
                  </div>
                </>
              )}

              {watchCategoria === 'moto' && (
                <>
                  <div className="form-group">
                    <label>Categoría de Moto Enduro Safari *</label>
                    <select {...register('categoria_moto', { 
                      required: watchCategoria === 'moto' ? 'Debes seleccionar una categoría' : false 
                    })}>
                      <option value="">Seleccione categoría</option>
                      <option value="1 SENIOR">1 SENIOR</option>
                      <option value="2 JUNIOR">2 JUNIOR</option>
                      <option value="3 MASTER A">3 MASTER A</option>
                      <option value="4 MASTER B">4 MASTER B</option>
                      <option value="5 MASTER C">5 MASTER C</option>
                      <option value="6 PROMOCIONALES">6 PROMOCIONALES</option>
                      <option value="7 JUNIOR Kids">7 JUNIOR Kids</option>
                    </select>
                    {errors.categoria_moto && <span className="error">{errors.categoria_moto.message}</span>}
                  </div>

                  <div className="form-group">
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
                    <input
                      type="hidden"
                      {...register('numero', { 
                        required: watchCategoria === 'moto' ? 'Debes seleccionar un número' : false,
                        validate: (value) => {
                          if (watchCategoria === 'moto' && (!value || value < 1 || value > 250)) {
                            return 'El número debe estar entre 01 y 250';
                          }
                          return true;
                        }
                      })}
                    />
                  </div>
                </>
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
                        const categoria = watch('categoria') || '';
                        const categoriaDetalle = categoria === 'auto' 
                          ? watch('categoria_auto') || ''
                          : watch('categoria_moto') || '';
                        
                        const fullImage = await generatePilotCardImage(
                          qrDataUrl!,
                          nombre,
                          apellido,
                          numero || null,
                          categoria,
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

