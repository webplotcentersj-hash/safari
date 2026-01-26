# Configuración de Supabase - Safari Tras las Sierras

## Información del Proyecto

- **URL del Proyecto**: `https://ywojgfgrekeulalkxlex.supabase.co`
- **Proyecto ID**: `ywojgfgrekeulalkxlex`

## Credenciales Configuradas

### Anon Key (Pública - Frontend)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b2pnZmdyZWtldWxhbGt4bGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDcwNzQsImV4cCI6MjA4NDQyMzA3NH0.Es0qPlBihbrJ_t7m9FVIL_kR43Q2gZCCCuF_bO6eEmo
```

### Publishable Key (Recomendada - Frontend)
```
sb_publishable_zNPkIRUYVXjMYsHeryjIoQ_k9pP6sBk
```

### Service Role Key (Backend - Requerida)

⚠️ **IMPORTANTE**: La Service Role Key no se muestra aquí por seguridad. Para obtenerla:

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Settings** > **API**
3. Busca la sección **Project API keys**
4. Copia la **`service_role`** key (⚠️ **NUNCA** la expongas en el frontend)

## Variables de Entorno

### Backend (`backend/.env`)
```env
PORT=3001
SUPABASE_URL=https://ywojgfgrekeulalkxlex.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b2pnZmdyZWtldWxhbGt4bGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDcwNzQsImV4cCI6MjA4NDQyMzA3NH0.Es0qPlBihbrJ_t7m9FVIL_kR43Q2gZCCCuF_bO6eEmo
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY_AQUI
```

### Frontend (`frontend/.env`)
```env
VITE_SUPABASE_URL=https://ywojgfgrekeulalkxlex.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b2pnZmdyZWtldWxhbGt4bGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDcwNzQsImV4cCI6MjA4NDQyMzA3NH0.Es0qPlBihbrJ_t7m9FVIL_kR43Q2gZCCCuF_bO6eEmo
VITE_API_URL=/api
```

### Vercel (Environment Variables)

Configura estas variables en tu proyecto de Vercel:

```
SUPABASE_URL=https://ywojgfgrekeulalkxlex.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b2pnZmdyZWtldWxhbGt4bGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDcwNzQsImV4cCI6MjA4NDQyMzA3NH0.Es0qPlBihbrJ_t7m9FVIL_kR43Q2gZCCCuF_bO6eEmo
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY_AQUI
```

## Estado de la Base de Datos

✅ **Migraciones aplicadas**: `001_initial_schema`

### Tablas Creadas

- ✅ `users` - Usuarios administradores (vinculada con auth.users)
- ✅ `pilots` - Inscripciones de pilotos
- ✅ `tickets` - Tickets de entrada

### Características

- ✅ Row Level Security (RLS) habilitado
- ✅ Políticas de seguridad configuradas
- ✅ Índices creados para optimización
- ✅ Trigger automático para crear usuarios admin

## Próximos Pasos

1. **Obtener Service Role Key** desde Supabase Dashboard
2. **Crear usuario administrador** en Authentication > Users
3. **Configurar variables de entorno** en backend y frontend
4. **Probar la aplicación** localmente
5. **Desplegar en Vercel** con las variables configuradas

## Notas de Seguridad

- ⚠️ **NUNCA** expongas la `service_role` key en el frontend
- ✅ Usa la `anon` key o `publishable` key en el frontend
- ✅ La `service_role` key solo debe usarse en el backend
- ✅ Mantén las claves seguras y no las subas a Git









