import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, Users, BotMessageSquare, ExternalLink, ClipboardList, ShieldCheck, LogOut, Eye, EyeOff } from 'lucide-react';
import { useERPAuth } from '../context/ERPAuthContext';
import './ERPDataCom.css';

const ERPDataCom = () => {
    const {
        authToken,
        userInfo,
        authChecked,
        completeLogin,
        logout,
        hasPermission,
        authApiBase
    } = useERPAuth();

    const [step, setStep] = useState(1);
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [totpCode, setTotpCode] = useState('');
    const [setupData, setSetupData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const parseApiResponse = async (response) => {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                return await response.json();
            } catch {
                return null;
            }
        }
        return null;
    };

    const unavailableServiceError =
        'El servicio de autenticacion ERP no esta disponible en este entorno. Configura VITE_ERP_AUTH_API_BASE o verifica el proxy.';

    const apps = [
        {
            id: 'erp_daia',
            name: 'DAIA',
            description: 'Inteligencia Artificial y Analisis de Documentos. Tu asistente inteligente.',
            url: 'http://10.11.121.58:8005',
            icon: <BotMessageSquare size={48} />,
            colorClass: 'card-blue'
        },
        {
            id: 'erp_prospeccion',
            name: 'PROSPECCION',
            description: 'Gestion de oportunidades, analisis de mercado y seguimiento de leads.',
            url: 'http://10.11.121.58:8080',
            icon: <Target size={48} />,
            colorClass: 'card-cyan'
        },
        {
            id: 'erp_crm',
            name: 'CRM',
            description: 'Administracion integral de la relacion con clientes y servicios.',
            url: 'http://10.11.121.58/',
            icon: <Users size={48} />,
            colorClass: 'card-dark'
        },
        {
            id: 'erp_acta',
            name: 'ACTA DE REUNIONES',
            description: 'Registro y seguimiento de actas, compromisos y acuerdos de reuniones.',
            url: 'http://10.11.121.58:8030/login',
            icon: <ClipboardList size={48} />,
            colorClass: 'card-green'
        }
    ];

    const resetAuthFlow = () => {
        setStep(1);
        setCredentials({ username: '', password: '' });
        setTotpCode('');
        setSetupData(null);
        setError('');
    };

    const handleInitialLogin = async (event) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${authApiBase}/api/api-token-auth/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            const data = await parseApiResponse(response);
            if (!response.ok) {
                throw new Error(data?.error || unavailableServiceError);
            }

            if (!data) {
                throw new Error(unavailableServiceError);
            }

            if (data.requires_2fa_setup) {
                setSetupData(data);
                setStep(2);
                return;
            }

            if (data.requires_2fa) {
                setStep(3);
                return;
            }

            if (data.token) {
                await completeLogin(data.token);
                resetAuthFlow();
            }
        } catch (requestError) {
            setError(requestError.message || 'No fue posible iniciar sesion.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetup2FA = async (event) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${authApiBase}/api/core/2fa/verify-setup/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: setupData?.user_id,
                    temp_secret: setupData?.temp_secret,
                    totp_code: totpCode
                })
            });

            const data = await parseApiResponse(response);
            if (!response.ok) {
                throw new Error(data?.error || unavailableServiceError);
            }

            if (!data) {
                throw new Error(unavailableServiceError);
            }

            await completeLogin(data.token);
            resetAuthFlow();
        } catch (requestError) {
            setError(requestError.message || 'No fue posible validar el codigo.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify2FA = async (event) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${authApiBase}/api/api-token-auth/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...credentials,
                    totp_code: totpCode
                })
            });

            const data = await parseApiResponse(response);
            if (!response.ok) {
                throw new Error(data?.error || unavailableServiceError);
            }

            if (!data) {
                throw new Error(unavailableServiceError);
            }

            await completeLogin(data.token);
            resetAuthFlow();
        } catch (requestError) {
            setError(requestError.message || 'Codigo de autenticacion invalido.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCardClick = (event, appUrl, appId, directLink = false) => {
        if (directLink) {
            window.open(appUrl, '_blank', 'noopener,noreferrer');
            return;
        }

        if (!authToken) {
            event.preventDefault();
            setError('Debes iniciar sesion primero para abrir aplicaciones ERP.');
            return;
        }

        if (!hasPermission(appId)) {
            event.preventDefault();
            setError('Tu rol no tiene permisos para esta aplicacion.');
            return;
        }

        const separator = appUrl.includes('?') ? '&' : '?';
        const targetUrl = `${appUrl}${separator}sso_token=${encodeURIComponent(authToken)}`;

        window.open(targetUrl, '_blank', 'noopener,noreferrer');
    };

    if (!authChecked) {
        return (
            <div className="erp-container erp-loading">
                <p>Validando sesion ERP...</p>
            </div>
        );
    }

    return (
        <div className="erp-container">
            <div className="erp-header">
                <h1>ERP DataCom</h1>
                <p>
                    {authToken
                        ? 'Acceso autenticado. Selecciona una aplicacion de la suite empresarial.'
                        : 'Inicia sesion con tus credenciales de CRM DataCom para habilitar el acceso.'}
                </p>
                {authToken && (
                    <div className="erp-session-bar">
                        <span>
                            Sesion activa: {userInfo?.full_name || userInfo?.username || 'Usuario DataCom'}
                        </span>
                        <button type="button" onClick={logout} className="erp-logout-btn">
                            <LogOut size={16} />
                            Cerrar sesion
                        </button>
                    </div>
                )}
            </div>

            <div className="erp-grid">
                {apps.map((app) => {
                    const disabled = authToken && !hasPermission(app.id);
                    return (
                        <button
                            key={app.id}
                            type="button"
                            onClick={(event) => handleCardClick(event, app.url, app.id, app.directLink)}
                            className={`erp-card ${app.colorClass} ${disabled ? 'erp-card-disabled' : ''}`}
                        >
                            <div className="card-icon-wrapper">
                                {app.icon}
                            </div>
                            <h2>{app.name}</h2>
                            <p>{app.description}</p>
                            <div className="card-footer">
                                <span>{disabled ? 'Sin permiso' : 'Abrir Aplicacion'}</span>
                                <ExternalLink size={20} />
                            </div>
                        </button>
                    );
                })}
            </div>

            {!authToken && (
                <div className="erp-auth-overlay" role="dialog" aria-modal="true">
                    <div className="erp-auth-card">
                        <h2>Acceso ERP DataCom</h2>
                        <p>Usa el mismo usuario y contrasena de CRM DataCom.</p>

                        {error && <div className="erp-auth-error">{error}</div>}

                        {step === 1 && (
                            <form className="erp-auth-form" onSubmit={handleInitialLogin}>
                                <label htmlFor="erp-username">Nombre de usuario</label>
                                <input
                                    id="erp-username"
                                    type="text"
                                    value={credentials.username}
                                    onChange={(event) => setCredentials((prev) => ({ ...prev, username: event.target.value }))}
                                    required
                                />

                                <label htmlFor="erp-password">Contrasena</label>
                                <div className="erp-password-input-wrap">
                                    <input
                                        id="erp-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={credentials.password}
                                        onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="erp-password-visibility-btn"
                                        onClick={() => setShowPassword((value) => !value)}
                                        aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                                        title={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <div className="erp-password-links">
                                    <Link to="/auth/password-recovery">Recuperar contrasena</Link>
                                    <Link to="/auth/change-password">Cambiar contrasena</Link>
                                </div>

                                <button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Verificando...' : 'Siguiente'}
                                </button>
                            </form>
                        )}

                        {step === 2 && setupData && (
                            <form className="erp-auth-form" onSubmit={handleSetup2FA}>
                                <div className="erp-2fa-title">
                                    <ShieldCheck size={20} />
                                    Configurar 2FA
                                </div>
                                <p>Escanea el QR en Google Authenticator o Authy e ingresa el codigo.</p>
                                <img src={setupData.qr_code} alt="QR 2FA" className="erp-qr-image" />

                                <label htmlFor="erp-setup-code">Codigo de 6 digitos</label>
                                <input
                                    id="erp-setup-code"
                                    type="text"
                                    value={totpCode}
                                    onChange={(event) => setTotpCode(event.target.value.replace(/[^0-9]/g, ''))}
                                    maxLength={6}
                                    required
                                />

                                <div className="erp-auth-actions">
                                    <button type="button" onClick={() => setStep(1)} disabled={isLoading} className="erp-secondary-btn">
                                        Volver
                                    </button>
                                    <button type="submit" disabled={isLoading || totpCode.length !== 6}>
                                        {isLoading ? 'Validando...' : 'Confirmar'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === 3 && (
                            <form className="erp-auth-form" onSubmit={handleVerify2FA}>
                                <div className="erp-2fa-title">
                                    <ShieldCheck size={20} />
                                    Verificacion 2FA
                                </div>
                                <p>Abre Google Authenticator y escribe el codigo actual.</p>

                                <label htmlFor="erp-verify-code">Codigo de 6 digitos</label>
                                <input
                                    id="erp-verify-code"
                                    type="text"
                                    value={totpCode}
                                    onChange={(event) => setTotpCode(event.target.value.replace(/[^0-9]/g, ''))}
                                    maxLength={6}
                                    required
                                />

                                <div className="erp-auth-actions">
                                    <button type="button" onClick={() => setStep(1)} disabled={isLoading} className="erp-secondary-btn">
                                        Volver
                                    </button>
                                    <button type="submit" disabled={isLoading || totpCode.length !== 6}>
                                        {isLoading ? 'Validando...' : 'Ingresar'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ERPDataCom;
