-- Estado de la carrera para la pantalla pública: semáforo y mensaje de parada
CREATE TABLE IF NOT EXISTS race_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  semaphore TEXT NOT NULL DEFAULT 'green' CHECK (semaphore IN ('green', 'red')),
  stop_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Una sola fila de configuración (singleton)
INSERT INTO race_status (id, semaphore, stop_message)
SELECT gen_random_uuid(), 'green', NULL
WHERE NOT EXISTS (SELECT 1 FROM race_status LIMIT 1);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_race_status_updated_at
  BEFORE UPDATE ON race_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: la tabla puede ser leída por cualquiera vía API (backend usa service role).
-- Solo admins pueden actualizar (se hace desde el backend con token admin).
ALTER TABLE race_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for anon (public display)"
  ON race_status FOR SELECT
  USING (true);

CREATE POLICY "Only service role can update race_status"
  ON race_status FOR UPDATE
  USING (false);

CREATE POLICY "Only service role can insert race_status"
  ON race_status FOR INSERT
  WITH CHECK (false);
