# Migraciones de Supabase

Este directorio contiene las migraciones SQL para configurar la base de datos en Supabase.

## Instrucciones

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a SQL Editor
3. Ejecuta el contenido de `001_initial_schema.sql`
4. Esto creará todas las tablas, índices y políticas RLS necesarias

## Crear usuario administrador

Después de ejecutar las migraciones, crea un usuario administrador:

1. Ve a Authentication > Users en Supabase Dashboard
2. Crea un nuevo usuario con email y contraseña
3. El usuario se creará automáticamente en la tabla `users` con rol 'admin' gracias al trigger

O puedes crear el usuario manualmente ejecutando:

```sql
-- Primero crea el usuario en auth.users (esto se hace desde el dashboard o API)
-- Luego actualiza su rol si es necesario:
UPDATE users SET role = 'admin' WHERE email = 'tu_email@ejemplo.com';
```

## Variables de entorno necesarias

Asegúrate de configurar estas variables en tu archivo `.env` del backend:

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

Puedes encontrar estas claves en:
- Supabase Dashboard > Settings > API









