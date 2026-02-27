import React from 'react';
import ProcessMap from '../components/ProcessMap/ProcessMap';

const ProcessMapPage = () => {
    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Mapa de Procesos Datacom</h1>
            <ProcessMap />
        </div>
    );
};

export default ProcessMapPage;
