import React, { createContext, useContext, useState, useCallback } from 'react';

const LocalAuthContext = createContext(null);

const STORAGE_TOKEN_KEY = 'local_auth_token';
const STORAGE_USER_KEY = 'local_auth_user';

export const useLocalAuth = () => {
    const context = useContext(LocalAuthContext);
    if (!context) {
        throw new Error('useLocalAuth must be used within LocalAuthProvider');
    }
    return context;
};

const readStoredUser = () => {
    try {
        const raw = localStorage.getItem(STORAGE_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

// API base para autenticación local
const AUTH_API_BASE = '/api/auth';

export const LocalAuthProvider = ({ children }) => {
    const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    const storedUser = readStoredUser();

    const [token, setToken] = useState(storedToken || null);
    const [user, setUser] = useState(storedUser);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const clearMessages = () => {
        setError('');
        setSuccess('');
    };

    const register = useCallback(async (username, email, password, firstName = '', lastName = '') => {
        clearMessages();
        setIsLoading(true);

        try {
            const response = await fetch(`${AUTH_API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    first_name: firstName,
                    last_name: lastName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Error al registrarse');
                return { success: false, error: data.error };
            }

            setSuccess('Registrado exitosamente. Verifica tu email para activar tu cuenta.');
            return { success: true, data };
        } catch (err) {
            setError(err.message || 'Error de conexión');
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (username, password) => {
        clearMessages();
        setIsLoading(true);

        try {
            const response = await fetch(`${AUTH_API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Login fallido');
                return { success: false, error: data.error };
            }

            // Guardar token y usuario
            localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify({
                id: data.id,
                username: data.username,
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name
            }));

            setToken(data.token);
            setUser({
                id: data.id,
                username: data.username,
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name
            });

            setSuccess('Sesión iniciada exitosamente');
            return { success: true, data };
        } catch (err) {
            setError(err.message || 'Error de conexión');
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_USER_KEY);
        setToken(null);
        setUser(null);
        clearMessages();
    }, []);

    const verifyEmail = useCallback(async (verificationToken) => {
        clearMessages();
        setIsLoading(true);

        try {
            const response = await fetch(`${AUTH_API_BASE}/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: verificationToken })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Error al verificar email');
                return { success: false, error: data.error };
            }

            setSuccess('Email verificado exitosamente. Ahora puedes iniciar sesión.');
            return { success: true };
        } catch (err) {
            setError(err.message || 'Error de conexión');
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const changePassword = useCallback(async (oldPassword, newPassword) => {
        if (!user?.id) {
            setError('Usuario no autenticado');
            return { success: false, error: 'Usuario no autenticado' };
        }

        clearMessages();
        setIsLoading(true);

        try {
            const response = await fetch(`${AUTH_API_BASE}/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id.toString()
                },
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password: newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Error al cambiar contraseña');
                return { success: false, error: data.error };
            }

            setSuccess('Contraseña cambias exitosamente');
            return { success: true };
        } catch (err) {
            setError(err.message || 'Error de conexión');
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const requestPasswordReset = useCallback(async (email) => {
        clearMessages();
        setIsLoading(true);

        try {
            const response = await fetch(`${AUTH_API_BASE}/request-reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Error al solicitar recuperación');
                return { success: false, error: data.error };
            }

            setSuccess('Si el email está registrado, recibirás instrucciones de recuperación');
            return { success: true };
        } catch (err) {
            setError(err.message || 'Error de conexión');
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const verifyResetToken = useCallback(async (resetToken) => {
        clearMessages();
        setIsLoading(true);

        try {
            const response = await fetch(`${AUTH_API_BASE}/verify-reset-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: resetToken })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Token inválido');
                return { success: false, error: data.error };
            }

            return { success: true };
        } catch (err) {
            setError(err.message || 'Error de conexión');
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const resetPassword = useCallback(async (resetToken, newPassword) => {
        clearMessages();
        setIsLoading(true);

        try {
            const response = await fetch(`${AUTH_API_BASE}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: resetToken,
                    new_password: newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Error al restablecer contraseña');
                return { success: false, error: data.error };
            }

            setSuccess('Contraseña restablecida exitosamente');
            return { success: true };
        } catch (err) {
            setError(err.message || 'Error de conexión');
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const value = {
        token,
        user,
        isLoading,
        error,
        success,
        clearMessages,
        register,
        login,
        logout,
        verifyEmail,
        changePassword,
        requestPasswordReset,
        verifyResetToken,
        resetPassword,
        isAuthenticated: !!token && !!user
    };

    return (
        <LocalAuthContext.Provider value={value}>
            {children}
        </LocalAuthContext.Provider>
    );
};
