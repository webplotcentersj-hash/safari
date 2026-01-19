import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Configurar base URL para producción
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API_BASE_URL;
import './AdminDashboard.css';

interface Pilot {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  estado: string;
  created_at: string;
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

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pilots') {
        const response = await axios.get('/api/admin/pilots');
        setPilots(response.data);
      } else if (activeTab === 'tickets') {
        const response = await axios.get('/api/admin/tickets');
        setTickets(response.data);
      } else {
        const response = await axios.get('/api/admin/stats');
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePilotStatus = async (id: number, estado: string) => {
    try {
      await axios.patch(`/api/admin/pilots/${id}/status`, { estado });
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
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
      const response = await axios.get(`/api/admin/tickets/${codigo}/pdf`, {
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
          <h1>Panel de Administración</h1>
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
            {activeTab === 'stats' && stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Pilotos</h3>
                  <div className="stat-value">{stats.pilots.total}</div>
                  <div className="stat-details">
                    <span className="stat-approved">Aprobados: {stats.pilots.approved}</span>
                    <span className="stat-pending">Pendientes: {stats.pilots.pending}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <h3>Tickets</h3>
                  <div className="stat-value">{stats.tickets.total}</div>
                  <div className="stat-details">
                    <span className="stat-used">Usados: {stats.tickets.used}</span>
                    <span className="stat-available">Disponibles: {stats.tickets.available}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <h3>Ingresos</h3>
                  <div className="stat-value">${stats.revenue.toFixed(2)}</div>
                </div>
              </div>
            )}

            {activeTab === 'pilots' && (
              <div className="admin-content">
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Apellido</th>
                        <th>DNI</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pilots.map((pilot) => (
                        <tr key={pilot.id}>
                          <td>{pilot.nombre}</td>
                          <td>{pilot.apellido}</td>
                          <td>{pilot.dni}</td>
                          <td>{pilot.email}</td>
                          <td>{pilot.telefono}</td>
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

