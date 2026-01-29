import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isRestoring } = useAuth();

  // Si estamos restaurando la sesión, mostrar carga
  if (isRestoring) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Cargando…
      </div>
    );
  }

  // Si no está autenticado después de restaurar, redirigir al login
  // Pero mantener la URL actual en el query string para volver después del login
  if (!isAuthenticated) {
    const currentPath = window.location.pathname + window.location.search;
    return <Navigate to={`/admin/login?returnUrl=${encodeURIComponent(currentPath)}`} replace />;
  }

  // Si está autenticado, mostrar el contenido
  return <>{children}</>;
}









