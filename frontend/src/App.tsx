import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import PilotRegistration from './pages/PilotRegistration';
import PilotsList from './pages/PilotsList';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminScan from './pages/AdminScan';
import AdminApprove from './pages/AdminApprove';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/inscripcion" element={<PilotRegistration />} />
        <Route path="/pilotos" element={<PilotsList />} />
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
  );
}

export default App;

