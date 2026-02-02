-- Cantidad de tickets por solicitud (cliente puede pedir 1 o más)
ALTER TABLE ticket_solicitudes ADD COLUMN IF NOT EXISTS cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad >= 1);

-- Vincular cada ticket a la solicitud que lo generó (una solicitud puede tener muchos tickets)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS solicitud_id UUID REFERENCES ticket_solicitudes(id);

CREATE INDEX IF NOT EXISTS idx_tickets_solicitud_id ON tickets(solicitud_id);
