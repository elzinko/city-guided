#!/bin/bash
# Start development environment with OSRM + dev servers
# Usage:
#   npm run dev              → Start OSRM + dev servers
#   SKIP_OSRM=1 npm run dev  → Skip OSRM, only start dev servers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_DIR="$ROOT_DIR/infra/deployment/compose"
CONFIG_DIR="$ROOT_DIR/infra/config"

SKIP_OSRM="${SKIP_OSRM:-0}"
API_PORT="${API_PORT:-4000}"
WEB_PORT="${WEB_PORT:-3080}"

# Export PROJECT_NAME and ENVIRONMENT for docker-compose
export PROJECT_NAME="${PROJECT_NAME:-city-guided}"
export ENVIRONMENT="${ENVIRONMENT:-local}"

# Export SHOW_DEV_OPTIONS for Next.js (dev controls visibility)
export SHOW_DEV_OPTIONS="${SHOW_DEV_OPTIONS:-true}"

# Start OSRM (unless skipped)
if [ "$SKIP_OSRM" != "1" ]; then
    echo "🚀 Starting OSRM service..."

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo "⚠️  Docker not found. Set SKIP_OSRM=1 to skip OSRM and continue."
        exit 1
    fi

    # Create osrm-network if it doesn't exist
    if ! docker network inspect osrm-network >/dev/null 2>&1; then
        echo "📡 Creating osrm-network..."
        docker network create osrm-network
    fi

    # Create osrm-data volume if it doesn't exist
    if ! docker volume inspect osrm-data >/dev/null 2>&1; then
        echo "📦 Creating osrm-data volume..."
        docker volume create osrm-data
    fi

    # Check if OSRM data is loaded
    OSRM_FILES=$(docker run --rm -v osrm-data:/data alpine sh -c 'ls /data/*.osrm 2>/dev/null | wc -l' 2>/dev/null || echo "0")

    if [ "$OSRM_FILES" = "0" ]; then
        echo "📥 OSRM data not found. Loading Monaco data (fast for local dev)..."
        echo "   This is a one-time setup. Data will be persisted."
        echo ""
        docker-compose --env-file "$CONFIG_DIR/.env.local" -f "$COMPOSE_DIR/docker-compose.osrm-data.yml" up
    fi

    # Start OSRM service
    export COMPOSE_PROJECT_NAME="${PROJECT_NAME}-${ENVIRONMENT}"
    docker-compose --env-file "$CONFIG_DIR/.env.local" -f "$COMPOSE_DIR/docker-compose.osrm.yml" up -d

    # Wait for OSRM to be healthy
    echo "⏳ Waiting for OSRM to be ready..."
    for i in {1..30}; do
        if curl -sf "http://localhost:5001/nearest/v1/driving/2.3522,48.8566" > /dev/null 2>&1; then
            echo "✅ OSRM is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "⚠️  OSRM didn't become ready in time, but continuing anyway..."
        fi
        sleep 1
    done
    echo ""
else
    echo "⏭️  Skipping OSRM (SKIP_OSRM=1)"
    echo ""
fi

# Start dev servers
echo "🚀 Starting development servers..."
echo "   - API: http://127.0.0.1:$API_PORT"
echo "   - Frontend: http://127.0.0.1:$WEB_PORT"
echo ""

cd "$ROOT_DIR"
# Pass environment variables to individual services
PORT="$API_PORT" HOST=127.0.0.1 pnpm --filter services-api dev &
WEB_PORT="$WEB_PORT" pnpm --filter apps-web-frontend dev &
wait
