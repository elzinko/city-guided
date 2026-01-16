#!/bin/bash
# Stop development environment (OSRM + dev servers)
# Usage: npm run dev:stop

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$ROOT_DIR/infra/docker"
CONFIG_DIR="$ROOT_DIR/infra/config"

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

# Stop OSRM service
echo "🗺️  Stopping OSRM service..."
if command -v docker &> /dev/null; then
    docker-compose --env-file "$CONFIG_DIR/.env.local" -f "$DOCKER_DIR/docker-compose.osrm.yml" down 2>/dev/null || true
    echo "✅ OSRM stopped"
else
    echo "⚠️  Docker not found, skipping OSRM stop"
fi
echo ""

echo "✨ Development environment stopped!"
