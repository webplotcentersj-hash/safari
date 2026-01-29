-- Crear tabla de usuarios (vinculada con auth.users de Supabase)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear tabla de pilotos
CREATE TABLE IF NOT EXISTS pilots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  licencia TEXT,
  vehiculo_marca TEXT,
  vehiculo_modelo TEXT,
  vehiculo_patente TEXT,
  copiloto_nombre TEXT,
  copiloto_dni TEXT,
  categoria TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear tabla de tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  tipo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT,
  email TEXT,
  precio DECIMAL(10, 2) NOT NULL,
  fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  usado BOOLEAN DEFAULT FALSE NOT NULL
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pilots_dni ON pilots(dni);
CREATE INDEX IF NOT EXISTS idx_pilots_estado ON pilots(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_codigo ON tickets(codigo);
CREATE INDEX IF NOT EXISTS idx_tickets_usado ON tickets(usado);
CREATE INDEX IF NOT EXISTS idx_pilots_created_at ON pilots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_fecha_emision ON tickets(fecha_emision DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para users (solo admins pueden ver)
CREATE POLICY "Users are viewable by admins only"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Políticas RLS para pilots (público puede insertar, admin puede ver todo)
CREATE POLICY "Anyone can insert pilots"
  ON pilots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all pilots"
  ON pilots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update pilots"
  ON pilots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete pilots"
  ON pilots FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Políticas RLS para tickets (público puede insertar y verificar, admin puede ver todo)
CREATE POLICY "Anyone can insert tickets"
  ON tickets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can verify tickets"
  ON tickets FOR SELECT
  USING (true);

CREATE POLICY "Admins can view all tickets"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Anyone can update tickets (for marking as used)"
  ON tickets FOR UPDATE
  USING (true);

-- Función para crear usuario admin automáticamente cuando se crea en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear usuario en tabla users cuando se registra en auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();










