#!/bin/bash

# Configuration
APP_DIR="/var/www/webiso"
REPO_URL="YOUR_GIT_REPO_URL_HERE" # User should replace this or we copy files manually
APP_USER=$USER
APP_GROUP="www-data"
SERVER_NAME="_" # Accept all or change to specific IP/Domain
LOG_DIR="/var/log/webiso"

echo ">>> Updating System..."
sudo apt-get update && sudo apt-get upgrade -y

echo ">>> Installing Dependencies..."
sudo apt-get install -y python3-pip python3-venv python3-dev build-essential nginx git acl

echo ">>> Setting up Directory..."
# Create directory and set permissions
if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p $APP_DIR
fi

echo ">>> Copying files to $APP_DIR..."
# Assuming the script is run from the project root after copying
# Use rsync or cp to move current files if not using git clone
# For this script we assume files are already providing in current dir or we copy them
sudo cp -r . $APP_DIR/ || echo "Warning: Could not copy files. Ensure you run this from project root."

# Fix permissions
echo ">>> Setting permissions for $APP_USER:$APP_GROUP..."
sudo chown -R $APP_USER:$APP_GROUP $APP_DIR
sudo chown -R $APP_USER:$APP_GROUP $APP_DIR
sudo chmod -R 775 $APP_DIR

echo ">>> Configuring Gunicorn..."
sudo sed -i "s|{{APP_DIR}}|$APP_DIR|g" $APP_DIR/deploy/gunicorn_config.py
sudo sed -i "s|{{LOG_DIR}}|$LOG_DIR|g" $APP_DIR/deploy/gunicorn_config.py

echo ">>> Setting up Virtual Environment..."
cd $APP_DIR
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt

echo ">>> Creating Log Directory..."
sudo mkdir -p /var/log/webiso
sudo chown -R $APP_USER:$APP_GROUP /var/log/webiso

echo ">>> Configuring Systemd..."
# Replace placeholders in service file
sudo cp deploy/webiso.service /etc/systemd/system/webiso.service
sudo sed -i "s|{{APP_DIR}}|$APP_DIR|g" /etc/systemd/system/webiso.service
sudo sed -i "s|{{USER}}|$APP_USER|g" /etc/systemd/system/webiso.service
sudo sed -i "s|{{GROUP}}|$APP_GROUP|g" /etc/systemd/system/webiso.service

sudo systemctl daemon-reload
sudo systemctl enable webiso
sudo systemctl restart webiso


echo ">>> Checking for conflicting services..."
if systemctl is-active --quiet apache2; then
    echo "Stopping conflicting Apache2 service..."
    sudo systemctl stop apache2
    sudo systemctl disable apache2
fi

echo ">>> Configuring Nginx..."
sudo cp deploy/webiso_nginx.conf /etc/nginx/sites-available/webiso
sudo sed -i "s|{{APP_DIR}}|$APP_DIR|g" /etc/nginx/sites-available/webiso
sudo sed -i "s|{{SERVER_NAME}}|$SERVER_NAME|g" /etc/nginx/sites-available/webiso

if [ ! -f /etc/nginx/sites-enabled/webiso ]; then
    sudo ln -s /etc/nginx/sites-available/webiso /etc/nginx/sites-enabled/
fi

if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

sudo systemctl restart nginx

echo ">>> Deployment Complete! Access your server at http://localhost or server IP."
