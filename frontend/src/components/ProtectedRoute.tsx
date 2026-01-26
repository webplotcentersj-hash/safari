import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  // Si no está autenticado, redirigir al login
  // Pero mantener la URL actual en el query string para volver después del login
  if (!isAuthenticated) {
    const currentPath = window.location.pathname + window.location.search;
    return <Navigate to={`/admin/login?returnUrl=${encodeURIComponent(currentPath)}`} replace />;
  }

  // Si está autenticado, mostrar el contenido
  return <>{children}</>;
}









