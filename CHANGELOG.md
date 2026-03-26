# Changelog — WebISO v2

Todas las versiones notables de este proyecto están documentadas en este archivo.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Versionado semántico según [SemVer](https://semver.org/lang/es/).

---

## [Unreleased]

### Added
- [PENDIENTE — completar cuando se implemente]

---

## [0.2.0] — 2026-03-26

### Added
- **Soporte multi-documento en todas las categorías del mapa de procesos**
  - PROCESO, MATRIZ DE RIESGO, KPI y DOCS. COMPLEMENTARIOS ahora aceptan **múltiples archivos** por proceso (antes solo aceptaban uno).
  - INSTRUCCIONES DE TRABAJO ya era múltiple; se mantiene sin cambios funcionales.
- Botón **Eliminar** (🗑️ rojo) en el **resumen de documentación cargada** para cada archivo individual.
- Botones **Ver** y **Descargar** separados en la sección de detalle de documentos cargados (cards de cada tipo).
- Estilo `.process-summary-delete` con color rojo para el botón eliminar en el resumen.
- Truncado visual (`text-overflow: ellipsis`) del nombre de archivo largo en el resumen (`process-summary-filename`).

### Changed
- Eliminado el comportamiento de reemplazo automático (`replace=true`) al subir documentos. El usuario gestiona cada archivo individualmente y debe eliminar los que ya no necesite.
- Badge "Único por proceso" en las cards de carga reemplazado por "Multiple" en todos los tipos.
- Label de `management-indicator` actualizado a "Indicadores de Gestion (KPI)" para mayor claridad.

### Files changed
- `src/utils/processDocuments.js`
- `src/components/ProcessMap/ProcessMap.jsx`
- `src/components/ProcessMap/ProcessMap.css`


## [0.1.0-alpha] — 2026-03-18

### Added

#### Documentación técnica
- `README.md` completo: descripción, tecnologías, estructura de carpetas y guía de inicio rápido
- `docs/ARCHITECTURE.md`: diagrama de módulos, flujo del usuario, modelo de datos, integraciones y decisiones de diseño
- `docs/DEPLOYMENT.md`: guía de despliegue completa (requisitos, venv, Node, Nginx, Gunicorn, systemd, backups)
- `.env.example` ampliado con todas las variables de entorno del sistema
- `.gitignore` con entradas Python/Flask/Node completas
- `tests/` carpeta reservada para pruebas futuras

#### Tipo de documento: Documentos Complementarios al Proceso
- Nuevo tipo `complementary-doc` en `DOCUMENT_TYPES` (acepta PDF, Word, Excel)
- Soporte para carga múltiple de archivos por proceso
- Backend: `complementary-doc` agregado a `VALID_DOC_TYPES` y `.doc`/`.docx` a `ALLOWED_EXTENSIONS`
- Etiqueta `DOCS. COMPLEMENTARIOS` en el resumen del panel del mapa de procesos

#### Correcciones ERP
- Simplificación de lógica SSO: el token se adjunta a todas las apps ERP (no solo CRM)

---

## [0.0.9] — 2026-03-16

### Changed
- Corrección de visualización de datos y layout en la asignación ERP

---

## [0.0.8] — 2026-03-16

### Added
- Integración de asignación de roles ERP sobre usuarios CRM desde el panel Admin ERP

---

## [0.0.7] — 2026-03-16

### Added
- Acciones de **Ver** y **Descargar** en el resumen documental del modal de procesos

---

## [0.0.6] — 2026-03-16

### Added
- Resumen de documentación cargada en el modal del mapa de procesos
  (muestra estado de carga por tipo: proceso, instrucciones, matriz de riesgo, KPI)

---

## [0.0.5] — 2026-03-16

### Changed
- Migración del almacenamiento de documentos a backend Flask con API REST
- Base de datos SQLite (`uploads.db`) para metadatos de documentos
- Proxy Nginx `/api/` → Gunicorn `:5001`
- Archivos subidos almacenados en `uploads/` (excluido de Git)

---

## [0.0.4] — 2026-03-16

### Added
- Gestión documental por proceso: carga de PDFs, matrices Excel e instrucciones de trabajo
- Clasificación de documentos por norma ISO (ISO 9001 / ISO 27001)
- Biblioteca documental filtrable por proceso, tipo y norma (`DocumentLibrary`)
- Páginas dedicadas ISO 9001 e ISO 27001 con biblioteca completa

---

## [0.0.3] — 2026-03-16

### Added
- GitHub Actions: workflow `build-and-artifacts.yml` para compilación automática y generación de artefactos descargables en cada push a `main`
- Runbook y scripts de recuperación ante fallos (`docs/disaster-recovery.md`, `scripts/backup_db.sh`, `scripts/restore_db.sh`)

---

## [0.0.2] — 2026-03-16

### Added
- Centralización del login ERP con autenticación SSO contra CRM DataCom
- Módulo Admin ERP para gestión de usuarios y roles
- Integración de Acta de Reuniones (`:8030`) como app ERP disponible
- Corrección del logo del header DataCom

---

## [0.0.1] — 2026-02-27

### Added
- Primer commit del proyecto: WebISO v2
- Frontend React 19 + Vite 7
- Mapa de procesos interactivo del Macroproceso DataCom (SVG/CSS)
- Módulo legacy Flask: cuestionario de diagnóstico ISO de 30 preguntas con 5 dimensiones
- Generación de reportes PDF (fpdf2) y gráficas (matplotlib)
- Envío de resultados por correo SMTP
- Configuración de despliegue inicial (Nginx, Gunicorn, systemd)
- Scripts de bootstrap del servidor
