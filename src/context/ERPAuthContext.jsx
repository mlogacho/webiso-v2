import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ERPAuthContext = createContext(null);

const SESSION_TOKEN_KEY = 'erp_datacom_token';

export const useERPAuth = () => {
    const context = useContext(ERPAuthContext);
    if (!context) {
        throw new Error('useERPAuth must be used within ERPAuthProvider');
    }
    return context;
};

export const ERPAuthProvider = ({ children }) => {
    const [authToken, setAuthToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);

    const authApiBase = useMemo(() => `http://${window.location.hostname}`, []);

    const validateToken = async (token) => {
        const response = await fetch(`${authApiBase}/api/core/user-permissions/`, {
            method: 'GET',
            headers: { Authorization: `Token ${token}` }
        });

        if (!response.ok) {
            throw new Error('Invalid token');
        }

        return response.json();
    };

    const refreshUserInfo = async () => {
        if (!authToken) {
            return null;
        }

        const permissions = await validateToken(authToken);
        setUserInfo(permissions);
        return permissions;
    };

    const completeLogin = async (token) => {
        const permissions = await validateToken(token);
        sessionStorage.setItem(SESSION_TOKEN_KEY, token);
        setAuthToken(token);
        setUserInfo(permissions);
    };

    const logout = () => {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        setAuthToken(null);
        setUserInfo(null);
    };

    const hasPermission = (permissionId) => {
        if (!userInfo) {
            return false;
        }

        if (userInfo.is_superuser) {
            return true;
        }

        const allowed = userInfo.allowed_views || [];
        return allowed.includes(permissionId);
    };

    useEffect(() => {
        const bootstrap = async () => {
            const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
            if (!token) {
                setAuthChecked(true);
                return;
            }

            try {
                const permissions = await validateToken(token);
                setAuthToken(token);
                setUserInfo(permissions);
            } catch {
                sessionStorage.removeItem(SESSION_TOKEN_KEY);
                setAuthToken(null);
                setUserInfo(null);
            } finally {
                setAuthChecked(true);
            }
        };

        bootstrap();
    }, []);

    return (
        <ERPAuthContext.Provider
            value={{
                authApiBase,
                authToken,
                userInfo,
                authChecked,
                completeLogin,
                refreshUserInfo,
                logout,
                hasPermission
            }}
        >
            {children}
        </ERPAuthContext.Provider>
    );
};
