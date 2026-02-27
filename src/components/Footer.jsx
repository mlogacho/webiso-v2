import React from 'react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container">
                <p>&copy; {new Date().getFullYear()} Datacom. Sistema de Gestión Integrado ISO 9001 / ISO 27001.</p>
            </div>
        </footer>
    );
};

export default Footer;
