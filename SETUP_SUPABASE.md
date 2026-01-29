# Guía de Configuración con Supabase

Esta guía te ayudará a configurar la aplicación con Supabase paso a paso.

## 1. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta (si no tienes una)
2. Crea un nuevo proyecto
3. Espera a que se complete la configuración (puede tomar unos minutos)

## 2. Ejecutar Migraciones SQL

1. En el Dashboard de Supabase, ve a **SQL Editor**
2. Haz clic en **New Query**
3. Copia y pega el contenido completo del archivo `supabase/migrations/001_initial_schema.sql`
4. Haz clic en **Run** o presiona `Ctrl+Enter`
5. Verifica que no haya errores

## 3. Crear Usuario Administrador

### Opción A: Desde el Dashboard

1. Ve a **Authentication** > **Users** en Supabase Dashboard
2. Haz clic en **Add User** > **Create New User**
3. Completa:
   - Email: tu email de administrador
   - Password: una contraseña segura
   - Auto Confirm User: ✅ (marcar)
4. Haz clic en **Create User**

El usuario se creará automáticamente en la tabla `users` con rol 'admin' gracias al trigger configurado.

### Opción B: Verificar/Actualizar Rol Manualmente

Si necesitas cambiar el rol de un usuario existente:

```sql
UPDATE users SET role = 'admin' WHERE email = 'tu_email@ejemplo.com';
```

## 4. Obtener las Claves de API

1. Ve a **Settings** > **API** en Supabase Dashboard
2. Copia los siguientes valores:
   - **Project URL** (será tu `SUPABASE_URL`)
   - **anon public** key (será tu `SUPABASE_ANON_KEY`)
   - **service_role** key (será tu `SUPABASE_SERVICE_ROLE_KEY`)

⚠️ **IMPORTANTE**: La `service_role` key es muy sensible. Nunca la expongas en el frontend.

## 5. Configurar Variables de Entorno

### Backend

Crea el archivo `backend/.env`:

```bash
cd backend
cp env.example .env
```

Edita `backend/.env` con tus valores:

```env
PORT=3001
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Frontend

Crea el archivo `frontend/.env`:

```bash
cd frontend
cp env.example .env
```

Edita `frontend/.env` con tus valores:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 6. Instalar Dependencias

```bash
npm run install:all
```

## 7. Ejecutar la Aplicación

```bash
npm run dev
```

## 8. Probar la Aplicación

1. **Frontend**: http://localhost:3000
2. **Panel Admin**: http://localhost:3000/admin/login
   - Usa el email y contraseña del usuario administrador que creaste

## Verificación

Para verificar que todo funciona:

1. Intenta iniciar sesión en el panel de administración
2. Intenta inscribir un piloto desde la página principal
3. Intenta generar un ticket

## Troubleshooting

### Error: "Tables not found"
- Asegúrate de haber ejecutado las migraciones SQL en Supabase SQL Editor

### Error: "Usuario no encontrado en la base de datos"
- Verifica que el usuario existe en Authentication > Users
- Verifica que existe en la tabla `users` ejecutando: `SELECT * FROM users;` en SQL Editor

### Error: "Missing Supabase environment variables"
- Verifica que los archivos `.env` existen y tienen las variables correctas
- Reinicia el servidor después de crear/modificar `.env`

### Error de autenticación
- Verifica que las claves de API son correctas
- Asegúrate de usar la `service_role` key solo en el backend
- Asegúrate de usar la `anon` key en el frontend

## Estructura de Base de Datos

Después de ejecutar las migraciones, tendrás:

- **users**: Usuarios administradores (vinculada con auth.users)
- **pilots**: Inscripciones de pilotos
- **tickets**: Tickets de entrada

Todas las tablas tienen Row Level Security (RLS) habilitado con políticas apropiadas.










