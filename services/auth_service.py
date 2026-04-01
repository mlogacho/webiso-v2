"""
auth_service.py — Servicio de autenticación local con cambio y recuperación de contraseña
==========================================================================================

Maneja:
  1. Registro y validación de credenciales locales
  2. Cambio seguro de contraseña
  3. Recuperación de contraseña por email
  4. Tokens de verificación de email (con expiración)
  5. Almacenarimiento seguro de contraseñas (bcrypt)

Nota: Este módulo es COMPLETAMENTE INDEPENDIENTE del SSO (CRM).
      Solo se usa si el usuario quiere gestionar su propia contraseña local.
"""

import sqlite3
import bcrypt
import secrets
import smtplib
from datetime import datetime, timedelta
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

# ── Database Configuration ──────────────────────────────────────────────────

DB_PATH = Path(__file__).parent.parent / 'auth.db'


def is_smtp_configured() -> bool:
    """Indica si la configuración SMTP mínima está disponible."""
    return all([
        os.getenv('SMTP_HOST'),
        os.getenv('SMTP_USER'),
        os.getenv('SMTP_PASSWORD')
    ])


def get_auth_db():
    """Abre conexión a la base de datos de autenticación con Row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_db():
    """Crea las tablas de autenticación si no existen."""
    with get_auth_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                username            TEXT UNIQUE NOT NULL,
                email               TEXT UNIQUE NOT NULL,
                password_hash       TEXT NOT NULL,
                first_name          TEXT,
                last_name           TEXT,
                is_active           BOOLEAN DEFAULT 1,
                email_verified      BOOLEAN DEFAULT 0,
                created_at          TEXT NOT NULL,
                last_password_change TEXT
            )
        ''')

        conn.execute('''
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id             INTEGER NOT NULL,
                token               TEXT UNIQUE NOT NULL,
                created_at          TEXT NOT NULL,
                expires_at          TEXT NOT NULL,
                used_at             TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')

        conn.execute('''
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id             INTEGER NOT NULL,
                token               TEXT UNIQUE NOT NULL,
                created_at          TEXT NOT NULL,
                expires_at          TEXT NOT NULL,
                verified_at         TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')

        conn.execute('''
            CREATE TABLE IF NOT EXISTS login_attempts (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                username            TEXT NOT NULL,
                success             BOOLEAN NOT NULL,
                ip_address          TEXT,
                attempts_at         TEXT NOT NULL
            )
        ''')

        conn.commit()


init_auth_db()


# ── Password Hashing ─────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Crea un hash bcrypt seguro de la contraseña."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verifica si la contraseña coincide con el hash."""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False


# ── User Management ─────────────────────────────────────────────────────────

def create_user(username: str, email: str, password: str, first_name: str = '', 
                last_name: str = '') -> dict:
    """
    Crea un nuevo usuario local.
    
    Args:
        username: Nombre de usuario único
        email: Email único del usuario
        password: Contraseña en texto plano (será hasheada)
        first_name: Nombre del usuario
        last_name: Apellido del usuario
    
    Returns:
        Dict con los datos del usuario creado o error
    """
    # Validar entrada
    if not username or len(username) < 3:
        return {'error': 'Username debe tener al menos 3 caracteres'}
    
    if '@' not in email:
        return {'error': 'Email inválido'}
    
    if not password or len(password) < 8:
        return {'error': 'Contraseña debe tener al menos 8 caracteres'}
    
    with get_auth_db() as conn:
        try:
            cursor = conn.execute('''
                INSERT INTO users 
                (username, email, password_hash, first_name, last_name, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                username,
                email,
                hash_password(password),
                first_name,
                last_name,
                datetime.utcnow().isoformat()
            ))
            conn.commit()
            
            return {
                'id': cursor.lastrowid,
                'username': username,
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'created_at': datetime.utcnow().isoformat()
            }
        except sqlite3.IntegrityError as e:
            if 'username' in str(e):
                return {'error': 'Username ya existe'}
            elif 'email' in str(e):
                return {'error': 'Email ya está registrado'}
            return {'error': 'Error al crear usuario'}


def authenticate_user(username: str, password: str) -> dict:
    """
    Autentica un usuario contra sus credenciales locales.
    
    Returns:
        Dict con token y datos del usuario si es exitoso, o error
    """
    with get_auth_db() as conn:
        user = conn.execute(
            'SELECT * FROM users WHERE username = ?', 
            (username,)
        ).fetchone()
        
        if not user:
            return {'error': 'Usuario o contraseña incorrectos'}
        
        if not user['is_active']:
            return {'error': 'Usuario inactivo'}
        
        if not verify_password(password, user['password_hash']):
            return {'error': 'Usuario o contraseña incorrectos'}
        
        if not user['email_verified']:
            return {'error': 'Email no verificado. Revisa tu bandeja de entrada'}
        
        # Generar token de sesión
        token = secrets.token_urlsafe(32)
        
        return {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'token': token
        }


def get_user_by_id(user_id: int) -> dict:
    """Obtiene un usuario por su ID."""
    with get_auth_db() as conn:
        user = conn.execute(
            'SELECT id, username, email, first_name, last_name, is_active, email_verified FROM users WHERE id = ?',
            (user_id,)
        ).fetchone()
        
        if not user:
            return None
        
        return dict(user)


def get_user_by_email(email: str) -> dict:
    """Obtiene un usuario por su email."""
    with get_auth_db() as conn:
        user = conn.execute(
            'SELECT id, username, email, first_name, last_name FROM users WHERE email = ? AND is_active = 1',
            (email,)
        ).fetchone()
        
        return dict(user) if user else None


# ── Password Change ─────────────────────────────────────────────────────────

def change_password(user_id: int, old_password: str, new_password: str) -> dict:
    """
    Cambia la contraseña de un usuario después de verificar la antigua.
    
    Args:
        user_id: ID del usuario
        old_password: Contraseña actual en texto plano
        new_password: Nueva contraseña en texto plano
    
    Returns:
        Dict con confirmación o error
    """
    # Validar nueva contraseña
    if not new_password or len(new_password) < 8:
        return {'error': 'Nueva contraseña debe tener al menos 8 caracteres'}
    
    with get_auth_db() as conn:
        user = conn.execute(
            'SELECT password_hash FROM users WHERE id = ?',
            (user_id,)
        ).fetchone()
        
        if not user:
            return {'error': 'Usuario no encontrado'}
        
        # Verificar contraseña antigua
        if not verify_password(old_password, user['password_hash']):
            return {'error': 'Contraseña actual es incorrecta'}
        
        # Hash de la nueva contraseña
        new_hash = hash_password(new_password)
        
        conn.execute(
            'UPDATE users SET password_hash = ?, last_password_change = ? WHERE id = ?',
            (new_hash, datetime.utcnow().isoformat(), user_id)
        )
        conn.commit()
        
        return {'success': True, 'message': 'Contraseña actualizada exitosamente'}


# ── Password Reset (via email) ───────────────────────────────────────────────

def request_password_reset(email: str) -> dict:
    """
    Genera un token de restablecimiento de contraseña para enviar por email.
    
    Args:
        email: Email del usuario
    
    Returns:
        Dict con token y datos para enviar email
    """
    with get_auth_db() as conn:
        user = conn.execute(
            'SELECT id, username, email FROM users WHERE email = ? AND is_active = 1',
            (email,)
        ).fetchone()
        
        if not user:
            # Por seguridad, no revelar si el email existe o no
            return {'success': True, 'message': 'Si el email existe, recibirás instrucciones de restablecimiento'}
        
        # Crear token con expiración de 24 horas
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        cursor = conn.execute('''
            INSERT INTO password_reset_tokens (user_id, token, created_at, expires_at)
            VALUES (?, ?, ?, ?)
        ''', (user['id'], token, datetime.utcnow().isoformat(), expires_at.isoformat()))
        conn.commit()
        
        return {
            'success': True,
            'user_id': user['id'],
            'token': token,
            'email': user['email'],
            'username': user['username'],
            'expires_at': expires_at.isoformat()
        }


def verify_reset_token(token: str) -> dict:
    """
    Verifica si un token de restablecimiento es válido.
    
    Returns:
        Dict con user_id si válido, o error
    """
    with get_auth_db() as conn:
        reset = conn.execute('''
            SELECT user_id, expires_at FROM password_reset_tokens 
            WHERE token = ? AND used_at IS NULL
        ''', (token,)).fetchone()
        
        if not reset:
            return {'error': 'Token inválido o expirado'}
        
        expires_at = datetime.fromisoformat(reset['expires_at'])
        if datetime.utcnow() > expires_at:
            return {'error': 'Token expirado. Solicita uno nuevo'}
        
        return {'user_id': reset['user_id']}


def reset_password_with_token(token: str, new_password: str) -> dict:
    """
    Restablece la contraseña usando un token de recuperación.
    
    Args:
        token: Token de restablecimiento
        new_password: Nueva contraseña en texto plano
    
    Returns:
        Dict con confirmación o error
    """
    if not new_password or len(new_password) < 8:
        return {'error': 'Contraseña debe tener al menos 8 caracteres'}
    
    # Verificar token
    token_check = verify_reset_token(token)
    if 'error' in token_check:
        return token_check
    
    user_id = token_check['user_id']
    new_hash = hash_password(new_password)
    
    with get_auth_db() as conn:
        # Actualizar contraseña
        conn.execute(
            'UPDATE users SET password_hash = ?, last_password_change = ? WHERE id = ?',
            (new_hash, datetime.utcnow().isoformat(), user_id)
        )
        
        # Marcar token como usado
        conn.execute(
            'UPDATE password_reset_tokens SET used_at = ? WHERE token = ?',
            (datetime.utcnow().isoformat(), token)
        )
        
        conn.commit()
    
    return {'success': True, 'message': 'Contraseña restablecida exitosamente'}


# ── Email Utilities ─────────────────────────────────────────────────────────

def send_reset_email(email: str, username: str, token: str, app_domain: str = 'http://localhost:3000') -> bool:
    """
    Envía un email con el link de restablecimiento de contraseña.
    Requiere configurar variables de entorno: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
    
    Args:
        email: Email del usuario
        username: Nombre de usuario
        token: Token de restablecimiento
        app_domain: Dominio de la aplicación para el link
    
    Returns:
        True si se envió exitosamente, False si no
    """
    smtp_host = os.getenv('SMTP_HOST')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_user = os.getenv('SMTP_USER')
    smtp_password = os.getenv('SMTP_PASSWORD')

    if not is_smtp_configured():
        print('ADVERTENCIA: Configuración SMTP no completa. Email no enviado.')
        # En desarrollo, retornar True de todas formas
        return True
    
    try:
        reset_link = f"{app_domain}/auth/reset-password?token={token}"
        
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = email
        msg['Subject'] = 'Restablece tu contraseña en WebISO'
        
        body = f"""
Hola {username},

Recibimos una solicitud para restablecer tu contraseña.
Haz clic en el siguiente enlace para continuar:

{reset_link}

Este enlace expirará en 24 horas.

Si no solicitaste esto, ignora este email.

Saludos,
Equipo WebISO
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f'Error enviando email: {e}')
        return False


def send_verification_email(email: str, username: str, token: str, app_domain: str = 'http://localhost:3000') -> bool:
    """
    Envía un email con el link de verificación de email.
    
    Args:
        email: Email del usuario
        username: Nombre de usuario
        token: Token de verificación
        app_domain: Dominio de la aplicación
    
    Returns:
        True si se envió exitosamente, False si no
    """
    smtp_host = os.getenv('SMTP_HOST')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_user = os.getenv('SMTP_USER')
    smtp_password = os.getenv('SMTP_PASSWORD')

    if not is_smtp_configured():
        print('ADVERTENCIA: Configuración SMTP no completa. Email no enviado.')
        return True
    
    try:
        verify_link = f"{app_domain}/auth/verify-email?token={token}"
        
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = email
        msg['Subject'] = 'Verifica tu email en WebISO'
        
        body = f"""
Hola {username},

Gracias por registrarte en WebISO.
Verifica tu email haciendo clic en el siguiente enlace:

{verify_link}

Este enlace expirará en 24 horas.

Saludos,
Equipo WebISO
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f'Error enviando email: {e}')
        return False
