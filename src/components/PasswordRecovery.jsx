import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useLocalAuth } from '../context/LocalAuthContext';
import './PasswordRecovery.css';

const PasswordRecovery = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { 
        requestPasswordReset, 
        verifyResetToken, 
        resetPassword, 
        isLoading, 
        error, 
        success, 
        clearMessages 
    } = useLocalAuth();
    
    const resetToken = searchParams.get('token');
    const [step, setStep] = useState(resetToken ? 'reset' : 'request');
    const [tokenValid, setTokenValid] = useState(false);
    
    const [email, setEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [resetData, setResetData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    
    const [formError, setFormError] = useState('');

    // Verificar token al cargar
    useEffect(() => {
        const checkToken = async () => {
            if (resetToken) {
                const result = await verifyResetToken(resetToken);
                if (result.success) {
                    setTokenValid(true);
                } else {
                    setStep('request');
                    setFormError('Token inválido o expirado');
                }
            }
        };
        
        checkToken();
    }, [resetToken, verifyResetToken]);

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        setFormError('');
    };

    const handleResetDataChange = (e) => {
        const { name, value } = e.target;
        setResetData(prev => ({
            ...prev,
            [name]: value
        }));
        setFormError('');
    };

    const togglePasswordVisibility = (field) => {
        if (field === 'new') {
            setShowPassword(!showPassword);
        } else {
            setShowConfirmPassword(!showConfirmPassword);
        }
    };

    const validateEmail = () => {
        if (!email) {
            setFormError('El email es requerido');
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFormError('Email inválido');
            return false;
        }
        return true;
    };

    const validateResetForm = () => {
        if (!resetData.newPassword) {
            setFormError('La nueva contraseña es requerida');
            return false;
        }
        if (resetData.newPassword.length < 8) {
            setFormError('La contraseña debe tener al menos 8 caracteres');
            return false;
        }
        if (resetData.newPassword !== resetData.confirmPassword) {
            setFormError('Las contraseñas no coinciden');
            return false;
        }
        return true;
    };

    const handleRequestReset = async (e) => {
        e.preventDefault();
        
        if (!validateEmail()) {
            return;
        }

        // Limpiar errores
        setFormError('');
        
        const result = await requestPasswordReset(email);
        
        if (result.success) {
            setEmail('');
            // Esperar 3 segundos antes de volver
            setTimeout(() => {
                clearMessages();
            }, 3000);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        
        if (!validateResetForm()) {
            return;
        }

        setFormError('');
        
        const result = await resetPassword(resetToken, resetData.newPassword);
        
        if (result.success) {
            setResetData({
                newPassword: '',
                confirmPassword: ''
            });
            
            setTimeout(() => {
                clearMessages();
                navigate('/auth/login');
            }, 2000);
        }
    };

    return (
        <div className="password-recovery-container">
            <div className="password-recovery-card">
                {/* Header */}
                <div className="recovery-header">
                    <button 
                        className="back-btn"
                        onClick={() => navigate(-1)}
                        title="Volver atrás"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="recovery-title">
                        <Lock size={28} />
                        <h1>Recuperar Contraseña</h1>
                    </div>
                </div>

                {/* Paso 1: Solicitar Recuperación */}
                {step === 'request' && (
                    <form onSubmit={handleRequestReset} className="recovery-form">
                        <p className="recovery-description">
                            Ingresa tu email para recibir instrucciones de recuperación
                        </p>

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <div className="input-wrapper">
                                <Mail size={18} />
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    placeholder="tu@email.com"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        {(error || formError) && (
                            <div className="alert alert-error">
                                {error || formError}
                            </div>
                        )}

                        {success && (
                            <div className="alert alert-success">
                                {success}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Enviando...' : 'Enviar Instrucciones'}
                        </button>

                        <p className="recovery-footer">
                            ¿Recuerdas tu contraseña? <a href="/auth/login">Inicia sesión</a>
                        </p>
                    </form>
                )}

                {/* Paso 2: Restablecer Contraseña */}
                {step === 'reset' && tokenValid && (
                    <form onSubmit={handleReset} className="recovery-form">
                        <p className="recovery-description">
                            Ingresa tu nueva contraseña
                        </p>

                        <div className="form-group">
                            <label htmlFor="newPassword">Nueva Contraseña</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="newPassword"
                                    name="newPassword"
                                    value={resetData.newPassword}
                                    onChange={handleResetDataChange}
                                    placeholder="Mínimo 8 caracteres"
                                    disabled={isLoading}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility('new')}
                                    className="toggle-password-btn"
                                    disabled={isLoading}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <small className="password-hint">
                                Debe tener al menos 8 caracteres
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={resetData.confirmPassword}
                                    onChange={handleResetDataChange}
                                    placeholder="Confirma tu contraseña"
                                    disabled={isLoading}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility('confirm')}
                                    className="toggle-password-btn"
                                    disabled={isLoading}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {(error || formError) && (
                            <div className="alert alert-error">
                                {error || formError}
                            </div>
                        )}

                        {success && (
                            <div className="alert alert-success">
                                {success}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Guardando...' : 'Restablecer Contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PasswordRecovery;
