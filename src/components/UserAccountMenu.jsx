import React, { useState } from 'react';
import { useLocalAuth } from '../context/LocalAuthContext';
import { Settings, Lock, LogOut, Mail, User as UserIcon } from 'lucide-react';
import './UserAccountMenu.css';

/**
 * UserAccountMenu Component
 * 
 * Componente de ejemplo que muestra cómo integrar el módulo de autenticación
 * local en el header o menú de usuario.
 * 
 * USO:
 * - Agregar este componente en Header.jsx o crear un menú de usuario
 * - Mostrar solo cuando el usuario esté autenticado localmente
 */

const UserAccountMenu = () => {
    const { user, isAuthenticated, logout } = useLocalAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    if (!isAuthenticated || !user) {
        return null;
    }

    const handleLogout = () => {
        logout();
        setIsMenuOpen(false);
        // Opcionalmente redirigir a home o login
    };

    const handleChangePassword = () => {
        // Redirigir a la página de cambio de contraseña
        window.location.href = '/auth/change-password';
    };

    return (
        <div className="user-account-menu">
            {/* Botón para abrir/cerrar menú */}
            <button 
                className="account-toggle-btn"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                title="Menú de cuenta"
            >
                <UserIcon size={20} />
                <span className="user-name">
                    {user.first_name || user.username}
                </span>
            </button>

            {/* Menú desplegable */}
            {isMenuOpen && (
                <div className="account-dropdown">
                    <div className="account-header">
                        <div className="user-info">
                            <p className="user-display-name">
                                {user.first_name} {user.last_name}
                            </p>
                            <p className="user-email">{user.email}</p>
                        </div>
                    </div>

                    <div className="account-divider"></div>

                    <div className="account-menu-items">
                        <button 
                            className="account-menu-item"
                            onClick={handleChangePassword}
                        >
                            <Lock size={18} />
                            <span>Cambiar Contraseña</span>
                        </button>

                        <a 
                            href="/auth/password-recovery"
                            className="account-menu-item"
                        >
                            <Mail size={18} />
                            <span>Recuperar Contraseña</span>
                        </a>

                        <button 
                            className="account-menu-item settings"
                        >
                            <Settings size={18} />
                            <span>Configuración</span>
                        </button>
                    </div>

                    <div className="account-divider"></div>

                    <button 
                        className="account-menu-item logout"
                        onClick={handleLogout}
                    >
                        <LogOut size={18} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            )}

            {/* Cerrar menú al hacer clic fuera */}
            {isMenuOpen && (
                <div 
                    className="account-menu-backdrop"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}
        </div>
    );
};

export default UserAccountMenu;
