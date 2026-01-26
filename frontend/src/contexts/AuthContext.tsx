import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

// Configurar base URL para producción
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API_BASE_URL;

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          // Validar que el token sigue siendo válido haciendo una petición al servidor
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Intentar verificar el token con una petición simple
          // Si el token es válido, restaurar la sesión
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          console.log('✅ Sesión restaurada desde localStorage');
        } catch (error) {
          // Si el token no es válido, limpiar el localStorage
          console.log('⚠️ Token inválido, limpiando sesión');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
    };
    
    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Usar el endpoint del backend que maneja la autenticación con Supabase
      // BaseURL ya es /api, así que aquí solo usamos la ruta relativa
      const response = await axios.post('/auth/login', { email, password });
      const { token: newToken, user: newUser } = response.data;
      
      setToken(newToken);
      setUser(newUser);
      
      // Guardar en localStorage para persistir la sesión
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      // Configurar el header de autorización para todas las peticiones
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      console.log('✅ Sesión iniciada y guardada en localStorage');
    } catch (error: any) {
      let msg: any = error?.response?.data?.error || 'Error al iniciar sesión';
      if (typeof msg === 'object') {
        msg = msg.message || JSON.stringify(msg);
      }
      throw new Error(String(msg));
    }
  };

  const logout = () => {
    console.log('🚪 Cerrando sesión...');
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    console.log('✅ Sesión cerrada');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
