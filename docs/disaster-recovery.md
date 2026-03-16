# Disaster Recovery Runbook

## Objetivo

Recuperar WebISO y su acceso ERP en un servidor nuevo o restaurado con el menor tiempo posible.

## Alcance

- WebISO estatico en Nginx
- Configuracion de acceso ERP desde WebISO
- Referencias operativas del entorno actual
- Restauracion opcional de base de datos y archivos si el servidor tambien aloja aplicaciones con datos persistentes

## Pre-requisitos

- Acceso SSH al nuevo servidor
- Copia del repositorio
- Archivo `.env` derivado de `.env.example`
- Acceso a respaldos de base de datos, media y configuraciones Nginx/systemd si aplica

## Secuencia recomendada de recuperacion

1. Provisionar servidor base Debian o Ubuntu.
2. Crear usuario operativo con permisos `sudo`.
3. Clonar el repositorio en una ruta de trabajo, por ejemplo `/home/<usuario>/webiso`.
4. Copiar `.env.example` a `.env` y completar valores reales.
5. Ejecutar `scripts/bootstrap_server.sh` para instalar Node, Nginx, rsync y utilidades.
6. Ejecutar `scripts/deploy_webiso.sh` desde el root del proyecto.
7. Si existen datos persistentes, usar `scripts/restore_db.sh`.
8. Revisar `docs/validation-checklist.md`.
9. Confirmar conectividad DNS, acceso HTTP y permisos ERP.

## Orden de restauracion sugerido

### WebISO

1. Instalar dependencias.
2. Construir `dist/`.
3. Sincronizar a `/var/www/webiso`.
4. Publicar configuracion Nginx.
5. Reiniciar Nginx.

### CRM y aplicaciones relacionadas

Si el mismo servidor aloja CRM, DAIA, Prospeccion o Acta, restaurarlas despues de levantar WebISO. Este repositorio documenta los puntos de integracion, pero cada app debe tener su propio backup de datos y configuracion.

## Artefactos criticos a preservar

- Repositorio GitHub
- `.env` de produccion
- Configuracion Nginx activa
- Archivos `systemd` de aplicaciones relacionadas
- Base de datos SQLite o motor equivalente
- Directorios `media/` o cargas de usuario
- Inventario de puertos, IPs y rutas

## Recomendacion adicional

Automatizar snapshots del servidor y respaldos periodicos fuera del host principal.
