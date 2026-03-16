#!/usr/bin/env bash

set -euo pipefail

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
SQLITE_DB_PATH="${SQLITE_DB_PATH:-}"
MEDIA_PATH="${MEDIA_PATH:-}"
ADDITIONAL_ARCHIVE_PATHS="${ADDITIONAL_ARCHIVE_PATHS:-}"

mkdir -p "$BACKUP_ROOT/$TIMESTAMP"

echo ">>> Directorio de backup: $BACKUP_ROOT/$TIMESTAMP"

if [[ -n "$SQLITE_DB_PATH" && -f "$SQLITE_DB_PATH" ]]; then
  echo ">>> Copiando base SQLite"
  cp "$SQLITE_DB_PATH" "$BACKUP_ROOT/$TIMESTAMP/"
fi

if [[ -n "$MEDIA_PATH" && -d "$MEDIA_PATH" ]]; then
  echo ">>> Empaquetando media"
  tar -czf "$BACKUP_ROOT/$TIMESTAMP/media.tar.gz" -C "$MEDIA_PATH" .
fi

if [[ -n "$ADDITIONAL_ARCHIVE_PATHS" ]]; then
  echo ">>> Empaquetando rutas adicionales"
  tar -czf "$BACKUP_ROOT/$TIMESTAMP/additional.tar.gz" $ADDITIONAL_ARCHIVE_PATHS
fi

echo ">>> Backup completado"
