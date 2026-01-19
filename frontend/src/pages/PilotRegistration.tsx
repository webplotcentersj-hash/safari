import { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';

// Configurar base URL para producción
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API_BASE_URL;
import { Link } from 'react-router-dom';
import './PilotRegistration.css';

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
}

export default function PilotRegistration() {
  const { register, handleSubmit, formState: { errors } } = useForm<PilotFormData>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const onSubmit = async (data: PilotFormData) => {
    setLoading(true);
    setMessage(null);

    try {
      await axios.post('/api/pilots/register', data);
      setMessage({ type: 'success', text: '¡Inscripción realizada exitosamente! Te contactaremos pronto.' });
      // Reset form
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Error al procesar la inscripción. Por favor, intenta nuevamente.'
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
          <h1>Inscripción de Pilotos</h1>
          <p className="subtitle">Completa todos los campos para inscribirte en el Safari Tras las Sierras</p>

          {message && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
              {message.text}
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

              <div className="form-group">
                <label>Licencia de Conducir</label>
                <input type="text" {...register('licencia')} />
              </div>
            </div>

            <div className="form-section">
              <h2>Datos del Vehículo</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Marca</label>
                  <input type="text" {...register('vehiculo_marca')} />
                </div>

                <div className="form-group">
                  <label>Modelo</label>
                  <input type="text" {...register('vehiculo_modelo')} />
                </div>
              </div>

              <div className="form-group">
                <label>Patente</label>
                <input type="text" {...register('vehiculo_patente')} />
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
                <label>Categoría</label>
                <select {...register('categoria')}>
                  <option value="">Seleccione una categoría</option>
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                  <option value="experto">Experto</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Inscripción'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

