-- Bucket para comprobantes de pago (solicitudes de ticket)
-- Si el bucket ya existe (p. ej. creado a mano), ON CONFLICT evita error
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes-pago', 'comprobantes-pago', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública para que admin pueda ver el comprobante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read comprobantes-pago'
  ) THEN
    CREATE POLICY "Public read comprobantes-pago"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'comprobantes-pago');
  END IF;
END $$;

-- Subida: el API usa service role; por si acaso, permitir INSERT desde el API
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public upload comprobantes-pago'
  ) THEN
    CREATE POLICY "Public upload comprobantes-pago"
      ON storage.objects FOR INSERT TO public
      WITH CHECK (bucket_id = 'comprobantes-pago');
  END IF;
END $$;
