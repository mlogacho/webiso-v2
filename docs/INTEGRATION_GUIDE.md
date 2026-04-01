# Guía de Integración - UserAccountMenu en Header

## 📌 Descripción

El componente `UserAccountMenu.jsx` proporciona una forma fácil de integrar el módulo de autenticación local en tu aplicación existente, **sin interrumpir nada**.

## 🎯 Cómo Utilizarlo

### Paso 1: Importar el componente

En tu `Header.jsx`, agregar:

```jsx
import UserAccountMenu from './UserAccountMenu';
import { useLocalAuth } from '../context/LocalAuthContext';
```

### Paso 2: Insertar en el Header

Ejemplo de integración en `Header.jsx`:

```jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useERPAuth } from '../context/ERPAuthContext';
import { useLocalAuth } from '../context/LocalAuthContext';
import UserAccountMenu from './UserAccountMenu';
import logo from '../assets/logo.png';
import './Header.css';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const { authToken, userInfo, hasPermission } = useERPAuth();
    const { isAuthenticated: isLocalAuthenticatedUser } = useLocalAuth();

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const canViewAdmin = Boolean(authToken && (userInfo?.is_superuser || hasPermission('erp_admin')));

    return (
        <header className="header">
            <div className="container header-content">
                <a href="https://datacom.ec/" target="_blank" rel="noopener noreferrer" className="logo-section">
                    <img src={logo} alt="DataCom Logo" className="logo-image" />
                </a>

                <nav className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
                    <NavLink to="/" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
                        Inicio
                    </NavLink>
                    <NavLink to="/process-map" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
                        Mapa de Procesos
                    </NavLink>
                    <NavLink to="/iso-9001" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
                        ISO 9001
                    </NavLink>
                    <NavLink to="/iso-27001" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
                        ISO 27001
                    </NavLink>
                    <NavLink to="/erp-datacom" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
                        ERP DataCom
                    </NavLink>
                    {canViewAdmin && (
                        <NavLink to="/erp-admin" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
                            Admin ERP
                        </NavLink>
                    )}
                </nav>

                {/* Agregar UserAccountMenu aquí */}
                {isLocalAuthenticatedUser && (
                    <div className="user-menu-section">
                        <UserAccountMenu />
                    </div>
                )}

                <button className="menu-toggle" onClick={toggleMenu}>
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
        </header>
    );
};

export default Header;
```

### Paso 3: (Opcional) Actualizar estilos en Header.css

Si deseas alinear mejor el `UserAccountMenu`, agregar en tu `Header.css`:

```css
.header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    /* ... resto de estilos ... */
}

.user-menu-section {
    display: flex;
    align-items: center;
    margin-left: auto;
}

@media (max-width: 768px) {
    .user-menu-section {
        position: absolute;
        top: 1rem;
        right: 3rem;
    }
}
```

## ⚙️ Comportamiento

El componente `UserAccountMenu`:
- ✅ Se muestra **SOLO** si el usuario está autenticado localmente
- ✅ **NO interfiere** con el SSO del CRM
- ✅ Permite **cambiar contraseña**
- ✅ Permite **recuperar contraseña**
- ✅ Permite **cerrar sesión local**
- ✅ Totalmente responsive

## 🔄 Flujos de Usuario

### Caso 1: Usuario solo con SSO (CRM)
```
Header muestra: Solo el menú de navegación
UserAccountMenu: NO se muestra
```

### Caso 2: Usuario solo con autenticación local
```
Header muestra: Menú de navegación + UserAccountMenu
UserAccountMenu: Se muestra con opciones de cambiar/recuperar contraseña
```

### Caso 3: Usuario con ambos (SSO + Local)
```
Header muestra: Ambos componentes
Comportamiento: Completamente independientes
```

## 📱 Responsive

En dispositivos móviles:
- El nombre de usuario se oculta
- Solo se muestra el ícono del usuario
- El menú desplegable se ajusta al ancho disponible

## 🚫 Lo que NO se modifica

- ✅ Header.jsx existente (compatibilidad total)
- ✅ ERPAuthContext (no toca SSO)
- ✅ Otras páginas y componentes
- ✅ Rutas del cuestionario legacy

## 💡 Alternativas

Si no deseas usar `UserAccountMenu`, puedes crear tu propio componente usando `useLocalAuth()`:

```jsx
import { useLocalAuth } from './context/LocalAuthContext';

function MyCustomMenu() {
    const { user, isAuthenticated, logout } = useLocalAuth();
    
    if (!isAuthenticated) return null;
    
    return (
        <div>
            <p>Hola, {user.first_name}</p>
            <button onClick={() => window.location.href = '/auth/change-password'}>
                Cambiar contraseña
            </button>
            <button onClick={logout}>Logout</button>
        </div>
    );
}
```

---

## ✅ Checklist

- [ ] Copiar `UserAccountMenu.jsx` y `UserAccountMenu.css`
- [ ] Importar en `Header.jsx`
- [ ] Agregar en el JSX del Header
- [ ] (Opcional) Ajustar estilos CSS según tu diseño
- [ ] Probar con usuario localmente autenticado
- [ ] Probar con usuario SSO (no debe afectar)
- [ ] Probar responsive en móvil

---

**Status:** ✅ Listo para integrar  
**Compatibilidad:** 100% - No rompe nada existente
