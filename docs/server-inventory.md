# Server Inventory

## Entorno conocido al 2026-03-16

### Host principal

- IP: `10.11.121.58`
- Usuario operativo observado: `marco`
- Sistema operativo: Debian/Ubuntu Linux

### Rutas observadas

- WebISO fuente: `/home/marco/webiso`
- WebISO publicado: `/var/www/webiso`
- CRM fuente: `/var/www/crm-datacom`

### Puertos observados

- `80`: CRM y Nginx principal
- `8081`: WebISO
- `8080`: Prospeccion
- `8005`: DAIA
- `8030`: Acta de Reuniones
- `8001`: backend interno de Prospeccion

### Servicios observados

- `gunicorn-crm.service`
- `nginx`

### Archivos de configuracion relevantes

- `debian_deployment/nginx.conf`
- `deploy/webiso_nginx.conf`
- `deploy/webiso.service`
- `debian_deployment/setup.sh`

## Informacion que deberia mantenerse actualizada

- Version del sistema operativo
- Usuario de despliegue
- Rutas reales de publicacion
- Estado de certificados HTTPS si se habilitan
- Servicio y ubicacion de backups
