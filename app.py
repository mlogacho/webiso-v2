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
from services import charts, report_generator, email_service
import os
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from werkzeug.utils import secure_filename

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
    return jsonify(_row_to_dict(row)), 201


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


@app.route('/')
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
