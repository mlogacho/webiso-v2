"""
services/email_service.py
=========================
Servicio de envío de correo electrónico para WebISO v2.

Envía mensajes SMTP con adjuntos opcionales (reportes PDF).
La configuración del servidor SMTP se lee exclusivamente desde variables
de entorno para evitar credenciales en el código fuente:

  SMTP_SERVER   Servidor SMTP (por defecto: smtp.gmail.com)
  SMTP_PORT     Puerto SMTP   (por defecto: 587, STARTTLS)
  SMTP_USER     Dirección de correo remitente
  SMTP_PASSWORD Contraseña o App Password del remitente
"""
import smtplib
from email.message import EmailMessage
import os

def send_email(recipient_email, subject, body, attachment_path=None):
    """
    Sends an email with an optional attachment.
    """
    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        return False, "SMTP variables not set (SMTP_USER, SMTP_PASSWORD)"

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = smtp_user
    msg['To'] = recipient_email
    msg.set_content(body)

    if attachment_path:
        with open(attachment_path, 'rb') as f:
            file_data = f.read()
            file_name = os.path.basename(attachment_path)
        
        msg.add_attachment(file_data, maintype='application', subtype='pdf', filename=file_name)

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        return True, "Email sent successfully"
    except Exception as e:
        return False, str(e)
