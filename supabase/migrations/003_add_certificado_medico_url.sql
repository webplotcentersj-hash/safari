-- Agregar campo para certificado médico en pilots (requerido por el formulario)
ALTER TABLE pilots
ADD COLUMN IF NOT EXISTS certificado_medico_url TEXT;

-- Índice opcional para búsquedas por URL (no crítico, pero útil en admin)
CREATE INDEX IF NOT EXISTS idx_pilots_certificado_medico_url
  ON pilots(certificado_medico_url)
  WHERE certificado_medico_url IS NOT NULL;



