import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useLocalAuth } from '../context/LocalAuthContext';
import './ChangePassword.css';

const ChangePassword = ({ onSuccess }) => {
    const { changePassword, isLoading, error, success, clearMessages } = useLocalAuth();
    
    const [showPasswords, setShowPasswords] = useState({
        old: false,
        new: false,
        confirm: false
    });
    
    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    const [formError, setFormError] = useState('');

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setFormError('');
    };

    const validateForm = () => {
        if (!formData.oldPassword) {
            setFormError('La contraseña actual es requerida');
            return false;
        }
        if (!formData.newPassword) {
            setFormError('La nueva contraseña es requerida');
            return false;
        }
        if (formData.newPassword.length < 8) {
            setFormError('La nueva contraseña debe tener al menos 8 caracteres');
            return false;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            setFormError('Las contraseñas no coinciden');
            return false;
        }
        if (formData.oldPassword === formData.newPassword) {
            setFormError('La nueva contraseña debe ser diferente a la actual');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        const result = await changePassword(formData.oldPassword, formData.newPassword);
        
        if (result.success) {
            setFormData({
                oldPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            
            // Limpiar mensajes después de 3 segundos
            setTimeout(() => {
                clearMessages();
            }, 3000);
            
            if (onSuccess) {
                onSuccess();
            }
        }
    };

    return (
        <div className="change-password-container">
            <div className="change-password-card">
                <div className="change-password-header">
                    <Lock size={24} />
                    <h2>Cambiar Contraseña</h2>
                </div>

                <form onSubmit={handleSubmit} className="change-password-form">
                    {/* Contraseña Actual */}
                    <div className="form-group">
                        <label htmlFor="oldPassword">Contraseña Actual</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPasswords.old ? 'text' : 'password'}
                                id="oldPassword"
                                name="oldPassword"
                                value={formData.oldPassword}
                                onChange={handleInputChange}
                                placeholder="Ingresa tu contraseña actual"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('old')}
                                className="toggle-password-btn"
                                disabled={isLoading}
                            >
                                {showPasswords.old ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Nueva Contraseña */}
                    <div className="form-group">
                        <label htmlFor="newPassword">Nueva Contraseña</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPasswords.new ? 'text' : 'password'}
                                id="newPassword"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleInputChange}
                                placeholder="Mínimo 8 caracteres"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('new')}
                                className="toggle-password-btn"
                                disabled={isLoading}
                            >
                                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <small className="password-hint">
                            Debe tener al menos 8 caracteres
                        </small>
                    </div>

                    {/* Confirmar Contraseña */}
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                placeholder="Confirma tu nueva contraseña"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('confirm')}
                                className="toggle-password-btn"
                                disabled={isLoading}
                            >
                                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Mensajes de Error y Éxito */}
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

                    {/* Botones */}
                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Guardando...' : 'Cambiar Contraseña'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
