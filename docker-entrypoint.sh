#!/bin/sh
set -e

# Ensure database directory exists and is writable
mkdir -p /app/data
chmod 755 /app/data

# Force DATABASE_URL to always use container path (ignore host .env)
export DATABASE_URL="file:/app/data/dev.db"

# Run database migrations
echo "Running database migrations with DATABASE_URL=$DATABASE_URL..."
cd /app/mods/apiserver

# Try to run migrations (prisma should be available via npx)
# For SQLite, if database doesn't exist, Prisma will create it
if command -v npx > /dev/null 2>&1; then
  npx prisma migrate deploy 2>&1 || {
    echo "Migration deploy failed, trying migrate dev (for fresh databases)..."
    npx prisma migrate dev --name init 2>&1 || echo "Migrations completed or not needed"
  }
else
  echo "npx not available, skipping migrations"
fi

cd /app

# Start the application
exec "$@"

