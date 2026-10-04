#!/bin/sh
set -e

echo "================================================="
echo "   Waypoint Cargo Backend - Container Startup    "
echo "================================================="

# Wait for PostgreSQL to be ready
echo "Waiting for database to accept connections..."
MAX_ATTEMPTS=30
ATTEMPT=0
until pg_isready -h "${DB_HOST:-postgres}" -p 5432 -U "${DB_USER:-postgres}" > /dev/null 2>&1 || [ $ATTEMPT -ge $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "Database not ready yet... attempt $ATTEMPT/$MAX_ATTEMPTS"
  sleep 1
done

if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
  echo "WARNING: Timed out waiting for database readiness check, proceeding with connection attempt..."
fi

echo "1. Generating Prisma Client..."
npx prisma generate

echo "2. Applying database migrations (prisma migrate deploy)..."
npx prisma migrate deploy

echo "3. Running automated database seed..."
node prisma/seed-all.js

echo "================================================="
echo "   Database Ready! Starting Backend Server...    "
echo "================================================="
exec node src/server.js
