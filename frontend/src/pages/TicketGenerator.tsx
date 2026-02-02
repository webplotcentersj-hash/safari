import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API_BASE_URL;
import { Link } from 'react-router-dom';
import './TicketGenerator.css';

// Tipos de ticket con precios predefinidos (podés ajustar valores)
const TICKET_TYPES = [
  { value: 'general', label: 'General', precio: 5000 },
  { value: 'vip', label: 'VIP', precio: 8000 },
  { value: 'estudiante', label: 'Estudiante', precio: 3500 },
  { value: 'menor', label: 'Menor (hasta 12 años)', precio: 2000 }
] as const;

interface TicketFormData {
  tipo: string;
  nombre: string;
  dni: string;
  email: string;
  precio: number;
}

export default function TicketGenerator() {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<TicketFormData>({
    defaultValues: { tipo: '', precio: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const watchTipo = watch('tipo');

  // Al elegir tipo, asignar el precio predefinido
  useEffect(() => {
    const t = TICKET_TYPES.find((x) => x.value === watchTipo);
    if (t) setValue('precio', t.precio);
  }, [watchTipo, setValue]);

  const onSubmit = async (data: TicketFormData) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post('/tickets/generate', data, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMessage({ type: 'success', text: '¡Ticket generado! El PDF se descargó. Presentalo en la entrada.' });
      window.URL.revokeObjectURL(url);
      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Error al generar el ticket. Por favor, intenta nuevamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ticket-generator-page">
      <div className="container">
        <Link to="/" className="back-link">← Volver al inicio</Link>
        
        <div className="ticket-generator-card">
          <div className="ticket-header">
            <img src="/logo.png" alt="Safari Tras las Sierras" className="ticket-logo" />
            <h1>Generar Ticket de Entrada</h1>
            <p className="subtitle">Completa el formulario para generar tu ticket de entrada al Safari Tras las Sierras</p>
          </div>

          {message && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label>Tipo de Ticket *</label>
              <select
                {...register('tipo', { required: 'El tipo de ticket es requerido' })}
              >
                <option value="">Seleccione un tipo</option>
                {TICKET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} — $ {t.precio.toLocaleString('es-AR')}
                  </option>
                ))}
              </select>
              {watchTipo && (
                <p className="form-hint">
                  Precio: $ {TICKET_TYPES.find((t) => t.value === watchTipo)?.precio.toLocaleString('es-AR') ?? 0}
                </p>
              )}
              {errors.tipo && <span className="error">{errors.tipo.message}</span>}
            </div>

            <div className="form-group">
              <label>Nombre Completo *</label>
              <input
                type="text"
                {...register('nombre', { required: 'El nombre es requerido' })}
                placeholder="Juan Pérez"
              />
              {errors.nombre && <span className="error">{errors.nombre.message}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>DNI</label>
                <input
                  type="text"
                  {...register('dni')}
                  placeholder="12345678"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  {...register('email', {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido'
                    }
                  })}
                  placeholder="ejemplo@email.com"
                />
                {errors.email && <span className="error">{errors.email.message}</span>}
              </div>
            </div>

            <input type="hidden" {...register('precio', { required: true, min: 0 })} />
            {errors.precio && <span className="error">Seleccioná un tipo de ticket.</span>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Generando ticket...' : 'Generar y Descargar Ticket'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

