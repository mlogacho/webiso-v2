# WebISO v2

> Sistema de gestión de cumplimiento ISO para DataCom S.A.

## Descripción

WebISO v2 es un portal web interno que centraliza la gestión documental de los procesos certificados bajo **ISO 9001** e **ISO 27001** de DataCom S.A. Permite a los equipos cargar, clasificar y consultar la documentación de cada proceso del mapa organizacional (procedimientos, matrices de riesgo, instrucciones de trabajo, indicadores de gestión y documentos complementarios), y provee acceso SSO a los sistemas ERP integrados.

## Propósito

- Gestión interna de documentación por proceso y norma ISO
- Asociación de controles y evidencias a cada proceso del macroproceso DataCom
- Mapa de procesos interactivo con carga y descarga de documentación
- Biblioteca documental filtrable por proceso, tipo y norma
- Acceso centralizado (SSO) al ecosistema ERP DataCom: CRM, DAIA, Prospección y Acta de Reuniones

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 7 |
| Backend API | Flask (Python 3.10+) |
| Base de datos | SQLite (`uploads.db`) |
| Servidor de app | Gunicorn |
| Servidor web | Nginx |
| Generación de reportes | fpdf2, matplotlib |
| Envío de correo | smtplib (SMTP configurable) |
| Estilos | CSS propio (sin framework UI) |
| Iconos | lucide-react |

## Estado

**En desarrollo activo** — Versión 2

## Autor / Responsable

**Marco Logacho** — Director de Desarrollo Digital e IA, DataCom S.A.

---

## Instalación rápida

```bash
# 1. Clonar el repositorio
git clone https://github.com/mlogacho/webiso-v2.git
cd webiso-v2

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con valores reales

# 3. Backend — entorno virtual Python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. Frontend — dependencias Node
npm install

# 5. Desarrollo local (en terminales separadas)
npm run dev          # Frontend en :5173, proxy /api → :5001
python app.py        # Backend Flask en :5001
```

Ver [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) para instrucciones completas de producción.

---

## Estructura de carpetas

```
webiso-v2/
├── app.py                        # Backend Flask — API REST de documentos + rutas legacy
├── questions.py                  # Cuestionario de diagnóstico ISO (legacy)
├── requirements.txt              # Dependencias Python
├── package.json                  # Dependencias Node / scripts npm
├── vite.config.js                # Configuración Vite (proxy /api → :5001)
│
├── src/                          # Frontend React
│   ├── main.jsx                  # Entry point React
│   ├── App.jsx                   # Router principal
│   ├── components/               # Componentes reutilizables
│   │   ├── DocumentLibrary/      # Biblioteca documental por norma
│   │   ├── ProcessMap/           # Mapa de procesos interactivo
│   │   ├── Header, Footer, Modal, Layout
│   ├── pages/                    # Páginas de la aplicación
│   │   ├── Home.jsx
│   │   ├── ISO9001.jsx           # Biblioteca documentos ISO 9001
│   │   ├── ISO27001.jsx          # Biblioteca documentos ISO 27001
│   │   ├── ProcessMapPage.jsx    # Vista del mapa de procesos
│   │   ├── ERPDataCom.jsx        # Portal de acceso ERP con SSO
│   │   └── ERPAdmin.jsx          # Administración de usuarios y roles ERP
│   ├── context/
│   │   └── ERPAuthContext.jsx    # Contexto de autenticación SSO
│   └── utils/
│       └── processDocuments.js   # Cliente API para documentos
│
├── services/                     # Módulos Python auxiliares
│   ├── charts.py                 # Generación de gráficos (matplotlib)
│   ├── report_generator.py       # Generación de PDF (fpdf2)
│   └── email_service.py          # Envío de correo SMTP
│
├── templates/                    # Plantillas HTML Flask (legacy)
│   ├── layout.html, index.html, survey.html, results.html
│
├── static/                       # CSS estático Flask
│
├── deploy/                       # Configuración de despliegue
│   ├── gunicorn_config.py        # Gunicorn: workers, bind, logs
│   ├── webiso.service            # Unidad systemd
│   ├── webiso_nginx.conf         # Configuración Nginx
│   └── setup.sh
│
├── debian_deployment/            # Instalación base en Debian/Ubuntu
│   ├── nginx.conf
│   └── setup.sh
│
├── scripts/                      # Scripts de utilidad
│   ├── bootstrap_server.sh       # Instala dependencias base del servidor
│   ├── deploy_webiso.sh          # Build + rsync a producción
│   ├── backup_db.sh              # Respalda uploads.db y media
│   └── restore_db.sh             # Restaura respaldos
│
└── docs/                         # Documentación técnica
    ├── ARCHITECTURE.md
    ├── DEPLOYMENT.md
    ├── disaster-recovery.md
    ├── server-inventory.md
    └── validation-checklist.md
```

---

## Comandos útiles

```bash
npm run dev          # Servidor de desarrollo React
npm run build        # Genera dist/ listo para producción

python app.py        # Flask en modo desarrollo (:5001)
gunicorn --config deploy/gunicorn_config.py app:app  # Producción

bash scripts/deploy_webiso.sh     # Build + deploy a servidor
bash scripts/backup_db.sh         # Respaldo de base de datos
```

## GitHub Actions

El workflow `.github/workflows/build-and-artifacts.yml` se ejecuta en push a `main` y genera:
- `webiso-dist-<sha>`: contenido compilado de `dist/`
- `webiso-deploy-bundle-<sha>`: paquete `.tar.gz` con `dist`, docs, scripts y configuraciones

## Documentación de referencia

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Arquitectura del sistema
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Guía de despliegue
- [`docs/disaster-recovery.md`](docs/disaster-recovery.md) — Recuperación ante fallos
- [`docs/server-inventory.md`](docs/server-inventory.md) — Inventario del servidor
- [`docs/validation-checklist.md`](docs/validation-checklist.md) — Checklist de validación

---

> Este repositorio no almacena secretos ni credenciales reales.
> Ver `.env.example` para las variables de entorno requeridas.


## Resumen operativo

- Frontend: React 19 + Vite 7
- Publicacion productiva conocida: `/var/www/webiso`
- Fuente operativa conocida en servidor: `/home/marco/webiso`
- Puerto observado para WebISO: `8081`
- Acceso ERP: autenticacion central desde WebISO contra CRM DataCom

## Comandos utiles

- `npm run dev`: desarrollo local
- `npm run build`: genera `dist/`
- `scripts/bootstrap_server.sh`: instala dependencias base del servidor
- `scripts/deploy_webiso.sh`: construye y publica WebISO
- `scripts/backup_db.sh`: genera respaldo de base de datos y media si aplica
- `scripts/restore_db.sh`: restaura respaldos

## GitHub Actions

El repositorio incluye el workflow `.github/workflows/build-and-artifacts.yml` que se ejecuta en:

- `push` a `main`
- `pull_request`
- ejecucion manual con `workflow_dispatch`

El workflow genera dos artefactos descargables desde GitHub Actions:

- `webiso-dist-<sha>`: contenido compilado de `dist/`
- `webiso-deploy-bundle-<sha>`: paquete `.tar.gz` con `dist`, docs, scripts y configuraciones de despliegue

## Recuperacion rapida

La informacion critica para reconstruir la aplicacion y el entorno esta en:

- `docs/disaster-recovery.md`
- `docs/server-inventory.md`
- `docs/validation-checklist.md`
- `.env.example`

## Flujo recomendado de despliegue

1. Clonar el repositorio.
2. Copiar `.env.example` a `.env` y ajustar valores reales.
3. Ejecutar `scripts/bootstrap_server.sh` en el servidor.
4. Ejecutar `scripts/deploy_webiso.sh` desde el root del proyecto.
5. Verificar con `docs/validation-checklist.md`.

## Dependencias recomendadas

- Node.js 20
- npm 10+
- Nginx
- rsync
- Python 3.10+ para scripts auxiliares y legado Flask

## Notas

- Este repositorio no almacena secretos reales.
- Secretos, credenciales y respaldos sensibles deben mantenerse fuera de Git.
- Si el mismo servidor aloja CRM u otras apps con datos persistentes, respalda tambien sus bases y directorios de media.
