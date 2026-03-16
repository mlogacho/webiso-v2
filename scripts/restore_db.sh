#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <backup_dir>"
  exit 1
fi

BACKUP_DIR="$1"
SQLITE_DB_PATH="${SQLITE_DB_PATH:-}"
MEDIA_PATH="${MEDIA_PATH:-}"

if [[ -n "$SQLITE_DB_PATH" ]]; then
  DB_FILE="$(find "$BACKUP_DIR" -maxdepth 1 -type f \( -name '*.sqlite3' -o -name '*.db' \) | head -n 1)"
  if [[ -n "$DB_FILE" ]]; then
    echo ">>> Restaurando base SQLite a $SQLITE_DB_PATH"
    mkdir -p "$(dirname "$SQLITE_DB_PATH")"
    cp "$DB_FILE" "$SQLITE_DB_PATH"
  fi
fi

if [[ -n "$MEDIA_PATH" && -f "$BACKUP_DIR/media.tar.gz" ]]; then
  echo ">>> Restaurando media en $MEDIA_PATH"
  mkdir -p "$MEDIA_PATH"
  tar -xzf "$BACKUP_DIR/media.tar.gz" -C "$MEDIA_PATH"
fi

if [[ -f "$BACKUP_DIR/additional.tar.gz" ]]; then
  echo ">>> Restaurando rutas adicionales desde additional.tar.gz"
  tar -xzf "$BACKUP_DIR/additional.tar.gz" -C /
fi

echo ">>> Restauracion completada"