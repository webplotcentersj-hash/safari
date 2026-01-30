-- Subclase Motos Chinas dentro de Moto
ALTER TABLE pilots
ADD COLUMN IF NOT EXISTS categoria_moto_china TEXT;
