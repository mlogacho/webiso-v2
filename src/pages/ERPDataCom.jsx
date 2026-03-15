import React from 'react';
import { Target, Users, BotMessageSquare, ExternalLink, ClipboardList } from 'lucide-react';
import './ERPDataCom.css';

const ERPDataCom = () => {
    const apps = [
        {
            id: "daia",
            name: "DAIA",
            description: "Inteligencia Artificial y Análisis de Documentos. Tu asistente inteligente.",
            url: "http://10.11.121.58:8005",
            icon: <BotMessageSquare size={48} />,
            colorClass: "card-blue"
        },
        {
            id: "prospeccion",
            name: "PROSPECCIÓN",
            description: "Gestión de oportunidades, análisis de mercado y seguimiento de leads.",
            url: "http://10.11.121.58:8080",
            icon: <Target size={48} />,
            colorClass: "card-cyan"
        },
        {
            id: "crm",
            name: "CRM",
            description: "Administración integral de la relación con clientes y servicios.",
            url: "http://10.11.121.58/",
            icon: <Users size={48} />,
            colorClass: "card-dark"
        },
        {
            id: "acta-reuniones",
            name: "ACTA DE REUNIONES",
            description: "Registro y seguimiento de actas, compromisos y acuerdos de reuniones.",
            url: "http://10.11.121.58:8030/login",
            icon: <ClipboardList size={48} />,
            colorClass: "card-green"
        }
    ];

    return (
        <div className="erp-container">
            <div className="erp-header">
                <h1>ERP DataCom</h1>
                <p>Selecciona una de las aplicaciones de nuestra suite empresarial para continuar.</p>
            </div>

            <div className="erp-grid">
                {apps.map((app) => (
                    <a
                        key={app.id}
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`erp-card ${app.colorClass}`}
                    >
                        <div className="card-icon-wrapper">
                            {app.icon}
                        </div>
                        <h2>{app.name}</h2>
                        <p>{app.description}</p>
                        <div className="card-footer">
                            <span>Abrir Aplicación</span>
                            <ExternalLink size={20} />
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default ERPDataCom;
