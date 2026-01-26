-- Policies de Storage para permitir subir y leer certificados médicos
-- Nota: esto afecta a storage.objects (Supabase Storage)

-- Permitir lectura pública de archivos del bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read certificados-medicos'
  ) THEN
    CREATE POLICY "Public read certificados-medicos"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'certificados-medicos');
  END IF;
END $$;

-- Permitir subida pública (INSERT) al bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public upload certificados-medicos'
  ) THEN
    CREATE POLICY "Public upload certificados-medicos"
      ON storage.objects
      FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'certificados-medicos');
  END IF;
END $$;



