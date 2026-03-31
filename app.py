"""
app.py — Backend principal de WebISO v2
=======================================
Servidor Flask que expone dos grupos de funcionalidad:

1. **API REST de Gestión Documental** (`/api/documents/*`)
   Permite a la SPA React cargar, listar, actualizar y eliminar documentos
   asociados a los procesos del mapa organizacional de DataCom S.A.
   Los archivos se almacenan en disco (`uploads/`) y los metadatos en SQLite
   (`uploads.db`). Cada documento se asocia a un proceso, un tipo documental
   y una o más normas ISO (iso9001, iso27001).

2. **Cuestionario de Diagnóstico ISO (legacy)** (`/`, `/survey`, `/results`, …)
   Módulo Flask heredado que evalúa dimensiones de gestión profesional mediante
   un cuestionario de 30 preguntas, genera gráficas y exporta reportes en PDF
   con opción de envío por correo.

Configuración de despliegue esperada:
  - Gunicorn arranca este módulo como `app:app`
  - Nginx hace proxy de `/api/` hacia Gunicorn (puerto 5001 por defecto)
  - El frontend React (dist/) es servido directamente por Nginx
"""

from flask import Flask, render_template, request, redirect, url_for, session, send_file, flash, jsonify
import questions
from services import charts, report_generator, email_service, auth_service
import os
import json
import sqlite3
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from werkzeug.utils import secure_filename
from functools import wraps

app = Flask(__name__)
app.secret_key = 'supersecretkey'  # IMPORTANTE: cambiar por variable de entorno en producción

# ── Document management storage ──────────────────────────────────────────────
UPLOADS_DIR = Path(__file__).parent / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

DB_PATH = Path(__file__).parent / 'uploads.db'
MAX_FILE_MB = 50
ALLOWED_EXTENSIONS = {'.pdf', '.xlsx', '.xls', '.doc', '.docx'}
VALID_DOC_TYPES = {'process', 'risk-matrix', 'work-instruction', 'management-indicator', 'complementary-doc'}
VALID_STANDARDS = {'iso9001', 'iso27001'}

app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_MB * 1024 * 1024


def _get_db():
    """Abre y retorna una conexión SQLite configurada con Row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    """Crea la tabla `documents` si no existe. Se ejecuta al importar el módulo."""
    with _get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS documents (
                id           TEXT PRIMARY KEY,
                process_name TEXT NOT NULL,
                doc_type     TEXT NOT NULL,
                standards    TEXT NOT NULL,
                file_name    TEXT NOT NULL,
                file_size    INTEGER NOT NULL,
                content_type TEXT NOT NULL,
                storage_path TEXT NOT NULL,
                uploaded_at  TEXT NOT NULL
            )
        ''')


_init_db()


def _row_to_dict(row):
    """Convert a DB row to a camelCase dict safe for JSON responses."""
    return {
        'id':          row['id'],
        'processName': row['process_name'],
        'docType':     row['doc_type'],
        'standards':   json.loads(row['standards']),
        'fileName':    row['file_name'],
        'size':        row['file_size'],
        'uploadedAt':  row['uploaded_at'],
    }


# ── Document API endpoints ───────────────────────────────────────────────────

@app.route('/api/documents', methods=['GET'])
def api_list_documents():
    """
    Lista todos los documentos almacenados.

    Query params opcionales:
      - process (str): filtra por nombre de proceso exacto.
      - standard (str): filtra por norma ISO ('iso9001' | 'iso27001').

    Responde: JSON array de objetos documento (camelCase).
    """
    process_filter = request.args.get('process', '').strip()
    standard_filter = request.args.get('standard', '').strip()

    with _get_db() as conn:
        rows = conn.execute('SELECT * FROM documents ORDER BY uploaded_at DESC').fetchall()

    results = []
    for row in rows:
        doc = _row_to_dict(row)
        if process_filter and doc['processName'] != process_filter:
            continue
        if standard_filter and standard_filter not in doc['standards']:
            continue
        results.append(doc)

    return jsonify(results)


def _get_crm_users_to_notify():
    """
    Obtiene todos los usuarios del CRM que tienen un correo electrónico registrado,
    consultando la base de datos de CRM directamente en el servidor.
    """
    crm_db_path = '/var/www/crm-datacom/db.sqlite3'
    if not os.path.exists(crm_db_path):
        return []

    try:
        conn = sqlite3.connect(crm_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        query = '''
            SELECT email, first_name, last_name, username
            FROM auth_user
            WHERE email IS NOT NULL AND email != '' AND is_active = 1
        '''
        rows = cursor.execute(query).fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        print("Error al obtener usuarios de CRM para notificar:", e)
        return []


def _send_document_notification(doc_info):
    """
    Notifica a todos los usuarios con un correo registrado sobre la publicación
    de un nuevo documento en el Mapa de Procesos.
    """
    users = _get_crm_users_to_notify()
    if not users:
        print("No hay usuarios de CRM configurados para notificar.")
        return

    # Usamos la fecha y hora exacta de subida almacenada en 'uploaded_at'
    upload_date = datetime.fromisoformat(doc_info['uploaded_at'].replace('Z', '+00:00')) if isinstance(doc_info['uploaded_at'], str) else doc_info['uploaded_at']
    upload_datetime_str = upload_date.strftime("%d/%m/%Y a las %H:%M:%S (UTC)")

    subject = f"Nuevo Documento en WebISO: {doc_info['file_name']}"

    for user in users:
        email = user['email']
        name = f"{user['first_name']} {user['last_name']}".strip() or user['username']

        body = f"""Hola {name},

Le notificamos que se ha publicado un nuevo documento en el Mapa de Procesos (Sistema de Gestión Integrado).

1. Documento Subido: {doc_info['file_name']}
2. Lugar de Subida: Proceso "{doc_info['process_name']}" (Categoría: {doc_info['doc_type']})
3. Fecha de Publicación: {upload_datetime_str}

Puede acceder al sistema para verificar y descargar el documento en la sección respectiva.

Saludos cordiales,
Equipo WebISO
"""
        print(f"Notificando subida de doc a {email}...")
        try:
            email_service.send_email(email, subject, body)
        except Exception as e:
            print(f"No se pudo enviar correo a {email}: {e}")

@app.route('/api/documents', methods=['POST'])
def api_upload_document():
    """
    Sube un nuevo documento y guarda sus metadatos en la base de datos.

    Form data requerida:
      - file        : archivo binario.
      - process_name: nombre del proceso al que pertenece.
      - doc_type    : tipo de documento (process | risk-matrix | work-instruction |
                      management-indicator | complementary-doc).
      - standards   : JSON array de normas, ej. ["iso9001"].
      - replace     : 'true' para reemplazar documentos existentes del mismo tipo/proceso.

    Responde: 201 con el objeto creado, o 4xx con { error: '...' }.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file attached'}), 400

    uploaded_file = request.files['file']
    process_name  = request.form.get('process_name', '').strip()
    doc_type      = request.form.get('doc_type', '').strip()
    standards_raw = request.form.get('standards', '[]')
    replace_flag  = request.form.get('replace', 'false').lower() == 'true'

    if not uploaded_file.filename or not process_name or not doc_type:
        return jsonify({'error': 'Faltan campos requeridos'}), 400

    if doc_type not in VALID_DOC_TYPES:
        return jsonify({'error': 'Tipo de documento no valido'}), 400

    safe_name = secure_filename(uploaded_file.filename)
    ext = Path(safe_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({'error': f'Extension no permitida: {ext}'}), 400

    try:
        standards = json.loads(standards_raw)
        if not isinstance(standards, list):
            raise ValueError
        if not all(s in VALID_STANDARDS for s in standards):
            raise ValueError
    except (ValueError, json.JSONDecodeError):
        return jsonify({'error': 'Standards invalidos'}), 400

    doc_id           = str(uuid.uuid4())
    storage_filename = f'{doc_id}{ext}'
    storage_path     = UPLOADS_DIR / storage_filename
    uploaded_file.save(str(storage_path))
    file_size = storage_path.stat().st_size
    now       = datetime.now(timezone.utc).isoformat()

    with _get_db() as conn:
        if replace_flag:
            # Fetch existing docs to remove their files from disk
            existing = conn.execute(
                'SELECT storage_path FROM documents WHERE process_name = ? AND doc_type = ?',
                (process_name, doc_type)
            ).fetchall()
            for old_row in existing:
                old_file = UPLOADS_DIR / old_row['storage_path']
                try:
                    old_file.unlink(missing_ok=True)
                except OSError:
                    pass
            conn.execute(
                'DELETE FROM documents WHERE process_name = ? AND doc_type = ?',
                (process_name, doc_type)
            )

        conn.execute(
            '''INSERT INTO documents
                   (id, process_name, doc_type, standards, file_name, file_size, content_type, storage_path, uploaded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (doc_id, process_name, doc_type, json.dumps(standards),
             safe_name, file_size, uploaded_file.content_type or 'application/octet-stream',
             storage_filename, now)
        )

    with _get_db() as conn:
        row = conn.execute('SELECT * FROM documents WHERE id = ?', (doc_id,)).fetchone()
    
    doc_dict = _row_to_dict(row)
    
    # Enviar notificaciones por correo en background (o síncrono para simplificar, 
    # asumiendo pocos usuarios)
    try:
        _send_document_notification(doc_dict)
    except Exception as e:
        print(f"Error general en envío de notificaciones: {e}")

    return jsonify(doc_dict), 201


@app.route('/api/documents/<doc_id>', methods=['PATCH'])
def api_update_document(doc_id):
    """
    Actualiza las normas ISO asociadas a un documento existente.

    Body JSON: { "standards": ["iso9001", "iso27001"] }
    Responde: JSON con id y standards actualizados, o 404 si no existe.
    """
    data      = request.get_json(silent=True) or {}
    standards = data.get('standards', [])

    if not isinstance(standards, list) or not all(s in VALID_STANDARDS for s in standards):
        return jsonify({'error': 'Standards invalidos'}), 400

    with _get_db() as conn:
        result = conn.execute(
            'UPDATE documents SET standards = ? WHERE id = ?',
            (json.dumps(standards), doc_id)
        )
        if result.rowcount == 0:
            return jsonify({'error': 'Documento no encontrado'}), 404

    return jsonify({'id': doc_id, 'standards': standards})


@app.route('/api/documents/<doc_id>', methods=['DELETE'])
def api_delete_document(doc_id):
    """
    Elimina un documento de la base de datos y su archivo en disco.

    Responde: 204 sin cuerpo, o 404 si no existe.
    """
    with _get_db() as conn:
        row = conn.execute('SELECT storage_path FROM documents WHERE id = ?', (doc_id,)).fetchone()
        if not row:
            return jsonify({'error': 'Documento no encontrado'}), 404
        storage_path = UPLOADS_DIR / row['storage_path']
        conn.execute('DELETE FROM documents WHERE id = ?', (doc_id,))

    try:
        storage_path.unlink(missing_ok=True)
    except OSError:
        pass

    return '', 204


@app.route('/api/documents/<doc_id>/file', methods=['GET'])
def api_serve_document(doc_id):
    """
    Sirve el archivo binario de un documento para visualización o descarga.

    Responde: el archivo con su content-type original, o 404 si no existe.
    """
    with _get_db() as conn:
        row = conn.execute('SELECT * FROM documents WHERE id = ?', (doc_id,)).fetchone()
    if not row:
        return jsonify({'error': 'Documento no encontrado'}), 404

    storage_path = UPLOADS_DIR / row['storage_path']
    if not storage_path.exists():
        return jsonify({'error': 'Archivo no encontrado en disco'}), 404

    return send_file(
        str(storage_path),
        mimetype=row['content_type'],
        as_attachment=False,
        download_name=row['file_name']
    )


# ── Authentication API endpoints (Local auth module) ──────────────────────────

def token_required(f):
    """Decorador para verificar que se incluya un token de autenticación local."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Token inválido'}), 401
        
        if not token:
            return jsonify({'error': 'Token requerido'}), 401
        
        # Get user_id from token (simplified) — en producción usar JWT
        # Por ahora aceptamos cualquier token válido (debe validarse en frontend)
        return f(token, *args, **kwargs)
    
    return decorated


@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    """
    Registra un nuevo usuario con autenticación local.
    
    Body JSON requerido:
      - username (str): Único, >= 3 caracteres
      - email (str): Único, email válido
      - password (str): >= 8 caracteres
      - first_name (str, opcional): Nombre
      - last_name (str, opcional): Apellido
    
    Responde: 201 con datos de usuario si exitoso, o 400 con error
    """
    data = request.get_json(silent=True) or {}
    
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    
    if not all([username, email, password]):
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    result = auth_service.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name
    )
    
    if 'error' in result:
        return jsonify(result), 400
    
    # En local sin SMTP, activar el usuario automáticamente para no bloquear pruebas.
    if not auth_service.is_smtp_configured():
        with auth_service.get_auth_db() as conn:
            conn.execute('UPDATE users SET email_verified = 1 WHERE id = ?', (result['id'],))
            conn.commit()
        return jsonify({
            **result,
            'message': 'Usuario registrado y verificado automaticamente (modo desarrollo).'
        }), 201

    # Con SMTP configurado, se usa verificación por email.
    import secrets
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.utcnow() + timedelta(hours=24)).isoformat()

    with auth_service.get_auth_db() as conn:
        conn.execute('''
            INSERT INTO email_verification_tokens (user_id, token, created_at, expires_at)
            VALUES (?, ?, ?, ?)
        ''', (result['id'], token, datetime.utcnow().isoformat(), expires_at))
        conn.commit()

    app_domain = request.args.get('app_domain', request.host_url.rstrip('/'))
    auth_service.send_verification_email(email, username, token, app_domain)

    return jsonify({
        **result,
        'message': 'Usuario registrado. Verifica tu email para continuar.'
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    """
    Autentica un usuario con credenciales locales.
    
    Body JSON:
      - username (str): Nombre de usuario
      - password (str): Contraseña
    
    Responde: 200 con token y datos del usuario, o 401/400 con error
    """
    data = request.get_json(silent=True) or {}
    
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not all([username, password]):
        return jsonify({'error': 'Usuario y contraseña requeridos'}), 400
    
    result = auth_service.authenticate_user(username, password)
    
    if 'error' in result:
        return jsonify(result), 401
    
    return jsonify(result), 200


@app.route('/api/auth/verify-email', methods=['POST'])
def auth_verify_email():
    """
    Verifica el email del usuario usando un token de verificación.
    
    Body JSON:
      - token (str): Token de verificación enviado por email
    
    Responde: 200 si exitoso, o 400 con error
    """
    data = request.get_json(silent=True) or {}
    token = data.get('token', '').strip()
    
    if not token:
        return jsonify({'error': 'Token requerido'}), 400
    
    with auth_service.get_auth_db() as conn:
        verify = conn.execute('''
            SELECT user_id, expires_at FROM email_verification_tokens 
            WHERE token = ? AND verified_at IS NULL
        ''', (token,)).fetchone()
        
        if not verify:
            return jsonify({'error': 'Token inválido'}), 400
        
        expires_at = datetime.fromisoformat(verify['expires_at'])
        if datetime.utcnow() > expires_at:
            return jsonify({'error': 'Token expirado'}), 400
        
        user_id = verify['user_id']
        
        # Marcar email como verificado
        conn.execute('''
            UPDATE users SET email_verified = 1 WHERE id = ?
        ''', (user_id,))
        
        # Marcar token como usado
        conn.execute('''
            UPDATE email_verification_tokens SET verified_at = ? WHERE token = ?
        ''', (datetime.utcnow().isoformat(), token))
        
        conn.commit()
    
    return jsonify({'success': True, 'message': 'Email verificado exitosamente'}), 200


@app.route('/api/auth/change-password', methods=['POST'])
def auth_change_password():
    """
    Cambia la contraseña de un usuario autenticado.
    
    Headers requerido:
      - Authorization: Bearer <user_id> (simplificado para este ejemplo)
    
    Body JSON:
      - old_password (str): Contraseña actual
      - new_password (str): Nueva contraseña (>= 8 caracteres)
    
    Responde: 200 si exitoso, o 400/401 con error
    """
    # Para este ejemplo simplificado, el user_id viene en el header
    # En producción, debería validar un JWT token
    user_id_str = request.headers.get('X-User-ID', '').strip()
    
    if not user_id_str or not user_id_str.isdigit():
        return jsonify({'error': 'Usuario no autenticado'}), 401
    
    user_id = int(user_id_str)
    data = request.get_json(silent=True) or {}
    
    old_password = data.get('old_password', '').strip()
    new_password = data.get('new_password', '').strip()
    
    if not all([old_password, new_password]):
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    result = auth_service.change_password(user_id, old_password, new_password)
    
    if 'error' in result:
        return jsonify(result), 400
    
    return jsonify(result), 200


@app.route('/api/auth/request-reset', methods=['POST'])
def auth_request_reset():
    """
    Solicita un reinicio de contraseña. Genera un token y envía email.
    
    Body JSON:
      - email (str): Email del usuario
    
    Responde: 200 siempre (por seguridad, no revela si existe o no)
    """
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip()
    
    if not email:
        return jsonify({'error': 'Email requerido'}), 400
    
    result = auth_service.request_password_reset(email)
    
    # Si el usuario existe, enviar email de recuperación
    if result.get('user_id'):
        from services.auth_service import send_reset_email
        app_domain = request.args.get('app_domain', request.host_url.rstrip('/'))
        send_reset_email(
            email=result['email'],
            username=result['username'],
            token=result['token'],
            app_domain=app_domain
        )
    
    response_payload = {
        'success': True,
        'message': 'Si el email está registrado, recibirás instrucciones de recuperación'
    }

    # En modo debug sin SMTP devolvemos token para pruebas locales end-to-end.
    if app.debug and not auth_service.is_smtp_configured() and result.get('token'):
        response_payload['debug_reset_token'] = result['token']

    # Por seguridad, en producción no se expone si el usuario existe.
    return jsonify(response_payload), 200


@app.route('/api/auth/verify-reset-token', methods=['POST'])
def auth_verify_reset_token():
    """
    Verifica si un token de recuperación es válido.
    
    Body JSON:
      - token (str): Token de restablecimiento
    
    Responde: 200 si válido, o 400 si inválido/expirado
    """
    data = request.get_json(silent=True) or {}
    token = data.get('token', '').strip()
    
    if not token:
        return jsonify({'error': 'Token requerido'}), 400
    
    result = auth_service.verify_reset_token(token)
    
    if 'error' in result:
        return jsonify(result), 400
    
    return jsonify({'valid': True}), 200


@app.route('/api/auth/reset-password', methods=['POST'])
def auth_reset_password():
    """
    Restablece la contraseña usando un token de recuperación válido.
    
    Body JSON:
      - token (str): Token de restablecimiento
      - new_password (str): Nueva contraseña (>= 8 caracteres)
    
    Responde: 200 si exitoso, o 400 con error
    """
    data = request.get_json(silent=True) or {}
    token = data.get('token', '').strip()
    new_password = data.get('new_password', '').strip()
    
    if not all([token, new_password]):
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    result = auth_service.reset_password_with_token(token, new_password)
    
    if 'error' in result:
        return jsonify(result), 400
    
    return jsonify(result), 200


@app.route('/api/auth/user/<int:user_id>', methods=['GET'])
def auth_get_user(user_id):
    """
    Obtiene información pública del usuario (sin contraseña).
    
    Headers opcional:
      - X-User-ID: El ID del usuario autenticado (para verificar permiso)
    
    Responde: 200 con datos del usuario, o 404 si no existe
    """
    user = auth_service.get_user_by_id(user_id)
    
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
    return jsonify(user), 200


@app.route('/', methods=['GET'])
def index():
    """Renderiza la página de inicio del cuestionario de diagnóstico (legacy)."""
    return render_template('index.html')

@app.route('/start', methods=['POST'])
def start_survey():
    """
    Inicia la sesión del cuestionario guardando nombre y email del participante.
    Redirige a /survey.
    """
    session['user_name'] = request.form.get('name')
    session['user_email'] = request.form.get('email')
    return redirect(url_for('survey'))

@app.route('/survey')
def survey():
    """
    Muestra el cuestionario de 30 preguntas.
    Requiere sesión activa (user_name); sin ella redirige a index.
    Renderiza: templates/survey.html
    """
    if 'user_name' not in session:
        return redirect(url_for('index'))
    
    # Sort questions by ID
    sorted_questions = dict(sorted(questions.QUESTIONS.items()))
    return render_template('survey.html', questions=sorted_questions)

@app.route('/submit', methods=['POST'])
def submit_survey():
    """
    Procesa las respuestas del cuestionario.
    Calcula puntuaciones por dimensión (con preguntas de puntuación inversa),
    guarda los resultados en sesión y redirige a /results.
    Requiere sesión activa.
    """
    if 'user_name' not in session:
        return redirect(url_for('index'))
        
    answers = {}
    for key, value in request.form.items():
        if key.isdigit():
            answers[int(key)] = int(value)
            
    # Calculate Scores
    scores = {}
    for dimension, q_ids in questions.DIMENSIONS.items():
        dim_score = 0
        for q_id in q_ids:
            score = answers.get(q_id, 0)
            if q_id in questions.REVERSE_SCORED:
                score = 6 - score
            dim_score += score
        scores[dimension] = dim_score
        
    session['scores'] = scores
    return redirect(url_for('results'))

@app.route('/results')
def results():
    """
    Muestra los resultados del cuestionario con gráfica radar y gráfica de barras.
    Requiere sesión con scores calculados.
    Renderiza: templates/results.html
    """
    if 'scores' not in session or 'user_name' not in session:
        return redirect(url_for('index'))
        
    scores = session['scores']
    
    # Generate charts for web display
    fig_radar = charts.create_radar_chart(scores)
    radar_b64 = charts.get_base64_chart(fig_radar)
    
    fig_bar = charts.create_bar_chart(scores)
    bar_b64 = charts.get_base64_chart(fig_bar)
    
    return render_template('results.html', 
                           name=session['user_name'], 
                           scores=scores, 
                           radar_chart=radar_b64, 
                           bar_chart=bar_b64)

@app.route('/download_pdf')
def download_pdf():
    """
    Genera y descarga el reporte PDF con los resultados del cuestionario.
    Requiere sesión activa con scores.
    """
    if 'scores' not in session or 'user_name' not in session:
        return redirect(url_for('index'))
        
    user_data = {"name": session['user_name'], "email": session['user_email']}
    scores = session['scores']
    
    pdf_path = report_generator.generate_pdf(user_data, scores)
    
    return send_file(pdf_path, as_attachment=True, download_name="Reporte_Gestion_Carrera.pdf")

@app.route('/send_email')
def send_email_route():
    """
    Genera el PDF y lo envía por correo al email del participante.
    Usa el servicio SMTP configurado en variables de entorno (SMTP_USER, SMTP_PASSWORD).
    Requiere sesión activa con scores.
    Responde: HTML simple con confirmación o mensaje de error.
    """
    if 'scores' not in session or 'user_name' not in session:
        return redirect(url_for('index'))
        
    user_data = {"name": session['user_name'], "email": session['user_email']}
    scores = session['scores']
    
    pdf_path = report_generator.generate_pdf(user_data, scores)
    
    subject = f"Tu Reporte de Gestión de Carrera - {user_data['name']}"
    body = f"Hola {user_data['name']},\n\nAdjunto encontrarás tu reporte de evaluación de dimensiones profesionales.\n\nSaludos,\nEquipo de Gestión de Carrera"
    
    success, result = email_service.send_email(user_data['email'], subject, body, pdf_path)
    
    # Simple feedback approach (Flash isn't set up in template, so we return a string or simple page for now)
    # Ideally should use flash messages.
    if success:
        return "<h1>Correo enviado exitosamente!</h1><a href='/results'>Volver</a>"
    else:
        return f"<h1>Error al enviar correo: {result}</h1><a href='/results'>Volver</a>"

if __name__ == '__main__':
    app.run(debug=True, port=5000)
