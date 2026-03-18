# Arquitectura del Sistema — WebISO v2

> Documento técnico de referencia para desarrolladores y administradores de sistema.
> Generado: 18 marzo 2026 | Autor: Marco Logacho

---

## 1. Descripción General

WebISO v2 es un sistema web interno de **gestión documental ISO** para DataCom S.A.
Permite cargar, clasificar y consultar la documentación de cada proceso del
macroproceso organizacional (ISO 9001 e ISO 27001), y centraliza el acceso SSO
al ecosistema ERP interno.

La arquitectura sigue un patrón **SPA + API REST**:

```
┌─────────────────────────────────────────────────────────────────┐
│  Navegador del usuario                                          │
│  React 19 SPA (servida por Nginx en :8081)                      │
│    │                                                            │
│    ├──  GET /api/documents/*  ──►  Nginx proxy ──► Gunicorn     │
│    │                                                 Flask :5001│
│    └──  SSO /api/core/*       ──►  CRM DataCom :80             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Diagrama de Módulos

```
webiso-v2/
│
├── [FRONTEND] src/                     React 19 + Vite 7
│   │
│   ├── pages/
│   │   ├── Home.jsx                    Página de bienvenida / navegación
│   │   ├── ISO9001.jsx                 Biblioteca documental filtrada ISO 9001
│   │   ├── ISO27001.jsx                Biblioteca documental filtrada ISO 27001
│   │   ├── ProcessMapPage.jsx          Contenedor de página del mapa de procesos
│   │   ├── ERPDataCom.jsx              Portal de acceso ERP con autenticación SSO
│   │   └── ERPAdmin.jsx                Gestión de usuarios y asignación de roles ERP
│   │
│   ├── components/
│   │   ├── ProcessMap/
│   │   │   └── ProcessMap.jsx          Mapa de procesos interactivo (SVG/CSS)
│   │   │                               Modal de carga/gestión de documentos por proceso
│   │   ├── DocumentLibrary.jsx         Biblioteca documental con filtros y búsqueda
│   │   ├── Modal.jsx                   Componente modal genérico reutilizable
│   │   ├── Header / Footer / Layout    Estructura de página compartida
│   │
│   ├── context/
│   │   └── ERPAuthContext.jsx          Contexto global de autenticación SSO
│   │                                   Valida token contra CRM/api/core/user-permissions/
│   │                                   Persiste token en sessionStorage
│   │
│   └── utils/
│       └── processDocuments.js         Cliente HTTP para la API REST de documentos
│                                       Define DOCUMENT_TYPES e ISO_STANDARDS
│                                       Funciones: getAllDocuments, saveDocuments,
│                                         deleteDocument, updateDocumentStandards
│
├── [BACKEND] app.py                    Flask — API REST + módulo legacy
│   │
│   ├── /api/documents          GET     Lista documentos (filtrado por proceso/norma)
│   ├── /api/documents          POST    Sube nuevo documento (multipart/form-data)
│   ├── /api/documents/<id>     PATCH   Actualiza normas asociadas al documento
│   ├── /api/documents/<id>     DELETE  Elimina documento de BD y disco
│   ├── /api/documents/<id>/file GET   Sirve el archivo binario
│   │
│   ├── /                       GET     Cuestionario legacy — pantalla de inicio
│   ├── /start                  POST    Inicia sesión del cuestionario
│   ├── /survey                 GET     Renderiza el cuestionario (30 preguntas)
│   ├── /submit                 POST    Procesa respuestas y calcula puntajes
│   ├── /results                GET     Muestra resultados con gráficas
│   ├── /download_pdf           GET     Genera y descarga PDF del reporte
│   └── /send_email             GET     Envía reporte PDF por correo SMTP
│
├── [SERVICES] services/                Módulos Python auxiliares
│   ├── charts.py                       Gráficas radar y barras (matplotlib/Agg)
│   ├── report_generator.py             Generación de PDF (fpdf2)
│   └── email_service.py                Envío de correo (smtplib / STARTTLS)
│
└── [INFRA] deploy/                     Configuración de servidor
    ├── gunicorn_config.py              Workers, bind :5001, logs, timeout
    ├── webiso.service                  Unidad systemd (User=marco)
    └── webiso_nginx.conf               Proxy /api/ → :5001, static en /var/www/webiso
```

---

## 3. Flujo Principal del Usuario

### 3.1 Gestión Documental (flujo principal)

```
1. Usuario abre WebISO → Home.jsx
2. Navega al Mapa de Procesos → ProcessMapPage → ProcessMap.jsx
3. Hace clic en un nodo del proceso (ej. "VENTAS")
   → Modal se abre con panel de documentación del proceso
4. En el modal:
   a. Ve el resumen de documentos cargados por tipo
   b. Sube nuevo documento (PDF/Word/Excel) con tipo y norma
      → POST /api/documents  (multipart)
   c. Abre / descarga documentos existentes
      → GET /api/documents/<id>/file
   d. Elimina documentos obsoletos
      → DELETE /api/documents/<id>
5. Navega a ISO 9001 o ISO 27001
   → DocumentLibrary filtra documentos por norma y muestra biblioteca completa
```

### 3.2 Acceso ERP (SSO)

```
1. Usuario va a ERPDataCom.jsx → formulario de login
2. POST a CRM /api/core/login/ → recibe token
3. Token se valida con GET /api/core/user-permissions/
4. Token se guarda en sessionStorage
5. Al abrir una app ERP, el token se adjunta como ?sso_token=<token>
6. Las apps ERP validan el token contra el mismo endpoint
```

---

## 4. Modelo de Datos

### 4.1 Tabla `documents` (SQLite — uploads.db)

| Campo          | Tipo    | Descripción                                              |
|----------------|---------|----------------------------------------------------------|
| `id`           | TEXT PK | UUID v4 único por documento                              |
| `process_name` | TEXT    | Nombre del proceso (ej. "VENTAS", "INSTALACION")         |
| `doc_type`     | TEXT    | Tipo: `process`, `risk-matrix`, `work-instruction`,      |
|                |         | `management-indicator`, `complementary-doc`              |
| `standards`    | TEXT    | JSON array: `["iso9001"]`, `["iso27001"]` o ambos        |
| `file_name`    | TEXT    | Nombre original del archivo (sanitizado)                 |
| `file_size`    | INTEGER | Tamaño en bytes                                          |
| `content_type` | TEXT    | MIME type del archivo                                    |
| `storage_path` | TEXT    | Nombre del archivo en disco (`<uuid>.<ext>`)             |
| `uploaded_at`  | TEXT    | ISO 8601 UTC                                             |

Los archivos físicos residen en `uploads/` (gitignoreado, solo en servidor).

### 4.2 Tipos de Documento (`DOCUMENT_TYPES`)

| ID                   | Etiqueta                          | Múltiple | Formatos        |
|----------------------|-----------------------------------|----------|-----------------|
| `process`            | Proceso                           | No       | PDF             |
| `risk-matrix`        | Matriz de Riesgos                 | No       | Excel           |
| `work-instruction`   | Instrucciones de Trabajo          | Sí       | PDF             |
| `management-indicator` | Indicadores de Gestión          | No       | Excel           |
| `complementary-doc`  | Documentos Complementarios        | Sí       | PDF, Word, Excel|

### 4.3 Normas ISO soportadas

| ID        | Etiqueta  |
|-----------|-----------|
| `iso9001` | ISO 9001  |
| `iso27001`| ISO 27001 |

---

## 5. Integraciones Externas

| Sistema               | Protocolo      | URL base en producción        | Propósito                             |
|-----------------------|----------------|-------------------------------|---------------------------------------|
| CRM DataCom           | HTTP REST      | `http://10.11.121.58`         | Autenticación SSO, roles de usuario   |
| DAIA                  | HTTP REST      | `http://10.11.121.58:8005`    | Acceso integrado vía SSO              |
| Prospeccion           | HTTP REST      | `http://10.11.121.58:8080`    | Acceso integrado vía SSO              |
| Acta de Reuniones     | HTTP REST      | `http://10.11.121.58:8030`    | Acceso integrado vía SSO              |
| SMTP (correo)         | SMTP/STARTTLS  | Configurable vía `.env`       | Envío de reportes PDF por correo      |

---

## 6. Infraestructura de Producción

```
Servidor: 10.11.121.58 (Ubuntu/Debian)
Usuario de servicio: marco

Nginx  (:8081) ─── sirve dist/  ──────────────────────► /var/www/webiso/
               └── proxy /api/  ──────────────────────► Gunicorn :5001
                                                              │
                                                         app.py (Flask)
                                                         uploads/  (archivos)
                                                         uploads.db (SQLite)

Ruta del proyecto en servidor: /home/marco/webiso/
Servicio systemd: webiso.service
Logs: /var/log/webiso/gunicorn-access.log
       /var/log/webiso/gunicorn-error.log
```

---

## 7. Decisiones de Diseño Relevantes

- **SQLite en producción**: adecuado para el volumen actual (documentos internos). Si
  la carga escala, migrar a PostgreSQL sin cambios en la lógica de negocio.
- **Archivos en disco**: los documentos se almacenan en `uploads/` en el mismo servidor.
  El script `scripts/backup_db.sh` debe respaldar tanto `uploads.db` como `uploads/`.
- **Sin autenticación en la API de documentos**: la API `/api/documents` no requiere
  token actualmente. El acceso se controla a nivel de red (Nginx, VPN interna).
- **Token SSO en sessionStorage**: se pierde al cerrar el tab, sin persistencia entre
  sesiones. Diseño deliberado para entorno corporativo.
