import React, { createContext, useContext, useEffect, useState } from 'react';

const ERPAuthContext = createContext(null);

const STORAGE_TOKEN_KEY = 'erp_datacom_token';
const STORAGE_USER_KEY = 'erp_datacom_user';

export const useERPAuth = () => {
    const context = useContext(ERPAuthContext);
    if (!context) {
        throw new Error('useERPAuth must be used within ERPAuthProvider');
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

const safeReadJson = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        return null;
    }

    try {
        return await response.json();
    } catch {
        return null;
    }
};

// CRM auth API base — configurable for local testing.
// Example: VITE_ERP_AUTH_API_BASE=http://10.11.121.58
const AUTH_API_BASE = import.meta.env.VITE_ERP_AUTH_API_BASE ||
    (typeof window !== 'undefined' ? `${window.location.origin}` : '');

export const ERPAuthProvider = ({ children }) => {
    const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    const storedUser = readStoredUser();

    const [authToken, setAuthToken] = useState(storedToken || null);
    const [userInfo, setUserInfo] = useState(storedUser);
    // Always start as false so we never flash the authenticated view before the
    // stored token has been validated. authChecked becomes true only after the
    // useEffect validation completes (or aborts on unmount).
    const [authChecked, setAuthChecked] = useState(false);

    // Validates token against the CRM backend using the provided AbortSignal.
    // Returns permissions object on success, null on any non-401 failure (keeps session).
    // Throws on explicit 401 (clears session).
    const validateToken = async (token, signal) => {
        let response;
        try {
            response = await fetch(`${AUTH_API_BASE}/api/core/user-permissions/`, {
                method: 'GET',
                headers: { Authorization: `Token ${token}` },
                signal
            });
        } catch (err) {
            if (err.name === 'AbortError') throw err; // propagate so caller can distinguish
            // Network / CORS / proxy error — keep existing session
            return null;
        }

        // Only 401 means the token is definitively invalid
        if (response.status === 401) {
            const err = new Error('Token expired');
            err.status = 401;
            throw err;
        }

        // Any other non-ok (502, 503, 404...) — keep session, server may be temporarily down
        if (!response.ok) {
            return null;
        }

        return safeReadJson(response);
    };

    const refreshUserInfo = async () => {
        if (!authToken) {
            return null;
        }

        const permissions = await validateToken(authToken, null);
        if (permissions) {
            setUserInfo(permissions);
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(permissions));
        }
        return permissions;
    };

    const completeLogin = async (token) => {
        const response = await fetch(`${AUTH_API_BASE}/api/core/user-permissions/`, {
            method: 'GET',
            headers: { Authorization: `Token ${token}` }
        });

        if (!response.ok) {
            throw new Error('Token invalid');
        }

        const permissions = await safeReadJson(response);
        if (!permissions) {
            throw new Error('No fue posible leer permisos de usuario desde CRM.');
        }
        localStorage.setItem(STORAGE_TOKEN_KEY, token);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(permissions));
        setAuthToken(token);
        setUserInfo(permissions);
    };

    const logout = () => {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_USER_KEY);
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
        // Migrate legacy sessionStorage token
        const legacyToken = sessionStorage.getItem(STORAGE_TOKEN_KEY);
        if (legacyToken) {
            localStorage.setItem(STORAGE_TOKEN_KEY, legacyToken);
            sessionStorage.removeItem(STORAGE_TOKEN_KEY);
        }

        const token = localStorage.getItem(STORAGE_TOKEN_KEY);
        if (!token) {
            setAuthChecked(true);
            return;
        }

        // Validate the stored token before showing any authenticated UI.
        // An AbortController lets us cancel the in-flight request when the
        // component unmounts (e.g. React StrictMode double-mount teardown),
        // and a 5-second timeout prevents an indefinitely stuck loading screen
        // when the CRM backend is temporarily unreachable.
        const controller = new AbortController();
        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, 5000);

        const doValidate = async () => {
            try {
                const permissions = await validateToken(token, controller.signal);
                if (permissions) {
                    setUserInfo(permissions);
                    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(permissions));
                }
                // null = network / server error → keep existing session
            } catch (err) {
                if (err.name === 'AbortError') {
                    if (timedOut) {
                        // Backend too slow — keep session and unblock the UI
                        setAuthChecked(true);
                    }
                    // StrictMode cleanup abort: don't set authChecked here;
                    // the second effect run will perform a fresh validation.
                    return;
                }
                // Server explicitly rejected the token (401) → clear session
                localStorage.removeItem(STORAGE_TOKEN_KEY);
                localStorage.removeItem(STORAGE_USER_KEY);
                setAuthToken(null);
                setUserInfo(null);
            } finally {
                clearTimeout(timeoutId);
                // Only mark auth as checked if the request completed (not aborted).
                // Aborted cases are handled above (timeout) or ignored (StrictMode cleanup).
                if (!controller.signal.aborted) {
                    setAuthChecked(true);
                }
            }
        };

        doValidate();

        // Cleanup: cancel the fetch if this effect is torn down (StrictMode unmount
        // or component unmount). The next effect run will start a fresh validation.
        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, []);

    return (
        <ERPAuthContext.Provider
            value={{
                authApiBase: AUTH_API_BASE,
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
