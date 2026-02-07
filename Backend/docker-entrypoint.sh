#!/bin/sh
set -e

echo "🚀 Starting APCS Backend Server..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until nc -z postgres 5432; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is up!"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis..."
until nc -z redis 6379; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "✅ Redis is up!"

# Run Prisma migrations
echo "📦 Running Prisma migrations..."
npx prisma migrate deploy --schema=prisma/schema.prisma

# Check if seed is needed (optional)
if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Seeding database..."
  npm run seed
fi

echo "✅ Database setup complete!"

# Start the application
echo "🎯 Starting application server..."
exec node dist/server.js
