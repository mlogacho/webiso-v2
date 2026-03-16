# WebISO / ERP DataCom

Portal React + Vite para documentacion ISO y acceso ERP DataCom. El proyecto funciona como frontend estatico servido por Nginx y actualmente integra acceso centralizado a CRM, DAIA, Prospeccion y Acta de Reuniones.

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
