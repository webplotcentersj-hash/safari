-- Solicitudes de ticket (público: sube comprobante; admin aprueba y se genera el ticket)
CREATE TABLE IF NOT EXISTS ticket_solicitudes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  comprobante_pago_url TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  ticket_id UUID REFERENCES tickets(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ticket_solicitudes_estado ON ticket_solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_ticket_solicitudes_email ON ticket_solicitudes(email);
CREATE INDEX IF NOT EXISTS idx_ticket_solicitudes_created_at ON ticket_solicitudes(created_at DESC);

ALTER TABLE ticket_solicitudes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ticket_solicitudes"
  ON ticket_solicitudes FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can select own by email (for status check)"
  ON ticket_solicitudes FOR SELECT USING (true);

CREATE POLICY "Admins can view and update ticket_solicitudes"
  ON ticket_solicitudes FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.email = auth.jwt()->>'email' AND u.role = 'admin')
  );
