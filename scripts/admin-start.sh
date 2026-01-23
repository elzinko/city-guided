#!/bin/bash
# Start POI Admin with API and PostgreSQL
# Usage: pnpm admin

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_DIR="$ROOT_DIR/infra/deployment/compose"
CONFIG_DIR="$ROOT_DIR/infra/config"

# Load environment from .env.local
if [ -f "$CONFIG_DIR/.env.local" ]; then
    set -a
    source "$CONFIG_DIR/.env.local"
    set +a
fi

# Override DOCKER_ENV for local dev (we're not running in Docker containers)
export DOCKER_ENV=false

# Default values - use localhost for local dev
DATABASE_URL="${DATABASE_URL:-postgresql://cityguided:cityguided@localhost:5433/cityguided}"
ADMIN_PORT="${ADMIN_PORT:-3081}"
API_PORT="${API_PORT:-4000}"

export COMPOSE_PROJECT_NAME="${PROJECT_NAME:-city-guided}-${ENVIRONMENT:-local}"

echo "🚀 Starting POI Admin environment..."
echo ""

# 1. Start PostgreSQL if not running
echo "🐘 Checking PostgreSQL..."
if ! docker ps --format '{{.Names}}' | grep -q "postgres"; then
    echo "   Starting PostgreSQL..."
    docker-compose --env-file "$CONFIG_DIR/.env.local" -f "$COMPOSE_DIR/docker-compose.yml" up -d postgres
    
    echo "   Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if docker-compose --env-file "$CONFIG_DIR/.env.local" -f "$COMPOSE_DIR/docker-compose.yml" exec -T postgres pg_isready -U cityguided > /dev/null 2>&1; then
            echo "   ✅ PostgreSQL is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "   ⚠️  PostgreSQL didn't become ready in time"
        fi
        sleep 1
    done
else
    echo "   ✅ PostgreSQL already running"
fi
echo ""

# 2. Check if database schema exists, if not run migrations
echo "📦 Checking database schema..."
cd "$ROOT_DIR/packages/database"
if ! pnpm db:push --accept-data-loss 2>/dev/null; then
    echo "   Running database migrations..."
    pnpm db:push
fi
echo "   ✅ Database schema ready"
echo ""

# 3. Start API and Admin in parallel
echo "🚀 Starting services..."
echo "   - API: http://127.0.0.1:$API_PORT"
echo "   - Admin: http://127.0.0.1:$ADMIN_PORT"
echo ""

cd "$ROOT_DIR"

# Export env vars for the services
export DATABASE_URL
export SECRET_OPENTRIPMAP_API_KEY
export ADMIN_TOKEN

# Start API and Admin
DATABASE_URL="$DATABASE_URL" pnpm --filter services-api dev &
API_PID=$!

pnpm --filter apps-admin dev &
ADMIN_PID=$!

# Wait for both
wait $API_PID $ADMIN_PID
