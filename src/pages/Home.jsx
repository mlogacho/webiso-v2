import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <div className="container">
            <section style={{ textAlign: 'center', padding: '4rem 0' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Sistema de Gestión Integrado</h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    Bienvenido al portal de documentación de procesos y normativas ISO 9001 / ISO 27001 de Datacom.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <Link to="/process-map" className="btn-primary" style={{
                        backgroundColor: 'var(--color-primary-blue)',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        fontWeight: '600'
                    }}>
                        Ver Mapa de Procesos
                    </Link>
                    <Link to="/iso-9001" style={{
                        backgroundColor: 'white',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-main)',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        fontWeight: '600'
                    }}>
                        Documentación
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Home;
