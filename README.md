# Safari Tras las Sierras

Aplicación web para la gestión del Safari Tras las Sierras - Rally en Valle Fértil, San Juan.

## Funcionalidades

- **Panel de Administración**: Gestión completa de inscripciones y tickets
- **Formulario de Inscripción**: Los pilotos pueden inscribirse en la competencia
- **Generación de Tickets**: Sistema para generar y descargar tickets de entrada en PDF

## Tecnologías

### Backend
- Node.js + Express
- TypeScript
- Supabase (PostgreSQL + Auth)
- PDFKit (generación de PDFs)

### Frontend
- React + TypeScript
- Vite
- React Router
- React Hook Form
- Supabase Client

## Instalación

1. Instalar dependencias de todos los módulos:
```bash
npm run install:all
```

2. Configurar Supabase:
   - Crea un proyecto en [Supabase](https://supabase.com)
   - Ejecuta las migraciones SQL desde `supabase/migrations/001_initial_schema.sql` en el SQL Editor de Supabase
   - Crea un usuario administrador desde Authentication > Users

3. Configurar variables de entorno:

Backend (`backend/.env`):
```bash
cd backend
cp env.example .env
```

Editar `backend/.env`:
```
PORT=3001
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

Frontend (`frontend/.env`):
```bash
cd frontend
cp .env.example .env
```

Editar `frontend/.env`:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

## Ejecución

### Desarrollo
Ejecutar frontend y backend simultáneamente:
```bash
npm run dev
```

O por separado:
```bash
# Backend
npm run dev:backend

# Frontend (en otra terminal)
npm run dev:frontend
```

### Producción
```bash
# Construir frontend
npm run build

# Iniciar backend
npm start
```

## Acceso

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Panel de Administración**: http://localhost:3000/admin/login

### Credenciales
- Usa el email y contraseña del usuario administrador que creaste en Supabase Authentication

## Estructura del Proyecto

```
safari-tras-las-sierras/
├── backend/
│   ├── src/
│   │   ├── database/      # Configuración de base de datos
│   │   ├── middleware/    # Middleware de autenticación
│   │   ├── routes/        # Rutas de la API
│   │   ├── utils/         # Utilidades (generador de PDFs)
│   │   └── index.ts       # Punto de entrada
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── contexts/      # Context API (Auth)
│   │   ├── pages/         # Páginas principales
│   │   └── App.tsx        # Componente principal
│   └── package.json
└── package.json
```

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión

### Pilotos
- `POST /api/pilots/register` - Inscribir piloto
- `GET /api/pilots/check/:dni` - Verificar inscripción por DNI

### Tickets
- `POST /api/tickets/generate` - Generar ticket (retorna PDF)
- `GET /api/tickets/verify/:codigo` - Verificar ticket
- `PATCH /api/tickets/use/:codigo` - Marcar ticket como usado

### Administración (requiere autenticación)
- `GET /api/admin/pilots` - Listar todos los pilotos
- `GET /api/admin/pilots/:id` - Obtener piloto por ID
- `PATCH /api/admin/pilots/:id/status` - Actualizar estado del piloto
- `DELETE /api/admin/pilots/:id` - Eliminar piloto
- `GET /api/admin/tickets` - Listar todos los tickets
- `GET /api/admin/stats` - Obtener estadísticas
- `GET /api/admin/tickets/:codigo/pdf` - Descargar PDF del ticket

## Base de Datos

La aplicación utiliza Supabase (PostgreSQL) con las siguientes tablas:
- `users` - Usuarios administradores (vinculada con auth.users)
- `pilots` - Inscripciones de pilotos
- `tickets` - Tickets de entrada

Las tablas se crean ejecutando las migraciones SQL en Supabase SQL Editor (ver `supabase/migrations/001_initial_schema.sql`).

### Row Level Security (RLS)

Las políticas RLS están configuradas para:
- Permitir que cualquiera pueda inscribir pilotos y generar tickets
- Restringir el acceso al panel de administración solo a usuarios con rol 'admin'

## Licencia

ISC

