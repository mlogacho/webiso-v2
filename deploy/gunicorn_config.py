"""
deploy/gunicorn_config.py
=========================
Configuración de Gunicorn para el entorno de producción de WebISO v2.

Este archivo es referenciado por el servicio systemd (webiso.service) y por el
script de despliegue a través de:
  gunicorn --config deploy/gunicorn_config.py app:app

Parámetros clave:
  bind     : escucha en localhost:5001; Nginx hace proxy de /api/ hacia aquí.
  workers  : CPU*2+1 (recomendado para workloads síncronos I/O).
  timeout  : 120 s para subidas de archivos grandes (hasta 50 MB).
  logs     : /var/log/webiso/ — el directorio debe existir antes de arrancar.
"""
import multiprocessing

# Bind to a local TCP port; Nginx proxies /api/ to this address
bind = "127.0.0.1:5002"

# Workers
workers = multiprocessing.cpu_count() * 2 + 1
threads = 2

# Timeout
timeout = 120

# Logging — systemd captures stderr; also write to /var/log/webiso/
accesslog = "/var/log/webiso/gunicorn-access.log"
errorlog  = "/var/log/webiso/gunicorn-error.log"
loglevel  = "info"

# Process Name
proc_name = "webiso_app"
