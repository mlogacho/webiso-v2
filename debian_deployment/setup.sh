#!/bin/bash

# WebISO Setup Script for Debian
# Run with: sudo ./setup.sh

set -e

APP_DIR="/var/www/webiso"
REPO_DIR=$(pwd) # Assuming script is run from inside the project or copied along with it
NGINX_CONF_SRC="debian_deployment/nginx.conf"

echo ">>> Iniciando actualización del sistema e instalación de dependencias..."
apt-get update
apt-get install -y nginx curl git

# STOP OLD FLASK SERVICE if exists
if systemctl is-active --quiet webiso.service; then
    echo ">>> Deteniendo servicio 'webiso' (Flask App anterior)..."
    systemctl stop webiso.service
    systemctl disable webiso.service
    echo ">>> Servicio anterior detenido."
fi

# Install Node.js (via nodesource) if not present
if ! command -v node &> /dev/null; then
    echo ">>> Instalando Node.js v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo ">>> Node.js ya está instalado."
fi

echo ">>> Construyendo la aplicación React..."
# Install dependencies and build
if [ -f "package.json" ]; then
    echo ">>> Limpiando instalaciones previas (node_modules)..."
    rm -rf node_modules
    rm -f package-lock.json
    
    echo ">>> Instalando dependencias desde cero..."
    npm install
    npm run build
else
    echo "Error: No se encontró package.json en el directorio actual."
    exit 1
fi

echo ">>> Desplegando archivos en $APP_DIR ..."
mkdir -p $APP_DIR
# Clean old files
rm -rf $APP_DIR/*
# Copy build files (dist/ from Vite) to web root
cp -r dist/* $APP_DIR/

echo ">>> Configurando Nginx..."
# 1. Remove ANY existing 'webiso' config to avoid conflicts
if [ -f /etc/nginx/sites-enabled/webiso ]; then
    rm /etc/nginx/sites-enabled/webiso
fi
if [ -f /etc/nginx/sites-available/webiso ]; then
    rm /etc/nginx/sites-available/webiso
fi

# 2. Add permissions for www-data to read the files (Crucial for 403/502/404 debugging)
echo ">>> Ajustando permisos..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

# 3. Copy new nginx config
cp $NGINX_CONF_SRC /etc/nginx/sites-available/webiso

# 4. Enable site
ln -sf /etc/nginx/sites-available/webiso /etc/nginx/sites-enabled/

# 6. Test configuration explicitly
echo ">>> Verificando configuración de Nginx..."
if nginx -t; then
    echo ">>> Configuración válida. Reiniciando Nginx..."
    systemctl restart nginx
else
    echo "URGENTE: La configuración de Nginx tiene errores. Revisa el output anterior."
    exit 1
fi

echo "========================================================"
echo "¡Despliegue completado con éxito!"
echo "Tu sitio está Aislado y disponible en el PUERTO 8081:"
echo "- http://10.11.121.58:8081"
echo "Y cuando configures los DNS:"
echo "- http://intranetiso900127001:8081"
echo "- http://datacom.intranet.iso:8081"
echo "========================================================"
