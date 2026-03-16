import React from 'react';
import DocumentLibrary from '../components/DocumentLibrary';

const ISO27001 = () => {
    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <DocumentLibrary
                standardId="iso27001"
                title="ISO 27001: Busqueda documental por procesos"
                description="Consulta los documentos marcados para seguridad de la informacion desde el mapa de procesos."
            />
        </div>
    );
};

export default ISO27001;
