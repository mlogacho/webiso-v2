# Guía de Despliegue — WebISO v2

> Referencia técnica para instalar y mantener WebISO v2 en producción.
> Autor: Marco Logacho | DataCom S.A. | Actualizado: marzo 2026

---

## 1. Requisitos del Servidor

| Componente   | Versión mínima | Notas                                    |
|--------------|----------------|------------------------------------------|
| SO           | Ubuntu 22.04 LTS o Debian 12 | Recomendado                |
| Python       | 3.10+          | `python3 --version`                      |
| Node.js      | 20 LTS         | Solo para compilar el frontend           |
| npm          | 10+            | Incluido con Node 20                     |
| Nginx        | 1.18+          | Servidor web / proxy inverso             |
| Gunicorn     | 21+            | Servidor WSGI (incluido en requirements) |
| rsync        | cualquiera     | Necesario para `deploy_webiso.sh`        |

---

## 2. Clonar el Repositorio

```bash
# En el servidor o en tu máquina de desarrollo
git clone https://github.com/mlogacho/webiso-v2.git
cd webiso-v2
```

---

## 3. Configurar Variables de Entorno

```bash
cp .env.example .env
# Editar .env con los valores reales del entorno
nano .env
```

Ver sección de variables en `.env.example`. Las variables críticas son:
- `SMTP_USER` / `SMTP_PASSWORD` — para envío de correo
- `PUBLIC_BASE_URL` — URL pública del sistema
- `DEPLOY_HOST` / `DEPLOY_PATH` — para los scripts de despliegue

---

## 4. Backend — Entorno Virtual Python

```bash
# Crear y activar el entorno virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

**Dependencias instaladas:**
- `flask` — servidor web Python
- `gunicorn` — servidor WSGI de producción
- `pandas` / `matplotlib` — análisis de datos y gráficas
- `fpdf2` — generación de PDFs
- `werkzeug` — utilidades HTTP (incluida con Flask)

---

## 5. Frontend — Dependencias Node y Build

```bash
# Instalar dependencias Node
npm install

# Compilar para producción (genera dist/)
npm run build
```

El directorio `dist/` generado contiene la SPA lista para ser servida por Nginx.

---

## 6. Base de Datos

WebISO v2 usa **SQLite** para los metadatos de documentos. La base de datos
se crea automáticamente al arrancar el backend por primera vez en:

```
uploads.db        # metadatos de documentos
uploads/          # archivos binarios subidos
```

No se requieren migraciones manuales. La función `_init_db()` en `app.py`
crea la tabla `documents` si no existe.

> **⚠ No incluir `uploads.db` ni `uploads/` en Git.**
> Están en `.gitignore`. En producción se respaldan con `scripts/backup_db.sh`.

---

## 7. Ejecución en Desarrollo Local

```bash
# Terminal 1 — Backend Flask (puerto 5001)
source venv/bin/activate
python app.py

# Terminal 2 — Frontend Vite (puerto 5173, proxy /api → :5001)
npm run dev
```

Acceder en: `http://localhost:5173`

El proxy de Vite (`vite.config.js`) redirige automáticamente las llamadas
`/api/*` al backend Flask en `:5001`.

---

## 8. Despliegue en Producción

### 8.1 Instalación inicial del servidor

```bash
# Ejecutar desde la raíz del proyecto (requiere un servidor con SSH configurado)
bash scripts/bootstrap_server.sh
```

Este script instala Node.js, Python, Nginx, rsync y otras dependencias base.

### 8.2 Primer despliegue

```bash
# 1. Configurar .env con los datos del servidor de producción
nano .env   # ajustar DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH

# 2. Ejecutar script de despliegue
bash scripts/deploy_webiso.sh
```

El script realiza:
1. `npm install && npm run build` — compila el frontend
2. `rsync dist/ → DEPLOY_PATH` — sincroniza los archivos
3. Actualiza configuración Nginx si existe `debian_deployment/nginx.conf`
4. Recarga Nginx

### 8.3 Configurar el servicio systemd (backend)

```bash
# En el servidor
sudo cp deploy/webiso.service /etc/systemd/system/webiso.service

# Ajustar WorkingDirectory y rutas si difieren de /home/marco/webiso
sudo nano /etc/systemd/system/webiso.service

sudo systemctl daemon-reload
sudo systemctl enable webiso
sudo systemctl start webiso
sudo systemctl status webiso
```

### 8.4 Configurar Nginx

```bash
# Copiar la configuración (ajustar rutas según el entorno)
sudo cp debian_deployment/nginx.conf /etc/nginx/sites-available/webiso

# Activar el sitio
sudo ln -sf /etc/nginx/sites-available/webiso /etc/nginx/sites-enabled/webiso

# Verificar sintaxis y recargar
sudo nginx -t
sudo systemctl reload nginx
```

La configuración de Nginx debe:
- Servir `dist/` en el puerto 8081 (o el deseado)
- Hacer proxy de `/api/` hacia `http://127.0.0.1:5001`

---

## 9. Actualizaciones de Código

### Actualizar solo el frontend

```bash
# En tu máquina local
bash scripts/deploy_webiso.sh
```

### Actualizar el backend (app.py, services/)

```bash
# Copiar app.py al servidor
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" app.py marco@<SERVIDOR>:/home/marco/webiso/app.py

# Recargar Gunicorn (sin downtime)
ssh marco@<SERVIDOR> "kill -HUP \$(pgrep -f 'gunicorn.*app:app')"
```

### Actualización completa

```bash
# En el servidor
cd /home/marco/webiso
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
kill -HUP $(pgrep -f 'gunicorn.*app:app')
```

---

## 10. Reinicio de Servicios

```bash
# Reiniciar el backend (Gunicorn)
sudo systemctl restart webiso

# Recarga sin downtime (hot reload)
kill -HUP $(pgrep -f 'gunicorn.*app:app')

# Recargar Nginx (sin interrumpir conexiones)
sudo systemctl reload nginx

# Ver estado de los servicios
sudo systemctl status webiso nginx

# Ver logs en tiempo real
tail -f /var/log/webiso/gunicorn-error.log
tail -f /var/log/nginx/error.log
```

---

## 11. Respaldo y Restauración

```bash
# Crear respaldo de base de datos y archivos
bash scripts/backup_db.sh

# Restaurar desde respaldo
bash scripts/restore_db.sh
```

Los respaldos se guardan en la ruta definida por `BACKUP_ROOT` en `.env`
(por defecto `/var/backups/datacom`).

---

## 12. Verificación Post-Despliegue

Seguir el checklist en [`docs/validation-checklist.md`](validation-checklist.md):

- [ ] Frontend carga en `http://<IP>:8081`
- [ ] `GET /api/documents` responde con array JSON
- [ ] La subida de un documento PDF funciona desde el mapa de procesos
- [ ] Las páginas ISO 9001 e ISO 27001 muestran la biblioteca
- [ ] El SSO de ERP DataCom funciona correctamente
- [ ] Los logs de Gunicorn y Nginx no muestran errores críticos

---

## 13. Recuperación ante Fallos

Ver [`docs/disaster-recovery.md`](disaster-recovery.md) para procedimientos
de recuperación completa del sistema.
