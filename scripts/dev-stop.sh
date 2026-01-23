#!/bin/bash
# Stop development environment (OSRM + PostgreSQL + dev servers)
# Usage: npm run dev:stop

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_DIR="$ROOT_DIR/infra/deployment/compose"
CONFIG_DIR="$ROOT_DIR/infra/config"

# Export for docker-compose
export PROJECT_NAME="${PROJECT_NAME:-city-guided}"
export ENVIRONMENT="${ENVIRONMENT:-local}"
export COMPOSE_PROJECT_NAME="${PROJECT_NAME}-${ENVIRONMENT}"

echo "🛑 Stopping development environment..."
echo ""

# Stop dev servers (API + Frontend)
echo "📦 Stopping API and Frontend servers..."
PIDS=$(lsof -ti:4000,3080 2>/dev/null || true)
if [ -n "$PIDS" ]; then
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    echo "✅ Dev servers stopped"
else
    echo "ℹ️  No dev servers running on ports 4000/3080"
fi
echo ""

if command -v docker &> /dev/null; then
    # Stop PostgreSQL service
    echo "🐘 Stopping PostgreSQL service..."
    docker-compose --env-file "$CONFIG_DIR/.env.local" -f "$COMPOSE_DIR/docker-compose.yml" stop postgres 2>/dev/null || true
    echo "✅ PostgreSQL stopped"
    echo ""

    # Stop OSRM service
    echo "🗺️  Stopping OSRM service..."
    docker-compose --env-file "$CONFIG_DIR/.env.local" -f "$COMPOSE_DIR/docker-compose.osrm.yml" down 2>/dev/null || true
    echo "✅ OSRM stopped"
else
    echo "⚠️  Docker not found, skipping container stops"
fi
echo ""

echo "✨ Development environment stopped!"
