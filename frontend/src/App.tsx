import { Component, ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import PilotRegistration from './pages/PilotRegistration';
import PilotsList from './pages/PilotsList';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminScan from './pages/AdminScan';
import AdminApprove from './pages/AdminApprove';
import SolicitudTicket from './pages/SolicitudTicket';
import VerificarTicket from './pages/VerificarTicket';
import TiemposCarrera from './pages/TiemposCarrera';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error('ErrorBoundary:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center', color: '#333' }}>
          <p>Algo salió mal al cargar la aplicación.</p>
          <p><a href="/">Volver al inicio</a></p>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/inscripcion" element={<PilotRegistration />} />
        <Route path="/inscripcion/auto" element={<PilotRegistration />} />
        <Route path="/inscripcion/moto" element={<PilotRegistration />} />
        <Route path="/pilotos" element={<PilotsList />} />
        <Route path="/solicitar-ticket" element={<SolicitudTicket />} />
        <Route path="/verificar" element={<VerificarTicket />} />
        <Route path="/verificar/:codigo" element={<VerificarTicket />} />
        <Route path="/tiempos" element={<TiemposCarrera />} />
        <Route path="/prensa" element={<Prensa />} />
        <Route path="/tickets" element={<Navigate to="/admin" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/scan"
          element={
            <ProtectedRoute>
              <AdminScan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/approve/:id"
          element={
            <ProtectedRoute>
              <AdminApprove />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

