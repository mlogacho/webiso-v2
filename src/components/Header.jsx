import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, ShieldCheck, Map, Smartphone } from 'lucide-react';
import logo from '../assets/logo.png';
import './Header.css';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <header className="header">
            <div className="container header-content">
                <a href="https://datacom.ec/" target="_blank" rel="noopener noreferrer" className="logo-section">
                    <img src={logo} alt="DataCom Logo" className="logo-image" />
                </a>

                <nav className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
                    <NavLink to="/" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>Inicio</NavLink>
                    <NavLink to="/process-map" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>Mapa de Procesos</NavLink>
                    <NavLink to="/iso-9001" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>ISO 9001</NavLink>
                    <NavLink to="/iso-27001" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>ISO 27001</NavLink>
                    <NavLink to="/erp-datacom" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>ERP DataCom</NavLink>
                </nav>

                <button className="mobile-menu-btn" onClick={toggleMenu} aria-label="Toggle menu">
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
        </header>
    );
};

export default Header;
