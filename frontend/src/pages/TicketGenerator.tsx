import { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';

// Configurar base URL para producción
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API_BASE_URL;
import { Link } from 'react-router-dom';
import './TicketGenerator.css';

interface TicketFormData {
  tipo: string;
  nombre: string;
  dni: string;
  email: string;
  precio: number;
}

export default function TicketGenerator() {
  const { register, handleSubmit, formState: { errors } } = useForm<TicketFormData>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const onSubmit = async (data: TicketFormData) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post('/api/tickets/generate', data, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMessage({ type: 'success', text: '¡Ticket generado exitosamente! El PDF se ha descargado.' });
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
                <option value="general">General</option>
                <option value="vip">VIP</option>
                <option value="estudiante">Estudiante</option>
                <option value="menor">Menor</option>
              </select>
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

            <div className="form-group">
              <label>Precio *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('precio', { 
                  required: 'El precio es requerido',
                  min: { value: 0, message: 'El precio debe ser mayor o igual a 0' }
                })}
                placeholder="0.00"
              />
              {errors.precio && <span className="error">{errors.precio.message}</span>}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Generando ticket...' : 'Generar y Descargar Ticket'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

