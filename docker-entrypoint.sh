#!/bin/sh
set -e

echo "[entrypoint] Running prisma migrate deploy..."
 (cd /app/packages/database && npx prisma migrate deploy)

echo "[entrypoint] Starting react-router-serve..."
exec npx react-router-serve ./build/server/index.js