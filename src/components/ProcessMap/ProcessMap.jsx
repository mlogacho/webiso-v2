import React from 'react';
import Modal from '../Modal';
import './ProcessMap.css';

const ProcessNode = ({ label, onClick, className = '' }) => (
    <div className={`process-node ${className}`} onClick={(e) => { e.stopPropagation(); onClick?.(label); }}>
        {label}
    </div>
);

const ProcessMap = () => {
    const [selectedProcess, setSelectedProcess] = React.useState(null);

    const handleNodeClick = (nodeName) => {
        setSelectedProcess(nodeName);
    };

    const closeModal = () => {
        setSelectedProcess(null);
    };

    return (
        <div className="process-map-container">
            {/* Modal */}
            <Modal
                isOpen={!!selectedProcess}
                onClose={closeModal}
                title={selectedProcess}
            >
                <div style={{ paddingBottom: '1rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-primary-blue)' }}>Información del Proceso</h4>
                    <p>Detalles técnicos y normativos asociados al proceso de <strong>{selectedProcess}</strong>.</p>
                    {/* Placeholder content - can be dynamic based on nodeName */}
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                        <h5>Documentación Relacionada:</h5>
                        <ul>
                            <li>Procedimiento {selectedProcess} v1.0</li>
                            <li>Matriz de Riesgos</li>
                            <li>Indicadores de Gestión (KPIs)</li>
                        </ul>
                    </div>
                </div>
            </Modal>

            {/* Left Sidebar */}
            <div className="client-bar">
                <span>CLIENTE</span>
            </div>

            <div className="process-content">
                <div className="map-header">
                    <div style={{ width: 100 }}>{/* Spacer */}</div>
                    <div className="map-title">MACROPROCESO DataCom</div>
                    <div className="map-meta">
                        Versión 1.0<br />
                        Fecha: 12/02/2026<br />
                        MAPA-PR-SGIC-1.0
                    </div>
                </div>

                {/* 1. PROCESOS OPERATIVOS */}
                <div className="operativos-container">
                    <span className="layer-label">PROCESOS OPERATIVOS</span>
                    <div className="operativos-flow">
                        <ProcessNode label="VENTAS" className="node-ventas" onClick={handleNodeClick} />
                        {/* Arrow placeholder */}
                        <div style={{ fontSize: '2rem' }}>↔</div>
                        <ProcessNode label="INSTALACIÓN" className="node-instalacion" onClick={handleNodeClick} />

                        <div style={{ fontSize: '2rem' }}>↔</div>

                        {/* SOPORTE GROUP */}
                        <div className="node-soporte-container">
                            <span className="soporte-title">SOPORTE</span>
                            <div className="soporte-subnode" onClick={() => handleNodeClick("Operaciones de Red y Soporte (NOC)")}>
                                Operaciones de Red y Soporte (NOC)
                            </div>
                            <div className="soporte-subnode" onClick={() => handleNodeClick("Gestión Data Center")}>
                                Gestión Data Center
                            </div>
                        </div>

                        <div style={{ fontSize: '2rem' }}>↔</div>
                        <ProcessNode label="GESTIÓN COMERCIAL" className="node-gestion-comercial" onClick={handleNodeClick} />
                    </div>
                </div>

                {/* 2. PROCESOS DE APOYO */}
                <div className="apoyo-container">
                    <span className="layer-label">PROCESOS DE APOYO</span>

                    {/* Financiero */}
                    <div className="financiero-section">
                        <span className="layer-label" style={{ position: 'static', marginRight: '1rem', alignSelf: 'center' }}>FINANCIERO</span>
                        <ProcessNode label="CONTABLE" className="node-contable" onClick={handleNodeClick} />
                        <ProcessNode label="FACTURACIÓN" className="node-facturacion" onClick={handleNodeClick} />
                    </div>

                    {/* Talento Humano */}
                    <div className="talento-humano-section">
                        <span className="layer-label" style={{ position: 'static', marginRight: '1rem' }}>TALENTO HUMANO</span>
                        <ProcessNode label="GESTION TH" className="node-th" onClick={handleNodeClick} />
                        <div className="connector-circle">1</div>
                        <ProcessNode label="SISO" className="node-siso" onClick={handleNodeClick} />
                    </div>

                    {/* Barras Horizontales */}
                    <div className="bar-node bar-soporte-ti" onClick={() => handleNodeClick("SOPORTE TI")}>
                        SOPORTE TI
                    </div>

                    <div className="bar-node bar-calidad" onClick={() => handleNodeClick("SISTEMA DE GESTIÓN DE CALIDAD")}>
                        SISTEMA DE GESTIÓN DE CALIDAD
                    </div>

                    <div className="bar-node bar-compras" onClick={() => handleNodeClick("COMPRAS Y GESTIÓN DE PROVEEDORES")}>
                        COMPRAS Y GESTIÓN DE PROVEEDORES
                    </div>

                    {/* Proveedores */}
                    <div className="proveedores-row">
                        <ProcessNode label="CARRIER/ULTIMAS MILLAS" className="node-proveedor" onClick={handleNodeClick} />
                        <ProcessNode label="EQUIPOS TELECOMUNICACIONES" className="node-proveedor" onClick={handleNodeClick} />
                        <ProcessNode label="OUTSOURCING TI" className="node-proveedor" onClick={handleNodeClick} />
                        <ProcessNode label="DATACENTER" className="node-proveedor" onClick={handleNodeClick} />
                    </div>
                </div>

                {/* 3. PROCESOS ESTRATÉGICOS */}
                <div className="estrategicos-container">
                    <span className="layer-label">PROCESOS ESTRATÉGICOS</span>
                    <div className="estrategicos-row">
                        <ProcessNode label="Gestión de la Dirección" className="node-estrategico" onClick={handleNodeClick} />
                        <ProcessNode label="Planificación Estratégica y Financiera" className="node-estrategico" onClick={handleNodeClick} />
                        <ProcessNode label="Gestión de Riesgos y Oportunidades" className="node-estrategico" onClick={handleNodeClick} />
                    </div>
                </div>

                {/* Signatures */}
                <div className="signatures-row">
                    <div className="signature-box">
                        <div className="signature-header">Aprobado por:</div>
                        <div>Cesar Cobo<br />Gerente General<br />DataCom</div>
                    </div>
                    <div className="signature-box">
                        <div className="signature-header">Revisado por:</div>
                        <div>Sofia Cabrera<br />Representante de Calidad SIGC-SI<br />DataCom</div>
                    </div>
                    <div className="signature-box">
                        <div className="signature-header">Elaborado por:</div>
                        <div>Marco Logacho<br />Oficial de Calidad SIGC-SI<br />DataCom</div>
                    </div>
                </div>

            </div>

            {/* Right Sidebar */}
            <div className="client-bar">
                <span>CLIENTE</span>
            </div>
        </div>
    );
};

export default ProcessMap;
