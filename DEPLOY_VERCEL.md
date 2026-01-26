# Guía de Despliegue en Vercel

Esta guía te ayudará a desplegar la aplicación Safari Tras las Sierras en Vercel.

## Prerrequisitos

1. Cuenta en [Vercel](https://vercel.com)
2. Proyecto configurado en Supabase (ver `SETUP_SUPABASE.md`)
3. Git repository (GitHub, GitLab, o Bitbucket)

## Opción 1: Despliegue desde GitHub (Recomendado)

### 1. Subir el código a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/safari-tras-las-sierras.git
git push -u origin main
```

### 2. Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Haz clic en **Add New Project**
3. Importa tu repositorio de GitHub
4. Vercel detectará automáticamente la configuración

### 3. Configurar Variables de Entorno

En la configuración del proyecto en Vercel, agrega estas variables de entorno:

**Environment Variables:**

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**Para el Frontend (opcional, si necesitas acceso directo):**

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
VITE_API_URL=/api
```

### 4. Configurar Build Settings

Vercel debería detectar automáticamente:
- **Framework Preset**: Vite
- **Build Command**: `cd frontend && npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `npm run install:all`

Si no se detecta automáticamente, configúralo manualmente.

### 5. Desplegar

1. Haz clic en **Deploy**
2. Espera a que se complete el despliegue
3. Tu aplicación estará disponible en `https://tu-proyecto.vercel.app`

## Opción 2: Despliegue con Vercel CLI

### 1. Instalar Vercel CLI

```bash
npm i -g vercel
```

### 2. Iniciar sesión

```bash
vercel login
```

### 3. Desplegar

```bash
vercel
```

Sigue las instrucciones en pantalla. La primera vez te pedirá:
- ¿Set up and deploy? **Yes**
- ¿Which scope? Selecciona tu cuenta
- ¿Link to existing project? **No**
- ¿What's your project's name? `safari-tras-las-sierras`
- ¿In which directory is your code located? **./** (raíz)

### 4. Configurar Variables de Entorno

```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

Ingresa los valores cuando se te solicite.

### 5. Desplegar a Producción

```bash
vercel --prod
```

## Estructura del Proyecto en Vercel

```
/
├── api/                    # Serverless Functions
│   ├── _utils/            # Utilidades compartidas
│   ├── admin/             # Rutas de administración
│   ├── auth/              # Autenticación
│   ├── pilots/            # Gestión de pilotos
│   └── tickets/           # Gestión de tickets
├── frontend/              # Aplicación React
│   ├── src/
│   └── dist/             # Build output (generado)
└── vercel.json           # Configuración de Vercel
```

## Rutas de la API

Todas las rutas de la API están disponibles en `/api/*`:

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/pilots/register` - Inscribir piloto
- `GET /api/pilots/check/[dni]` - Verificar inscripción
- `POST /api/tickets/generate` - Generar ticket
- `GET /api/tickets/verify/[codigo]` - Verificar ticket
- `PATCH /api/tickets/use/[codigo]` - Marcar ticket como usado
- `GET /api/admin/pilots` - Listar pilotos (requiere auth)
- `GET /api/admin/stats` - Estadísticas (requiere auth)
- etc.

## Verificación Post-Despliegue

1. **Health Check**: Visita `https://tu-proyecto.vercel.app/api/health`
   - Deberías ver: `{"status":"ok","message":"Safari API is running"}`

2. **Frontend**: Visita `https://tu-proyecto.vercel.app`
   - Deberías ver la página principal

3. **Probar Inscripción**: Intenta inscribir un piloto de prueba

4. **Probar Login**: Inicia sesión con tus credenciales de administrador

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Verifica que todas las variables de entorno estén configuradas en Vercel
- Asegúrate de que los valores sean correctos (sin espacios extra)

### Error: "Function timeout"
- Las funciones serverless tienen un límite de tiempo
- Verifica que las consultas a Supabase no sean demasiado lentas
- Considera optimizar las consultas o usar índices

### Error: "Module not found"
- Asegúrate de que `api/package.json` tenga todas las dependencias necesarias
- Vercel instala dependencias automáticamente, pero verifica que estén en `package.json`

### Error 404 en rutas de API
- Verifica que la estructura de carpetas en `api/` coincida con las rutas
- Las rutas dinámicas deben estar en carpetas con `[parametro]`

### Frontend no carga
- Verifica que el build del frontend se complete correctamente
- Revisa los logs de build en Vercel Dashboard
- Asegúrate de que `frontend/dist` contenga los archivos generados

## Actualizaciones Futuras

Cada vez que hagas `git push` a la rama principal, Vercel desplegará automáticamente una nueva versión.

Para desplegar manualmente:
```bash
vercel --prod
```

## Dominio Personalizado

1. Ve a tu proyecto en Vercel Dashboard
2. Settings > Domains
3. Agrega tu dominio personalizado
4. Sigue las instrucciones para configurar DNS

## Monitoreo y Logs

- **Logs en tiempo real**: Vercel Dashboard > Deployments > [tu deployment] > Functions
- **Métricas**: Vercel Dashboard > Analytics
- **Errores**: Vercel Dashboard > Logs

## Costos

Vercel tiene un plan gratuito generoso que incluye:
- 100GB bandwidth/mes
- 100 horas de funciones serverless/mes
- Deployments ilimitados

Para proyectos más grandes, considera el plan Pro.









