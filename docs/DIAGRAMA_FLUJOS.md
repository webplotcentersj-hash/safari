# Diagramas de flujo — Safari Tras las Sierras

Se pueden visualizar en [Mermaid Live](https://mermaid.live) o en cualquier visor que soporte Mermaid (GitHub, Notion, etc.).

---

## 1. Vista general del sistema

```mermaid
flowchart TB
    subgraph Publico["Páginas públicas"]
        Home["Inicio"]
        Inscripcion["Inscripción piloto"]
        Pilotos["Listado pilotos"]
        SolicitarTicket["Solicitar ticket"]
        VerificarTicket["Verificar ticket"]
        Tiempos["Tiempos en vivo"]
    end

    subgraph Admin["Panel administración"]
        Login["Login admin"]
        Dashboard["Dashboard"]
        GestionPilotos["Gestión pilotos"]
        PantallaPublica["Pantalla pública"]
        TiemposCarrera["Tiempos carrera"]
        SolicitudesTicket["Solicitudes ticket"]
    end

    subgraph Datos["Base de datos / estado"]
        DB[(Supabase)]
    end

    Home --> Inscripcion
    Home --> Pilotos
    Home --> SolicitarTicket
    Home --> VerificarTicket
    Home --> Tiempos
    Home --> Login

    Inscripcion --> DB
    Pilotos --> DB
    SolicitarTicket --> DB
    VerificarTicket --> DB
    Tiempos --> DB

    Login --> Dashboard
    Dashboard --> GestionPilotos
    Dashboard --> PantallaPublica
    Dashboard --> TiemposCarrera
    Dashboard --> SolicitudesTicket

    GestionPilotos --> DB
    PantallaPublica --> DB
    TiemposCarrera --> DB
    SolicitudesTicket --> DB
```

---

## 2. Flujo de inscripción del piloto

```mermaid
flowchart TD
    A([Usuario entra a Inscripción]) --> B{Elige tipo}
    B -->|Auto| C[Formulario auto]
    B -->|Moto| D[Formulario moto]

    C --> E[Completa datos personales, vehículo, categoría]
    D --> E

    E --> F[Elige número de competencia]
    F --> G[Sube comprobante de pago y certificado médico]
    G --> H[Envía formulario]

    H --> I{Registro OK?}
    I -->|No| J[Muestra error]
    J --> E
    I -->|Sí| K[Genera QR y tarjeta del piloto]
    K --> L[Piloto puede descargar tarjeta / copiar QR]
    L --> M([Estado: pendiente en sistema])
    M --> N[Admin revisa y aprueba o rechaza]
```

---

## 3. Flujo de solicitud y verificación de ticket

```mermaid
flowchart TD
    subgraph Solicitud["Ciudadano"]
        A([Entra a Solicitar ticket]) --> B[Completa datos y cantidad]
        B --> C[Envía solicitud]
        C --> D[Recibe confirmación]
        D --> E([Espera aprobación])
    end

    subgraph AdminTickets["Administración"]
        E --> F[Admin ve solicitud en panel]
        F --> G{Decisión}
        G -->|Aprobar| H[Genera tickets]
        G -->|Rechazar| I[Rechaza solicitud]
        H --> J[Ciudadano recibe tickets / códigos]
    end

    subgraph Verificacion["Día del evento"]
        K([Alguien entra a Verificar ticket]) --> L[Ingresa código del ticket]
        L --> M{Ticket válido y no usado?}
        M -->|Sí| N[Muestra válido / puede marcar uso]
        M -->|No| O[Muestra inválido o ya usado]
    end
```

---

## 4. Flujo de tiempos de carrera y pantalla pública

```mermaid
flowchart TD
    subgraph AdminTiempos["Administración"]
        A([Admin entra a Pantalla pública]) --> B[Cambia semáforo: en curso / parada]
        B --> C[Si parada, escribe motivo]
        D([Admin carga tiempos]) --> E[Registra tiempo por piloto, categoría, etapa]
        E --> F[Guardado en base de datos]
    end

    subgraph Publico["Público / pantalla"]
        G([Alguien abre Tiempos en vivo]) --> H[Página consulta datos cada 5 s]
        H --> I{Muestra según datos}
        I -->|Hay tiempos| J[Tabla de posiciones y tiempos]
        I -->|No hay tiempos| K[Mensaje: aún no hay tiempos publicados]
        I -->|Semáforo rojo| L[Muestra motivo de parada]
        I -->|Semáforo verde| M[Muestra: Carrera en curso]
    end

    B --> F
    C --> F
    F --> H
```

---

## 5. Flujo de acceso al panel de administración

```mermaid
flowchart TD
    A([Usuario va a /admin o /admin/scan, etc.]) --> B{¿Tiene sesión?}
    B -->|No| C[Redirige a Login]
    C --> D[Ingresa email y contraseña]
    D --> E{Credenciales correctas?}
    E -->|No| F[Muestra error]
    F --> D
    E -->|Sí| G[Guarda sesión]
    G --> H[Accede al panel]

    B -->|Sí| H
    H --> I[Puede usar: pilotos, pantalla pública, tiempos, solicitudes, etc.]
```

---

## 6. Resumen de actores y acciones

```mermaid
flowchart LR
    subgraph Piloto["Piloto"]
        P1[Inscribirse]
        P2[Ver lista pilotos]
        P3[Descargar tarjeta QR]
    end

    subgraph Ciudadano["Ciudadano"]
        C1[Solicitar ticket]
        C2[Verificar ticket]
    end

    subgraph Espectador["Espectador / pantalla"]
        E1[Ver tiempos en vivo]
        E2[Ver semáforo y mensaje]
    end

    subgraph Admin["Administrador"]
        A1[Aprobar/rechazar pilotos]
        A2[Controlar pantalla pública]
        A3[Cargar tiempos]
        A4[Aprobar/rechazar solicitudes ticket]
        A5[Descargar planillas]
    end

    Web["Sitio web Safari"] --> Piloto
    Web --> Ciudadano
    Web --> Espectador
    Web --> Admin
```
