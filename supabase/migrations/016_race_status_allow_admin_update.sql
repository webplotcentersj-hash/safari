-- Permitir que usuarios admin (JWT) actualicen e inserten en race_status
-- así funciona aunque SUPABASE_SERVICE_ROLE_KEY no esté en Vercel

DROP POLICY IF EXISTS "Only service role can update race_status" ON race_status;
DROP POLICY IF EXISTS "Only service role can insert race_status" ON race_status;

CREATE POLICY "Admins can update race_status"
  ON race_status FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can insert race_status"
  ON race_status FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
