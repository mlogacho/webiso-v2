import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ProcessMapPage from './pages/ProcessMapPage';
import ISO9001 from './pages/ISO9001';
import ISO27001 from './pages/ISO27001';
import ERPDataCom from './pages/ERPDataCom';
import ERPAdmin from './pages/ERPAdmin';
import ChangePassword from './components/ChangePassword';
import PasswordRecovery from './components/PasswordRecovery';
import { useERPAuth } from './context/ERPAuthContext';
import { LocalAuthProvider } from './context/LocalAuthContext';
import './App.css';

const ERPAdminGuard = ({ children }) => {
  const { authChecked, authToken, hasPermission, userInfo } = useERPAuth();

  if (!authChecked) {
    return <div className="container" style={{ padding: '2rem 1rem' }}>Validando sesion...</div>;
  }

  if (!authToken) {
    return <div className="container" style={{ padding: '2rem 1rem' }}>Debes iniciar sesion en ERP DataCom.</div>;
  }

  if (!userInfo?.is_superuser && !hasPermission('erp_admin')) {
    return <div className="container" style={{ padding: '2rem 1rem' }}>No tienes permisos para Administracion ERP.</div>;
  }

  return children;
};

function App() {
  return (
    <LocalAuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="process-map" element={<ProcessMapPage />} />
          <Route path="iso-9001" element={<ISO9001 />} />
          <Route path="iso-27001" element={<ISO27001 />} />
          <Route path="erp-datacom" element={<ERPDataCom />} />
          <Route path="erp-admin" element={<ERPAdminGuard><ERPAdmin /></ERPAdminGuard>} />
        </Route>
        {/* Rutas de Autenticación Local (sin Layout) */}
        <Route path="auth">
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="password-recovery" element={<PasswordRecovery />} />
        </Route>
      </Routes>
    </LocalAuthProvider>
  );
}

export default App;
