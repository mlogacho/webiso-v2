import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ProcessMapPage from './pages/ProcessMapPage';
import ISO9001 from './pages/ISO9001';
import ISO27001 from './pages/ISO27001';
import ERPDataCom from './pages/ERPDataCom';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="process-map" element={<ProcessMapPage />} />
        <Route path="iso-9001" element={<ISO9001 />} />
        <Route path="iso-27001" element={<ISO27001 />} />
        <Route path="erp-datacom" element={<ERPDataCom />} />
      </Route>
    </Routes>
  );
}

export default App;
