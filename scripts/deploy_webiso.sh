#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${SOURCE_BUILD_DIR:-dist}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/webiso}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-webiso}"
NGINX_SITE_SOURCE="${NGINX_SITE_SOURCE:-debian_deployment/nginx.conf}"

cd "$PROJECT_DIR"

echo ">>> Instalando dependencias de Node"
npm install

echo ">>> Construyendo WebISO"
npm run build

echo ">>> Publicando archivos en ${DEPLOY_PATH}"
sudo mkdir -p "$DEPLOY_PATH"
sudo rsync -a --delete "${BUILD_DIR}/" "$DEPLOY_PATH/"
sudo chown -R www-data:www-data "$DEPLOY_PATH"
sudo chmod -R 755 "$DEPLOY_PATH"

if [[ -f "$NGINX_SITE_SOURCE" ]]; then
  echo ">>> Publicando configuracion Nginx"
  sudo cp "$NGINX_SITE_SOURCE" "/etc/nginx/sites-available/${NGINX_SITE_NAME}"
  sudo ln -sf "/etc/nginx/sites-available/${NGINX_SITE_NAME}" "/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"
  sudo nginx -t
  sudo systemctl restart nginx
fi

echo ">>> Despliegue completado"
