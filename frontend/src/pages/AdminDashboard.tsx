import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../config/supabase';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Configurar base URL para producción
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API_BASE_URL;
import './AdminDashboard.css';

const COLORS = ['#65b330', '#5aa02a', '#4a8f28', '#3d7a22'];

interface Pilot {
  id: string; // UUID en Supabase
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  estado: string;
  created_at: string;
  categoria?: string;
  categoria_auto?: string;
  categoria_moto?: string;
  numero?: number;
}

interface Ticket {
  id: number;
  codigo: string;
  tipo: string;
  nombre: string;
  precio: number;
  usado: number;
  fecha_emision: string;
}

interface Stats {
  pilots: {
    total: number;
    approved: number;
    pending: number;
  };
  tickets: {
    total: number;
    used: number;
    available: number;
  };
  revenue: number;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pilots' | 'tickets' | 'stats'>('stats');
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketForm, setTicketForm] = useState({
    tipo: 'general',
    nombre: '',
    dni: '',
    email: '',
    precio: 0
  });
  const [bulkTicketForm, setBulkTicketForm] = useState({
    cantidad: 1,
    tipo: 'general',
    precio: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    // Si es una actualización silenciosa (polling), no mostrar loading
    if (!silent) {
      setLoading(true);
    }
    setErrorMessage(null);
    try {
      if (activeTab === 'pilots') {
        // Consultar directamente desde Supabase usando el cliente del frontend
        console.log('=== FETCHING PILOTS DIRECTLY FROM SUPABASE ===');
        console.log('Supabase client available:', !!supabase);
        
        if (!supabase) {
          const errorMsg = 'Supabase client no está configurado. Verificá que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estén configuradas en Vercel.';
          console.error('❌', errorMsg);
          throw new Error(errorMsg);
        }

        const { data: pilotsData, error: supabaseError } = await supabase
          .from('pilots')
          .select('*')
          .order('created_at', { ascending: false });

        console.log('Supabase query result - error:', supabaseError);
        console.log('Supabase query result - data:', pilotsData);
        console.log('Supabase query result - data length:', pilotsData?.length);

        if (supabaseError) {
          console.error('Supabase error:', supabaseError);
          throw new Error(supabaseError.message || 'Error al cargar los pilotos desde Supabase');
        }

        const pilotsArray = Array.isArray(pilotsData) ? pilotsData : [];
        console.log(`✅ Successfully loaded ${pilotsArray.length} pilots`);
        
        if (pilotsArray.length > 0) {
          console.log('First pilot:', pilotsArray[0]);
          console.log('All pilots:', pilotsArray);
        } else {
          console.warn('No pilots found in database');
        }
        
        setPilots(pilotsArray);
      } else if (activeTab === 'tickets') {
        // Consultar tickets desde Supabase directamente
        if (!supabase) {
          throw new Error('Supabase client no está configurado');
        }
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select('*')
          .order('fecha_emision', { ascending: false });
        
        if (ticketsError) {
          throw new Error(ticketsError.message || 'Error al cargar los tickets');
        }
        setTickets(Array.isArray(ticketsData) ? ticketsData : []);
      } else {
        // Calcular estadísticas desde Supabase directamente
        if (!supabase) {
          throw new Error('Supabase client no está configurado');
        }
        
        // Obtener conteos de pilotos
        const { count: totalPilots, error: pilotsCountError } = await supabase
          .from('pilots')
          .select('*', { count: 'exact', head: true });
        
        const { count: approvedPilots, error: approvedError } = await supabase
          .from('pilots')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'aprobado');
        
        const { count: pendingPilots, error: pendingError } = await supabase
          .from('pilots')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'pendiente');
        
        // Obtener conteos de tickets
        const { count: totalTickets, error: ticketsCountError } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true });
        
        const { count: usedTickets, error: usedError } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('usado', true);
        
        // Obtener ingresos
        const { data: usedTicketsData, error: revenueError } = await supabase
          .from('tickets')
          .select('precio')
          .eq('usado', true);
        
        const totalRevenue = usedTicketsData?.reduce((sum: number, ticket: any) => sum + (parseFloat(ticket.precio) || 0), 0) || 0;
        
        if (pilotsCountError || approvedError || pendingError || ticketsCountError || usedError || revenueError) {
          console.error('Error calculating stats:', { pilotsCountError, approvedError, pendingError, ticketsCountError, usedError, revenueError });
        }
        
        setStats({
          pilots: {
            total: totalPilots || 0,
            approved: approvedPilots || 0,
            pending: pendingPilots || 0
          },
          tickets: {
            total: totalTickets || 0,
            used: usedTickets || 0,
            available: (totalTickets || 0) - (usedTickets || 0)
          },
          revenue: totalRevenue
        });
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error details:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Error al cargar los datos';
      setErrorMessage(errorMsg);
      // Evitar crash por estados inesperados
      if (activeTab === 'pilots') {
        console.error('Setting pilots to empty array due to error');
        setPilots([]);
      }
      if (activeTab === 'tickets') setTickets([]);
      if (activeTab === 'stats') setStats(null);
    } finally {
      // Solo ocultar loading si no es una actualización silenciosa
      if (!silent) {
        setLoading(false);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData(false); // Primera carga con loading
  }, [fetchData]);

  // Actualización en tiempo real cada 10 segundos cuando está en la pestaña de pilotos
  // Usar modo silencioso para evitar parpadeos
  useEffect(() => {
    if (activeTab !== 'pilots') return;
    
    const intervalId = setInterval(() => {
      fetchData(true); // Actualización silenciosa sin mostrar loading
    }, 10000); // Actualizar cada 10 segundos (aumentado de 5 para menos intermitencias)
    
    return () => {
      clearInterval(intervalId);
    };
  }, [activeTab, fetchData]);

  const updatePilotStatus = async (id: string, estado: string) => {
    try {
      console.log('Updating pilot status:', { id, estado });
      
      if (!supabase) {
        throw new Error('Supabase client no está configurado');
      }

      // Validar estado
      if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
        throw new Error('Estado inválido');
      }

      // Actualizar estado directamente en Supabase
      const { data, error } = await supabase
        .from('pilots')
        .update({ estado })
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Supabase update error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw new Error(error.message || 'Error al actualizar el estado en Supabase');
      }

      if (!data || data.length === 0) {
        throw new Error('No se recibió confirmación de la actualización');
      }

      console.log('✅ Status updated successfully:', data);
      
      // Actualizar los datos después de cambiar el estado (sin loading para evitar parpadeo)
      await fetchData(true);
      
      // Mostrar mensaje de éxito
      alert(`Estado actualizado exitosamente a: ${estado}`);
    } catch (error: any) {
      console.error('❌ Error updating status:', error);
      const errorMessage = error.message || 'Error al actualizar el estado. Verificá la consola para más detalles.';
      alert(errorMessage);
    }
  };

  const generateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/tickets/generate', ticketForm, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setTicketForm({ tipo: 'general', nombre: '', dni: '', email: '', precio: 0 });
      fetchData();
    } catch (error) {
      console.error('Error generating ticket:', error);
      alert('Error al generar el ticket');
    }
  };

  const generateBulkTickets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`¿Generar ${bulkTicketForm.cantidad} tickets de tipo "${bulkTicketForm.tipo}" con precio $${bulkTicketForm.precio}?`)) {
      return;
    }
    try {
      const response = await axios.post('/api/tickets/generate-bulk', bulkTicketForm);
      alert(`¡${response.data.cantidad} tickets generados exitosamente!`);
      setBulkTicketForm({ cantidad: 1, tipo: 'general', precio: 0 });
      fetchData();
    } catch (error: any) {
      console.error('Error generating bulk tickets:', error);
      alert(error.response?.data?.error || 'Error al generar los tickets');
    }
  };

  const downloadTicketPDF = async (codigo: string) => {
    try {
      const response = await axios.get(`/admin/tickets/${codigo}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-${codigo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error al descargar el PDF');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="container">
          <div className="admin-header-content">
            <img src="/logo.png" alt="Safari Tras las Sierras" className="admin-logo" />
            <h1>Panel de Administración</h1>
          </div>
          <div className="admin-header-actions">
            <span className="admin-user">Bienvenido, {user?.email}</span>
            <button onClick={handleLogout} className="btn btn-secondary">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="admin-tabs">
          <button
            className={activeTab === 'stats' ? 'active' : ''}
            onClick={() => setActiveTab('stats')}
          >
            Estadísticas
          </button>
          <button
            className={activeTab === 'pilots' ? 'active' : ''}
            onClick={() => setActiveTab('pilots')}
          >
            Pilotos
          </button>
          <button
            className={activeTab === 'tickets' ? 'active' : ''}
            onClick={() => setActiveTab('tickets')}
          >
            Tickets
          </button>
        </div>

        {loading ? (
          <div className="loading">Cargando...</div>
        ) : (
          <>
            {activeTab === 'stats' && (
              <div className="stats-section">
                <div className="stats-grid">
                  {stats ? (
                    <>
                      <div className="stat-card">
                        <h3>Pilotos</h3>
                        <div className="stat-value">{stats.pilots?.total || 0}</div>
                        <div className="stat-details">
                          <span className="stat-approved">Aprobados: {stats.pilots?.approved || 0}</span>
                          <span className="stat-pending">Pendientes: {stats.pilots?.pending || 0}</span>
                        </div>
                      </div>

                      <div className="stat-card">
                        <h3>Tickets</h3>
                        <div className="stat-value">{stats.tickets?.total || 0}</div>
                        <div className="stat-details">
                          <span className="stat-used">Usados: {stats.tickets?.used || 0}</span>
                          <span className="stat-available">Disponibles: {stats.tickets?.available || 0}</span>
                        </div>
                      </div>

                      <div className="stat-card">
                        <h3>Ingresos</h3>
                        <div className="stat-value">${(stats.revenue || 0).toFixed(2)}</div>
                      </div>
                    </>
                  ) : (
                    <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
                      <p>No se pudieron cargar las estadísticas. Verificá la configuración del backend.</p>
                    </div>
                  )}
                </div>

                {stats && (
                  <div className="charts-grid">
                    <div className="chart-card">
                      <h3>Estado de Pilotos</h3>
                      <ResponsiveContainer width="100%" height={300} minHeight={250}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Aprobados', value: stats.pilots?.approved || 0 },
                              { name: 'Pendientes', value: stats.pilots?.pending || 0 },
                              { name: 'Rechazados', value: (stats.pilots?.total || 0) - (stats.pilots?.approved || 0) - (stats.pilots?.pending || 0) }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => {
                              const p = typeof percent === 'number' ? percent : 0;
                              return `${name}: ${(p * 100).toFixed(0)}%`;
                            }}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[
                              { name: 'Aprobados', value: stats.pilots?.approved || 0 },
                              { name: 'Pendientes', value: stats.pilots?.pending || 0 },
                              { name: 'Rechazados', value: (stats.pilots?.total || 0) - (stats.pilots?.approved || 0) - (stats.pilots?.pending || 0) }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card">
                      <h3>Estado de Tickets</h3>
                      <ResponsiveContainer width="100%" height={300} minHeight={250}>
                        <BarChart
                          data={[
                            { name: 'Usados', value: stats.tickets?.used || 0 },
                            { name: 'Disponibles', value: stats.tickets?.available || 0 }
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                          <YAxis style={{ fontSize: '12px' }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="value" fill="#65b330" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pilots' && (
              <div className="admin-content">
                {loading ? (
                  <div className="loading">Cargando pilotos...</div>
                ) : (
                  <>
                    {errorMessage && (
                      <div className="alert alert-error" style={{ marginBottom: '20px' }}>
                        <strong>Error:</strong> {errorMessage}
                        <button onClick={fetchData} className="btn btn-primary btn-sm" style={{ marginLeft: '10px' }}>
                          Reintentar
                        </button>
                      </div>
                    )}
                    <div className="table-header">
                      <h3>Total de pilotos: {pilots.length}</h3>
                      <div className="search-box">
                        <input
                          type="text"
                          placeholder="Buscar por nombre, apellido, DNI, email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="search-input"
                        />
                      </div>
                    </div>
                    {pilots.length === 0 && !errorMessage ? (
                      <div className="empty-state">
                        <p>No hay pilotos inscritos aún.</p>
                      </div>
                    ) : pilots.length > 0 ? (
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Nombre</th>
                              <th>Apellido</th>
                              <th>DNI</th>
                              <th>Email</th>
                              <th>Teléfono</th>
                              <th>Categoría</th>
                              <th>Número</th>
                              <th>Estado</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pilots
                              .filter((pilot) => {
                                if (!searchTerm) return true;
                                const search = searchTerm.toLowerCase();
                                return (
                                  pilot.nombre?.toLowerCase().includes(search) ||
                                  pilot.apellido?.toLowerCase().includes(search) ||
                                  pilot.dni?.toLowerCase().includes(search) ||
                                  pilot.email?.toLowerCase().includes(search) ||
                                  pilot.telefono?.toLowerCase().includes(search) ||
                                  pilot.categoria_auto?.toLowerCase().includes(search) ||
                                  pilot.categoria_moto?.toLowerCase().includes(search) ||
                                  pilot.numero?.toString().includes(search)
                                );
                              })
                              .map((pilot) => (
                                <tr key={pilot.id}>
                                  <td>{pilot.nombre}</td>
                                  <td>{pilot.apellido}</td>
                                  <td>{pilot.dni}</td>
                                  <td>{pilot.email}</td>
                                  <td>{pilot.telefono}</td>
                                  <td>
                                    {pilot.categoria === 'auto' && pilot.categoria_auto && (
                                      <span className="category-badge">{pilot.categoria_auto}</span>
                                    )}
                                    {pilot.categoria === 'moto' && pilot.categoria_moto && (
                                      <span className="category-badge">{pilot.categoria_moto}</span>
                                    )}
                                    {!pilot.categoria && '-'}
                                  </td>
                                  <td>
                                    {pilot.numero ? (
                                      <span className="number-badge">{pilot.numero.toString().padStart(2, '0')}</span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td>
                                    <span className={`status-badge status-${pilot.estado}`}>
                                      {pilot.estado}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="action-buttons">
                                      {pilot.estado !== 'aprobado' && (
                                        <button
                                          onClick={() => updatePilotStatus(pilot.id, 'aprobado')}
                                          className="btn btn-success btn-sm"
                                        >
                                          Aprobar
                                        </button>
                                      )}
                                      {pilot.estado !== 'rechazado' && (
                                        <button
                                          onClick={() => updatePilotStatus(pilot.id, 'rechazado')}
                                          className="btn btn-danger btn-sm"
                                        >
                                          Rechazar
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            )}

            {activeTab === 'tickets' && (
              <div className="admin-content">
                <div className="card">
                  <h2>Generar Nuevo Ticket</h2>
                  <form onSubmit={generateTicket} className="ticket-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Tipo</label>
                        <select
                          value={ticketForm.tipo}
                          onChange={(e) => setTicketForm({ ...ticketForm, tipo: e.target.value })}
                          required
                        >
                          <option value="general">General</option>
                          <option value="vip">VIP</option>
                          <option value="estudiante">Estudiante</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Precio</label>
                        <input
                          type="number"
                          step="0.01"
                          value={ticketForm.precio}
                          onChange={(e) => setTicketForm({ ...ticketForm, precio: parseFloat(e.target.value) })}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Nombre *</label>
                      <input
                        type="text"
                        value={ticketForm.nombre}
                        onChange={(e) => setTicketForm({ ...ticketForm, nombre: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>DNI</label>
                        <input
                          type="text"
                          value={ticketForm.dni}
                          onChange={(e) => setTicketForm({ ...ticketForm, dni: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          value={ticketForm.email}
                          onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary">
                      Generar y Descargar Ticket
                    </button>
                  </form>
                </div>

                <div className="card" style={{ marginTop: '2rem' }}>
                  <h2>Generar Tickets Masivamente (Para el Público)</h2>
                  <p style={{ color: '#666', marginBottom: '1rem' }}>
                    Genera múltiples tickets de una vez sin datos personales. Los tickets se crearán automáticamente y estarán disponibles para ser asignados al público.
                  </p>
                  <form onSubmit={generateBulkTickets} className="ticket-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Cantidad *</label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={bulkTicketForm.cantidad}
                          onChange={(e) => setBulkTicketForm({ ...bulkTicketForm, cantidad: parseInt(e.target.value) || 1 })}
                          required
                        />
                        <small style={{ color: '#666' }}>Máximo 1000 tickets por vez</small>
                      </div>

                      <div className="form-group">
                        <label>Tipo *</label>
                        <select
                          value={bulkTicketForm.tipo}
                          onChange={(e) => setBulkTicketForm({ ...bulkTicketForm, tipo: e.target.value })}
                          required
                        >
                          <option value="general">General</option>
                          <option value="vip">VIP</option>
                          <option value="estudiante">Estudiante</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Precio *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={bulkTicketForm.precio}
                          onChange={(e) => setBulkTicketForm({ ...bulkTicketForm, precio: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-success">
                      Generar {bulkTicketForm.cantidad} Tickets Automáticamente
                    </button>
                  </form>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Tipo</th>
                        <th>Nombre</th>
                        <th>Precio</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((ticket) => (
                        <tr key={ticket.id}>
                          <td>{ticket.codigo}</td>
                          <td>{ticket.tipo}</td>
                          <td>{ticket.nombre}</td>
                          <td>${ticket.precio.toFixed(2)}</td>
                          <td>
                            <span className={`status-badge ${ticket.usado ? 'status-usado' : 'status-disponible'}`}>
                              {ticket.usado ? 'Usado' : 'Disponible'}
                            </span>
                          </td>
                          <td>{new Date(ticket.fecha_emision).toLocaleDateString('es-AR')}</td>
                          <td>
                            <button
                              onClick={() => downloadTicketPDF(ticket.codigo)}
                              className="btn btn-primary btn-sm"
                            >
                              Descargar PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

