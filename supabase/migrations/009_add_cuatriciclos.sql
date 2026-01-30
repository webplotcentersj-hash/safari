-- Agregar soporte para categoría Cuatriciclos (Cuatri)
ALTER TABLE pilots
ADD COLUMN IF NOT EXISTS categoria_cuatri TEXT;

-- Números únicos solo dentro de cuatriciclos (independiente de auto y moto)
CREATE UNIQUE INDEX IF NOT EXISTS pilots_numero_cuatri_unique
ON pilots(numero)
WHERE categoria = 'cuatri' AND numero IS NOT NULL;
