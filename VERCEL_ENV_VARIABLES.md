# Variables de Entorno para Vercel

## Variables a Configurar en Vercel

Copia y pega estas variables en tu proyecto de Vercel:

### 1. SUPABASE_URL
```
https://ywojgfgrekeulalkxlex.supabase.co
```

### 2. SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b2pnZmdyZWtldWxhbGt4bGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDcwNzQsImV4cCI6MjA4NDQyMzA3NH0.Es0qPlBihbrJ_t7m9FVIL_kR43Q2gZCCCuF_bO6eEmo
```

### 3. SUPABASE_SERVICE_ROLE_KEY
⚠️ **OBTENER DESDE SUPABASE DASHBOARD**
- Ve a: https://supabase.com/dashboard
- Selecciona tu proyecto
- Settings > API
- Copia la `service_role` key

---

## Cómo Configurar en Vercel

### Opción 1: Desde el Dashboard de Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona el proyecto **safari** (o el nombre que le hayas dado)
3. Ve a **Settings** > **Environment Variables**
4. Agrega cada variable:

   **Variable 1:**
   - Key: `SUPABASE_URL`
   - Value: `https://ywojgfgrekeulalkxlex.supabase.co`
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Click **Save**

   **Variable 2:**
   - Key: `SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b2pnZmdyZWtldWxhbGt4bGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDcwNzQsImV4cCI6MjA4NDQyMzA3NH0.Es0qPlBihbrJ_t7m9FVIL_kR43Q2gZCCCuF_bO6eEmo`
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Click **Save**

   **Variable 3:**
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `[PEGAR_AQUI_LA_SERVICE_ROLE_KEY_DE_SUPABASE]`
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Click **Save**

5. Después de agregar todas las variables, **redespliega** tu aplicación:
   - Ve a **Deployments**
   - Click en los tres puntos (...) del último deployment
   - Selecciona **Redeploy**

### Opción 2: Desde Vercel CLI

```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Iniciar sesión
vercel login

# Configurar variables
vercel env add SUPABASE_URL
# Pega: https://ywojgfgrekeulalkxlex.supabase.co
# Selecciona: Production, Preview, Development

vercel env add SUPABASE_ANON_KEY
# Pega: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b2pnZmdyZWtldWxhbGt4bGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDcwNzQsImV4cCI6MjA4NDQyMzA3NH0.Es0qPlBihbrJ_t7m9FVIL_kR43Q2gZCCCuF_bO6eEmo
# Selecciona: Production, Preview, Development

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Pega tu service_role key de Supabase
# Selecciona: Production, Preview, Development

# Redesplegar
vercel --prod
```

---

## Resumen Rápido

| Variable | Valor |
|----------|-------|
| `SUPABASE_URL` | `https://ywojgfgrekeulalkxlex.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b2pnZmdyZWtldWxhbGt4bGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDcwNzQsImV4cCI6MjA4NDQyMzA3NH0.Es0qPlBihbrJ_t7m9FVIL_kR43Q2gZCCCuF_bO6eEmo` |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Obtener desde Supabase Dashboard |

---

## Verificación

Después de configurar las variables:

1. Verifica que todas las variables estén en **Settings** > **Environment Variables**
2. Redespliega la aplicación
3. Verifica los logs del deployment para asegurarte de que no hay errores
4. Prueba la aplicación en la URL de Vercel

---

## Nota Importante

⚠️ La `SUPABASE_SERVICE_ROLE_KEY` es muy sensible. Asegúrate de:
- ✅ Solo usarla en el backend (Vercel Serverless Functions)
- ❌ NUNCA exponerla en el frontend
- ✅ Mantenerla segura y no compartirla públicamente

