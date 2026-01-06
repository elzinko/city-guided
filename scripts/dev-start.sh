#!/bin/bash
# Start development environment with OSRM + dev servers
# Usage:
#   npm run dev              → Start OSRM + dev servers
#   SKIP_OSRM=1 npm run dev  → Skip OSRM, only start dev servers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$ROOT_DIR/infra/docker"

SKIP_OSRM="${SKIP_OSRM:-0}"

# Start OSRM (unless skipped)
if [ "$SKIP_OSRM" != "1" ]; then
    echo "🚀 Starting OSRM service..."

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo "⚠️  Docker not found. Set SKIP_OSRM=1 to skip OSRM and continue."
        exit 1
    fi

    # Check if OSRM data is loaded
    OSRM_FILES=$(docker run --rm -v osrm-data:/data alpine sh -c 'ls /data/*.osrm 2>/dev/null | wc -l' 2>/dev/null || echo "0")

    if [ "$OSRM_FILES" = "0" ]; then
        echo "📥 OSRM data not found. Loading Monaco data (fast for local dev)..."
        echo "   This is a one-time setup. Data will be persisted."
        echo ""
        docker-compose --env-file "$DOCKER_DIR/.env.local" -f "$DOCKER_DIR/docker-compose.osrm-data.yml" up
    fi

    # Start OSRM service
    docker-compose --env-file "$DOCKER_DIR/.env.local" -f "$DOCKER_DIR/docker-compose.osrm.yml" up -d

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
echo "   - API: http://localhost:3001"
echo "   - Frontend: http://localhost:3080"
echo ""

cd "$ROOT_DIR"
pnpm -r --parallel --filter apps-web-frontend --filter services-api dev
