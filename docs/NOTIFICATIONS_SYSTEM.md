# Sistema de Notificaciones WebISO v2

Este documento describe la arquitectura y configuración del sistema de notificaciones automáticas implementado en WebISO v2.

## Descripción General
WebISO v2 incluye un sistema de notificaciones por correo electrónico que se dispara automáticamente cada vez que un usuario carga un nuevo documento al Mapa de Procesos. El sistema identifica a los destinatarios consultando la base de datos central del **CRM DataCom**.

## Arquitectura de Integración

### 1. Origen de Datos (CRM DataCom)
WebISO no gestiona su propia lista de correos para notificaciones. En su lugar, se conecta directamente a la base de datos PostgreSQL del CRM para obtener la lista de usuarios activos.
- **Base de Datos:** PostgreSQL (instancia local en el servidor).
- **Tabla consultada:** `auth_user`.
- **Filtros:** Usuarios con correo electrónico válido, no vacíos y con el campo `is_active = True`.
- **Configuración:** La ruta del archivo `.env` del CRM debe estar definida en `app.py` (propiedad `crm_env_path`).

### 2. Motor de Envío (SMTP)
El servicio utiliza el servidor SMTP de DataCom para el despacho de correos.
- **Servidor:** `mail.datacom.ec`
- **Puerto:** `465` (SSL).
- **Cuenta remitente:** `daia@datacom.ec`
- **Credenciales:** Almacenadas en el archivo `.env` de WebISO (`SMTP_USER`, `SMTP_PASSWORD`).

### 3. Lógica del Backend (`app.py`)
- La función `_get_crm_users_to_notify()` gestiona la conexión PostgreSQL.
- La función `_send_document_notification(doc_info)` construye el cuerpo del mensaje y orquestra el envío masivo.
- El cuerpo del correo incluye: Nombre del archivo, proceso de origen, tipo de documento y marca de tiempo.

## Infraestructura y Despliegue

Para garantizar la estabilidad del sistema y evitar colisiones de red, WebISO v2 se despliega bajo la siguiente arquitectura:

- **Comunicación Interna:** Gunicorn y Nginx se comunican mediante un **Unix Domain Socket** ubicado en `/tmp/webiso.sock`. Esto evita definitivamente errores de "Address already in use" comunes en puertos TCP.
- **Servicio Systemd:** El servicio `webiso.service` gestiona el ciclo de vida de la aplicación.
- **Logs:** Los logs detallados de envío (éxitos y errores) se encuentran en:
  - `/var/log/webiso/gunicorn-error.log`
  - Journal del sistema: `sudo journalctl -u webiso`

## Resolución de Problemas (Troubleshooting)

### Endpoint de Diagnóstico
Se ha habilitado un endpoint para verificar la salud de la conexión CRM y el motor SMTP sin necesidad de subir un documento real:
- **URL:** `http://<servidor>:8081/api/diag/emails`
- **Respuesta esperada:** JSON con el conteo de usuarios encontrados y el estado del último intento de envío SMTP.

### Errores Comunes
- **SMTP variables not set:** Asegurarse de que el archivo `.env` en `/home/marco/webiso/` contenga las llaves `SMTP_USER` y `SMTP_PASSWORD`.
- **KeyError 'uploaded_at' / 'uploadedAt':** El sistema espera ahora el formato `camelCase` (`uploadedAt`) proveniente de la conversión de base de datos.
- **Incorrect authentication data:** Verificar que la contraseña en el `.env` sea la correcta (atención especial a caracteres similares como `I` mayúscula vs `l` minúscula).
