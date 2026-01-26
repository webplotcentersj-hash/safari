# Ejecutar Migración 005 - Race Times

## Instrucciones para ejecutar la migración en Supabase

### Opción 1: Desde el Dashboard de Supabase (Recomendado)

1. **Accede al Dashboard de Supabase**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto: `ywojgfgrekeulalkxlex`

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en **SQL Editor**
   - Haz clic en **New Query**

3. **Copia y pega el siguiente SQL**:

```sql
-- Crear tabla para almacenar tiempos de carrera por piloto y categoría
CREATE TABLE IF NOT EXISTS race_times (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pilot_id UUID REFERENCES pilots(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  categoria_detalle TEXT, -- categoria_auto o categoria_moto específica
  tiempo_segundos DECIMAL(10, 3), -- Tiempo en segundos (permite milisegundos)
  tiempo_formato TEXT, -- Tiempo en formato legible (ej: "1:23.456")
  etapa TEXT, -- Opcional: etapa de la competencia
  fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_race_times_pilot_id ON race_times(pilot_id);
CREATE INDEX IF NOT EXISTS idx_race_times_categoria ON race_times(categoria);
CREATE INDEX IF NOT EXISTS idx_race_times_categoria_detalle ON race_times(categoria_detalle);
CREATE INDEX IF NOT EXISTS idx_race_times_tiempo ON race_times(tiempo_segundos);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_race_times_updated_at
  BEFORE UPDATE ON race_times
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE race_times ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver y modificar tiempos
CREATE POLICY "Admins can view all race times"
  ON race_times FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert race times"
  ON race_times FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update race times"
  ON race_times FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete race times"
  ON race_times FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

4. **Ejecuta la consulta**
   - Haz clic en **Run** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - Espera a que se complete la ejecución

5. **Verifica que se creó correctamente**
   - Ve a **Table Editor** en el menú lateral
   - Deberías ver la nueva tabla `race_times`

### Opción 2: Usando el archivo directamente

El archivo completo está en: `supabase/migrations/005_add_race_times.sql`

Puedes copiar su contenido completo y pegarlo en el SQL Editor de Supabase.

## Verificación

Después de ejecutar la migración, verifica que:

1. ✅ La tabla `race_times` existe en **Table Editor**
2. ✅ Los índices fueron creados correctamente
3. ✅ Las políticas RLS están activas
4. ✅ El trigger `update_race_times_updated_at` existe

## Notas

- La migración usa `IF NOT EXISTS` para evitar errores si ya existe
- Las políticas RLS solo permiten acceso a usuarios con rol 'admin'
- El trigger actualiza automáticamente `updated_at` cuando se modifica un registro

