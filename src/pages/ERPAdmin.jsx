import React, { useEffect, useMemo, useState } from 'react';
import { useERPAuth } from '../context/ERPAuthContext';
import './ERPAdmin.css';

const ERP_PERMISSIONS = [
    { id: 'erp_daia', label: 'DAIA' },
    { id: 'erp_prospeccion', label: 'Prospeccion' },
    { id: 'erp_crm', label: 'CRM DataCom' },
    { id: 'erp_acta', label: 'Acta de Reuniones' },
    { id: 'erp_admin', label: 'Modulo Administracion ERP' }
];

const ERPAdmin = () => {
    const { authToken, authChecked, hasPermission, userInfo, authApiBase } = useERPAuth();

    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [roleForm, setRoleForm] = useState({ id: null, name: '', description: '', allowed_views: [] });
    const [userForm, setUserForm] = useState({
        id: null,
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        profile: { role: '', cedula: '', cargo: '' }
    });
    const [assignment, setAssignment] = useState({ userId: '', roleId: '' });

    const canAccess = useMemo(() => {
        if (!authToken) {
            return false;
        }

        if (!userInfo) {
            return false;
        }

        return userInfo.is_superuser || hasPermission('erp_admin');
    }, [authToken, hasPermission, userInfo]);

    const callApi = async (path, options = {}) => {
        const response = await fetch(`${authApiBase}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Token ${authToken}`,
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.detail || data.error || 'Operacion no disponible');
        }

        return data;
    };

    const loadData = async () => {
        if (!canAccess) {
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const [rolesData, usersData] = await Promise.all([
                callApi('/api/core/roles/'),
                callApi('/api/core/users/')
            ]);
            const normalizedRoles = Array.isArray(rolesData) ? rolesData : [];
            const normalizedUsers = Array.isArray(usersData) ? usersData : [];
            setRoles(normalizedRoles);
            setUsers(normalizedUsers);

            setAssignment((previous) => {
                const resolvedUserId = previous.userId || (normalizedUsers[0]?.id ? String(normalizedUsers[0].id) : '');
                const selectedUser = normalizedUsers.find((user) => String(user.id) === String(resolvedUserId));
                const selectedRole = selectedUser?.profile?.role;
                const resolvedRoleId = previous.roleId || (selectedRole ? String(selectedRole) : '');

                return {
                    userId: resolvedUserId,
                    roleId: resolvedRoleId
                };
            });
        } catch (loadError) {
            setError(loadError.message || 'No fue posible cargar administracion ERP.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [canAccess]);

    const togglePermission = (permissionId) => {
        setRoleForm((prev) => {
            const views = prev.allowed_views || [];
            const exists = views.includes(permissionId);
            return {
                ...prev,
                allowed_views: exists ? views.filter((item) => item !== permissionId) : [...views, permissionId]
            };
        });
    };

    const saveRole = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        const payload = {
            name: roleForm.name,
            description: roleForm.description,
            allowed_views: roleForm.allowed_views
        };

        try {
            if (roleForm.id) {
                await callApi(`/api/core/roles/${roleForm.id}/`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                await callApi('/api/core/roles/', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }

            setRoleForm({ id: null, name: '', description: '', allowed_views: [] });
            setSuccess('Rol ERP guardado correctamente.');
            await loadData();
        } catch (saveError) {
            setError(saveError.message || 'No fue posible guardar el rol.');
        }
    };

    const saveUser = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        const payload = {
            username: userForm.username,
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            email: userForm.email,
            password: userForm.password,
            profile: {
                role: userForm.profile.role || null,
                cedula: userForm.profile.cedula,
                cargo: userForm.profile.cargo,
                birthdate: null,
                civil_status: ''
            }
        };

        try {
            if (userForm.id) {
                if (!payload.password) {
                    delete payload.password;
                }

                await callApi(`/api/core/users/${userForm.id}/`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                await callApi('/api/core/users/', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }

            setUserForm({
                id: null,
                username: '',
                first_name: '',
                last_name: '',
                email: '',
                password: '',
                profile: { role: '', cedula: '', cargo: '' }
            });
            setSuccess('Usuario ERP guardado correctamente.');
            await loadData();
        } catch (saveError) {
            setError(saveError.message || 'No fue posible guardar el usuario.');
        }
    };

    const selectedAssignmentUser = useMemo(
        () => users.find((user) => String(user.id) === String(assignment.userId)),
        [users, assignment.userId]
    );

    const selectedAssignmentRole = useMemo(
        () => roles.find((role) => String(role.id) === String(assignment.roleId)),
        [roles, assignment.roleId]
    );

    const handleAssignmentUserChange = (nextUserId) => {
        const selectedUser = users.find((user) => String(user.id) === String(nextUserId));
        const userRoleId = selectedUser?.profile?.role ? String(selectedUser.profile.role) : '';
        setAssignment({ userId: String(nextUserId), roleId: userRoleId });
    };

    const assignRoleToUser = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!assignment.userId || !assignment.roleId) {
            setError('Selecciona un usuario CRM y un rol ERP para asignar.');
            return;
        }

        const targetUser = users.find((user) => String(user.id) === String(assignment.userId));
        if (!targetUser) {
            setError('No se encontro el usuario seleccionado.');
            return;
        }

        const payload = {
            username: targetUser.username,
            first_name: targetUser.first_name || '',
            last_name: targetUser.last_name || '',
            email: targetUser.email || '',
            profile: {
                ...(targetUser.profile || {}),
                role: assignment.roleId || null,
                cedula: targetUser.profile?.cedula || '',
                cargo: targetUser.profile?.cargo || '',
                birthdate: targetUser.profile?.birthdate || null,
                civil_status: targetUser.profile?.civil_status || ''
            }
        };

        if (typeof targetUser.is_active === 'boolean') {
            payload.is_active = targetUser.is_active;
        }
        if (typeof targetUser.is_staff === 'boolean') {
            payload.is_staff = targetUser.is_staff;
        }

        try {
            await callApi(`/api/core/users/${targetUser.id}/`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            setSuccess(`Rol ${selectedAssignmentRole?.name || ''} asignado a ${targetUser.username}.`);
            await loadData();
        } catch (assignError) {
            setError(assignError.message || 'No fue posible asignar el rol al usuario.');
        }
    };

    if (!authChecked) {
        return <div className="erp-admin-page">Validando sesion...</div>;
    }

    if (!authToken) {
        return <div className="erp-admin-page">Inicia sesion en ERP DataCom para administrar usuarios y roles.</div>;
    }

    if (!canAccess) {
        return <div className="erp-admin-page">Tu rol no tiene acceso al modulo de administracion ERP.</div>;
    }

    return (
        <div className="erp-admin-page">
            <div className="erp-admin-header">
                <h1>Administracion ERP DataCom</h1>
                <p>Gestion central de usuarios, roles y accesos de DAIA, Prospeccion, CRM y Acta.</p>
            </div>

            {error && <div className="erp-admin-error">{error}</div>}
            {success && <div className="erp-admin-success">{success}</div>}
            {isLoading && <p className="erp-admin-loading">Cargando datos...</p>}

            <section className="erp-admin-assign-card">
                <h2>Asignar Rol ERP a Usuario CRM</h2>
                <p className="erp-admin-assign-help">Selecciona un usuario de CRM DataCom y define su rol ERP para controlar accesos en DAIA, Prospeccion, CRM y Acta.</p>

                <form className="erp-admin-assign-form" onSubmit={assignRoleToUser}>
                    <label>Usuario CRM</label>
                    <select
                        value={assignment.userId}
                        onChange={(event) => handleAssignmentUserChange(event.target.value)}
                        required
                    >
                        <option value="">Selecciona usuario</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.username} - {user.first_name} {user.last_name}
                            </option>
                        ))}
                    </select>

                    <label>Rol ERP</label>
                    <select
                        value={assignment.roleId}
                        onChange={(event) => setAssignment((prev) => ({ ...prev, roleId: event.target.value }))}
                        required
                    >
                        <option value="">Selecciona rol ERP</option>
                        {roles.map((role) => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>

                    <button type="submit">Asignar Rol ERP</button>
                </form>

                {selectedAssignmentUser && (
                    <div className="erp-admin-assign-preview">
                        <strong>Usuario seleccionado:</strong> {selectedAssignmentUser.username} ({selectedAssignmentUser.first_name} {selectedAssignmentUser.last_name})
                        <br />
                        <strong>Rol actual:</strong> {selectedAssignmentUser.profile?.role_name || 'Sin rol'}
                    </div>
                )}
            </section>

            <div className="erp-admin-grid">
                <section className="erp-admin-card">
                    <h2>Roles ERP</h2>
                    <form onSubmit={saveRole} className="erp-admin-form">
                        <label>Nombre del rol</label>
                        <input
                            type="text"
                            value={roleForm.name}
                            onChange={(event) => setRoleForm((prev) => ({ ...prev, name: event.target.value }))}
                            required
                        />

                        <label>Descripcion</label>
                        <input
                            type="text"
                            value={roleForm.description}
                            onChange={(event) => setRoleForm((prev) => ({ ...prev, description: event.target.value }))}
                            required
                        />

                        <div className="erp-admin-checklist">
                            {ERP_PERMISSIONS.map((permission) => (
                                <label key={permission.id}>
                                    <input
                                        type="checkbox"
                                        checked={(roleForm.allowed_views || []).includes(permission.id)}
                                        onChange={() => togglePermission(permission.id)}
                                    />
                                    {permission.label}
                                </label>
                            ))}
                        </div>

                        <button type="submit">{roleForm.id ? 'Actualizar Rol' : 'Crear Rol'}</button>
                    </form>

                    <div className="erp-admin-list">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => setRoleForm({
                                    id: role.id,
                                    name: role.name || '',
                                    description: role.description || '',
                                    allowed_views: role.allowed_views || []
                                })}
                            >
                                <strong>{role.name}</strong>
                                <span>{role.description}</span>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="erp-admin-card">
                    <h2>Usuarios ERP</h2>
                    <form onSubmit={saveUser} className="erp-admin-form">
                        <label>Usuario</label>
                        <input
                            type="text"
                            value={userForm.username}
                            onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))}
                            required
                        />

                        <label>Nombres</label>
                        <input
                            type="text"
                            value={userForm.first_name}
                            onChange={(event) => setUserForm((prev) => ({ ...prev, first_name: event.target.value }))}
                            required
                        />

                        <label>Apellidos</label>
                        <input
                            type="text"
                            value={userForm.last_name}
                            onChange={(event) => setUserForm((prev) => ({ ...prev, last_name: event.target.value }))}
                            required
                        />

                        <label>Email</label>
                        <input
                            type="email"
                            value={userForm.email}
                            onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                            required
                        />

                        <label>Contrasena</label>
                        <input
                            type="password"
                            value={userForm.password}
                            onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                            required={!userForm.id}
                        />

                        <label>Rol</label>
                        <select
                            value={userForm.profile.role}
                            onChange={(event) => setUserForm((prev) => ({
                                ...prev,
                                profile: { ...prev.profile, role: event.target.value }
                            }))}
                            required
                        >
                            <option value="">Selecciona rol</option>
                            {roles.map((role) => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </select>

                        <label>Cedula</label>
                        <input
                            type="text"
                            value={userForm.profile.cedula}
                            onChange={(event) => setUserForm((prev) => ({
                                ...prev,
                                profile: { ...prev.profile, cedula: event.target.value }
                            }))}
                        />

                        <label>Cargo</label>
                        <input
                            type="text"
                            value={userForm.profile.cargo}
                            onChange={(event) => setUserForm((prev) => ({
                                ...prev,
                                profile: { ...prev.profile, cargo: event.target.value }
                            }))}
                        />

                        <button type="submit">{userForm.id ? 'Actualizar Usuario' : 'Crear Usuario'}</button>
                    </form>

                    <div className="erp-admin-list">
                        {users.map((user) => (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() => setUserForm({
                                    id: user.id,
                                    username: user.username || '',
                                    first_name: user.first_name || '',
                                    last_name: user.last_name || '',
                                    email: user.email || '',
                                    password: '',
                                    profile: {
                                        role: user.profile?.role || '',
                                        cedula: user.profile?.cedula || '',
                                        cargo: user.profile?.cargo || ''
                                    }
                                })}
                            >
                                <strong>{user.first_name} {user.last_name} (@{user.username})</strong>
                                <span>{user.profile?.cargo || 'Sin cargo'} | {user.profile?.role_name || 'Sin rol'}</span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ERPAdmin;
