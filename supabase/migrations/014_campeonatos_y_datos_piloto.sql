-- Subdivisión de competencias (Enduro vs Travesías/Safari) y datos adicionales del piloto

-- Campeonato: enduro (Campeonato Sanjuanino de Enduro) o travesias (Travesías/Safari)
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS tipo_campeonato TEXT;

-- Categoría cuando tipo_campeonato = 'enduro' (Senior A, Junior A, etc.)
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS categoria_enduro TEXT;

-- Categoría moto en Travesías (110 cc semi, 110 cc libre, etc.)
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS categoria_travesia_moto TEXT;

-- Datos adicionales del formulario
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS edad INTEGER;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS nacionalidad TEXT;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS provincia TEXT;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS departamento TEXT;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS domicilio TEXT;
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS telefono_acompanante TEXT;
-- ¿Tiene licencia? sí/no (el campo licencia existente puede ser número de licencia)
ALTER TABLE pilots ADD COLUMN IF NOT EXISTS tiene_licencia BOOLEAN;
