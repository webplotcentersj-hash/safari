-- Agregar campos faltantes a la tabla pilots
ALTER TABLE pilots 
ADD COLUMN IF NOT EXISTS numero INTEGER,
ADD COLUMN IF NOT EXISTS categoria_auto TEXT,
ADD COLUMN IF NOT EXISTS categoria_moto TEXT,
ADD COLUMN IF NOT EXISTS comprobante_pago_url TEXT;

-- Crear constraint única para número de autos (números únicos solo dentro de autos)
CREATE UNIQUE INDEX IF NOT EXISTS pilots_numero_auto_unique 
ON pilots(numero) 
WHERE categoria = 'auto' AND numero IS NOT NULL;

-- Crear constraint única para número de motos (números únicos solo dentro de motos)
-- Las motos tienen su propia numeración independiente de los autos
CREATE UNIQUE INDEX IF NOT EXISTS pilots_numero_moto_unique 
ON pilots(numero) 
WHERE categoria = 'moto' AND numero IS NOT NULL;

-- Crear índice para mejorar búsquedas por número
CREATE INDEX IF NOT EXISTS idx_pilots_numero ON pilots(numero) WHERE numero IS NOT NULL;

-- Crear índice para mejorar búsquedas por categoría
CREATE INDEX IF NOT EXISTS idx_pilots_categoria ON pilots(categoria) WHERE categoria IS NOT NULL;

