-- Bucket para comprobantes de pago (solicitudes de ticket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes-pago', 'comprobantes-pago', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública para que admin pueda ver el comprobante
CREATE POLICY "Public read comprobantes-pago"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'comprobantes-pago');

-- La subida se hace desde el API (service role), no desde el cliente
-- Opcional: permitir INSERT anónimo si prefieres subir desde el front con Supabase client
CREATE POLICY "Public upload comprobantes-pago"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'comprobantes-pago');
