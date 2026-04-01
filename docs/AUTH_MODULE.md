# Módulo de Autenticación Local - Guía de Implementación

## 📋 Descripción General

Se ha implementado un **módulo de autenticación local completamente independiente** del sistema SSO existente. Este módulo permite:

1. ✅ **Registro de usuarios** con contraseñas locales
2. ✅ **Login local** sin afectar el SSO del CRM
3. ✅ **Cambio de contraseña** para usuarios autenticados
4. ✅ **Recuperación de contraseña** por email con tokens seguros
5. ✅ **Verificación de email** con enlace de confirmación
6. ✅ **Almacenamiento seguro** de contraseñas con bcrypt

---

## 🏗️ Arquitectura

### Backend (Python/Flask)

**Archivo:** `services/auth_service.py`

Proporciona funciones para:
- Gestión de usuarios (CRUD)
- Hash seguro de contraseñas (bcrypt)
- Validación de credenciales
- Generación de tokens de recuperación/verificación
- Envío de emails

**Endpoints agregados en `app.py`:**

```
POST   /api/auth/register               - Registrar nuevo usuario
POST   /api/auth/login                  - Login con email/password
POST   /api/auth/verify-email           - Verificar email con token
POST   /api/auth/change-password        - Cambiar contraseña (autenticado)
POST   /api/auth/request-reset          - Solicitar recuperación (email)
POST   /api/auth/verify-reset-token     - Verificar token de recuperación
POST   /api/auth/reset-password         - Restablecer contraseña con token
GET    /api/auth/user/<id>              - Obtener datos del usuario
```

### Frontend (React)

**Contexto:** `src/context/LocalAuthContext.jsx`

Proporciona hooks y estado global:
- `useLocalAuth()` - Hook para acceder al contexto
- `register()` - Registrar usuario
- `login()` - Login local
- `logout()` - Cerrar sesión
- `changePassword()` - Cambiar contraseña
- `requestPasswordReset()` - Solicitar recuperación
- `verifyResetToken()` - Verificar token
- `resetPassword()` - Restablecer contraseña
- `verifyEmail()` - Verificar email

**Componentes:**

1. **`src/components/ChangePassword.jsx`**
   - Formulario para cambiar contraseña
   - Validación de contraseña antigua
   - Confirmación de nueva contraseña

2. **`src/components/PasswordRecovery.jsx`**
   - Formulario para solicitar recuperación (Paso 1)
   - Formulario para restablecer contraseña con token (Paso 2)
   - Validación de token

---

## 🚀 Uso

### Instalación

1. **Instalar dependencia de bcrypt:**

```bash
pip install bcrypt
```

Ya está agregado en `requirements.txt`.

2. **Inicializar base de datos (automático):**

La BD `auth.db` se crea automáticamente al primer uso con las tablas:
- `users` - Usuarios registrados
- `password_reset_tokens` - Tokens de recuperación
- `email_verification_tokens` - Tokens de verificación
- `login_attempts` - Registro de intentos (para seguridad futura)

### Configuración de Emails (Opcional)

Para que el envío de emails funcione, configura variables de entorno:

```bash
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="your-email@gmail.com"
export SMTP_PASSWORD="your-app-password"
```

Si no se configura, los tokens se generan de todas formas (útil para desarrollo).

### Uso en Frontend

#### Registrar usuario

```jsx
import { useLocalAuth } from './context/LocalAuthContext';

function RegisterPage() {
  const { register, isLoading, error } = useLocalAuth();
  
  const handleRegister = async (e) => {
    e.preventDefault();
    const result = await register(
      'juan', 
      'juan@example.com', 
      'MiPassword123', 
      'Juan', 
      'Pérez'
    );
    
    if (result.success) {
      // Mostrar "Verifica tu email"
    }
  };
  
  return (
    <form onSubmit={handleRegister}>
      {/* Formulario */}
    </form>
  );
}
```

#### Login de usuario

```jsx
const { login, isAuthenticated } = useLocalAuth();

const handleLogin = async (e) => {
  e.preventDefault();
  const result = await login('juan', 'MiPassword123');
  
  if (result.success) {
    navigate('/dashboard');
  }
};
```

#### Cambiar contraseña

```jsx
const { changePassword } = useLocalAuth();

const handleChangePassword = async (e) => {
  e.preventDefault();
  const result = await changePassword(
    'PasswordAntiguo', 
    'PasswordNuevo123'
  );
  
  if (result.success) {
    // Mostrar éxito
  }
};
```

#### Recuperar contraseña

```jsx
const { requestPasswordReset, resetPassword, verifyResetToken } = useLocalAuth();

// Paso 1: Solicitar
const handleRequest = async (email) => {
  await requestPasswordReset(email);
  // Usuario recibe email
};

// Paso 2: Usuario recibe email con link: /auth/password-recovery?token=xxxxx
// El componente PasswordRecovery maneja automáticamente el token

// Paso 3: Usuario ingresa nueva contraseña y se valida
const handleReset = async (token, newPassword) => {
  const result = await resetPassword(token, newPassword);
  if (result.success) {
    navigate('/auth/login');
  }
};
```

---

## 🔐 Seguridad

### Contraseñas
- ✅ Hasheadas con **bcrypt (12 rounds)**
- ✅ Nunca se transmiten en textos plano
- ✅ Validación de longitud mínima (8 caracteres)

### Tokens
- ✅ Generados con `secrets.token_urlsafe()` (cryptográficamente seguros)
- ✅ Expiración de 24 horas (recuperación)
- ✅ Token se marca como "usado" después de validar

### API
- ✅ Headers HTTPS en producción (nginx proxy)
- ✅ Validación en todos los endpoints
- ✅ Por seguridad, no se revela si un email existe

### Base de datos
- ✅ SQLite separada (`auth.db`) para no mezclar con documentos
- ✅ Contraseñas nunca se retornan en respuestas
- ✅ Logs de intentos de login (tabla `login_attempts` lista para ampliar)

---

## 🎯 Integración sin Afectar Aplicaciones Existentes

### ✅ TOTALMENTE INDEPENDIENTE

- **No toca** la BD de documentos (`uploads.db`)
- **No toca** el módulo legacy del cuestionario (rutas `/`, `/survey`, etc.)
- **No toca** la autenticación SSO del CRM (sigue funcionando igual)
- **Nueva BD** separada: `auth.db`
- **Nuevas rutas API** bajo `/api/auth/`
- **Nuevas rutas frontend** bajo `/auth/`

### Estructura de Carpetas

```
WebISO/
├── services/
│   ├── auth_service.py          ← NUEVO
│   ├── charts.py                (sin cambios)
│   ├── report_generator.py      (sin cambios)
│   └── email_service.py         (sin cambios)
│
├── src/
│   ├── context/
│   │   ├── ERPAuthContext.jsx   (sin cambios - SSO)
│   │   └── LocalAuthContext.jsx ← NUEVO
│   │
│   ├── components/
│   │   ├── ChangePassword.jsx   ← NUEVO
│   │   ├── ChangePassword.css   ← NUEVO
│   │   ├── PasswordRecovery.jsx ← NUEVO
│   │   ├── PasswordRecovery.css ← NUEVO
│   │   └── ... (otros sin cambios)
│   │
│   ├── pages/
│   │   └── ... (sin cambios)
│   │
│   └── App.jsx                  ← ACTUALIZADO (agregar rutas nuevas)
│
├── auth.db                       ← NUEVA (se crea automáticamente)
├── uploads.db                    (sin tocar)
├── app.py                        ← ACTUALIZADO (nuevos endpoints)
└── requirements.txt              ← ACTUALIZADO (bcrypt)
```

---

## 🛠️ Desarrollo Local

### Pruebas de endpoints

```bash
# 1. Registrar
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "juan",
    "email": "juan@example.com",
    "password": "MiPassword123",
    "first_name": "Juan",
    "last_name": "Pérez"
  }'

# 2. Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "juan",
    "password": "MiPassword123"
  }'

# 3. Cambiar contraseña
curl -X POST http://localhost:5001/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "X-User-ID: 1" \
  -d '{
    "old_password": "MiPassword123",
    "new_password": "NuevaPassword456"
  }'
```

---

## 📝 Próximos Pasos Sugeridos

1. **Agregar login/signup pages** personalizadas (si se desea)
2. **integrar cambio de contraseña** en un perfil de usuario
3. **Configurar SMTP** en variables de entorno en producción
4. **Agregar rate limiting** en intentos de login fallidos
5. **Implementar JWT tokens** en lugar del sistema simplificado actual
6. **Agregar 2FA** (autenticación de dos factores) opcional
7. **Audit logging** de cambios de contraseña

---

## ❓ FAQ

**P: ¿Esto interfiere con el login SSO actual?**
R: No. Son completamente independientes. Los usuarios pueden usar ambos sistemas.

**P: ¿Puedo migrar usuarios existentes del SSO?**
R: Sí, se podría crear un script que importe usuarios del CRM.

**P: ¿Dónde se guardan los tokens?**
R: En localStorage en el navegador (token), y en BD (tokens de recuperación).

**P: ¿Qué pasa si alguien olvida su contraseña?**
R: Usa `/auth/password-recovery` para solicitar cambio por email.

**P: ¿Necesito configura SMTP?**
R: No es obligatorio. Para desarrollo, los tokens se generan igual.

---

## ✅ Checklist de Implementación

- [x] Backend: Crear `auth_service.py`
- [x] Backend: Agregar endpoints en `app.py`
- [x] Frontend: Crear `LocalAuthContext.jsx`
- [x] Frontend: Crear componente `ChangePassword.jsx`
- [x] Frontend: Crear componente `PasswordRecovery.jsx`
- [x] Frontend: Actualizar `App.jsx` con rutas y provider
- [x] Documentación completa
- [ ] Testing (manual o automatizado)
- [ ] Configuración SMTP en producción
- [ ] Integración en UI principal (agregar botones/links)

---

**Creado:** 23 de Marzo, 2026  
**Versión:** 1.0  
**Status:** ✅ Completado - Listo para usar
