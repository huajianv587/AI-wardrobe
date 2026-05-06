#!/bin/sh
set -eu

APP_PORT="${PORT:-10000}"
APP_PROCESS="${BACKEND_PROCESS:-api}"

mkdir -p /app/data /app/data/assets
chown -R appuser:appuser /app/data 2>/dev/null || true

if [ "$APP_PROCESS" = "worker" ]; then
  exec su -s /bin/sh appuser -c "exec python worker.py"
fi

exec su -s /bin/sh appuser -c "exec uvicorn app.main:app --host 0.0.0.0 --port ${APP_PORT}"
