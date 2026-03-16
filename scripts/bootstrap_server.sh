#!/usr/bin/env bash

set -euo pipefail

NODE_MAJOR_VERSION="${NODE_MAJOR_VERSION:-20}"

echo ">>> Actualizando paquetes base"
sudo apt-get update

echo ">>> Instalando dependencias del sistema"
sudo apt-get install -y curl git nginx rsync ca-certificates gnupg lsb-release unzip

if ! command -v node >/dev/null 2>&1; then
  echo ">>> Instalando Node.js ${NODE_MAJOR_VERSION}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR_VERSION}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo ">>> Node.js ya esta instalado: $(node --version)"
fi

echo ">>> Versiones detectadas"
node --version
npm --version
nginx -v

echo ">>> Bootstrap completado"
