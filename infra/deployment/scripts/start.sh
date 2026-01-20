#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Start Environment - Generic for any environment
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./start.sh <environment>
#   ./start.sh local
#   ./start.sh staging
#   ./start.sh prod
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ───────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ───────────────────────────────────────────────────────────────────────────────

ENVIRONMENT="${1:-local}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$(dirname "$DEPLOYMENT_DIR")/config"

echo "[DEBUG] SCRIPT_DIR=$SCRIPT_DIR"
echo "[DEBUG] DEPLOYMENT_DIR=$DEPLOYMENT_DIR"
echo "[DEBUG] CONFIG_DIR=$CONFIG_DIR"
echo "[DEBUG] Current directory before cd: $(pwd)"

cd "$DEPLOYMENT_DIR" || {
    echo "❌ Failed to cd to $DEPLOYMENT_DIR"
    exit 1
}

echo "[DEBUG] Current directory after cd: $(pwd)"

ENV_FILE="${CONFIG_DIR}/.env.${ENVIRONMENT}"

echo "[DEBUG] ENV_FILE=$ENV_FILE"

echo "╔════════════════════════════════════════════════════════╗"
echo "║         🚀 Starting ${ENVIRONMENT} environment"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ───────────────────────────────────────────────────────────────────────────────
# Check prerequisites FIRST (before using ENV_FILE)
# ───────────────────────────────────────────────────────────────────────────────

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ ${ENV_FILE} not found!"
    echo "   Run: ./scripts/setup.sh"
    echo "   Or:  cp .env.template ${ENV_FILE}"
    exit 1
fi

echo "[DEBUG] Loading environment file: $ENV_FILE"
# Load environment variables
source "$ENV_FILE"
echo "[DEBUG] Environment file loaded successfully"

# ───────────────────────────────────────────────────────────────────────────────
# Stop existing containers first (to avoid port conflicts)
# ───────────────────────────────────────────────────────────────────────────────

echo "🛑 Stopping existing containers (if any)..."
echo "[DEBUG] Running docker compose down commands..."
# Stop application services - try both with and without build override to catch all containers
echo "[DEBUG] Command 1: docker compose down (app services)"
docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" down --remove-orphans 2>/dev/null || true
echo "[DEBUG] Command 2: docker compose down (app services with build)"
docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" -f compose/docker-compose.yml -f compose/docker-compose.build.yml down --remove-orphans 2>/dev/null || true
# Stop OSRM service
echo "[DEBUG] Command 3: docker compose down (OSRM)"
docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" -f ../docker/docker-compose.osrm.yml down --remove-orphans 2>/dev/null || true

# Force remove any orphaned OSRM container (prevents conflict errors)
echo "[DEBUG] Command 4: force remove orphaned OSRM container"
docker rm -f osrm 2>/dev/null || true

echo "✅ Existing containers stopped"
echo ""

echo "📋 Configuration:"
echo "   Environment: ${ENVIRONMENT}"
echo "   Site Domain: ${SITE_DOMAIN:-localhost}"
echo "   OSRM Port:   ${OSRM_PORT:-5001}"
echo ""

# ───────────────────────────────────────────────────────────────────────────────
# Create Docker network
# ───────────────────────────────────────────────────────────────────────────────

echo "🔗 Creating Docker network..."
docker network create osrm-network 2>/dev/null || true

# ───────────────────────────────────────────────────────────────────────────────
# Check and load OSRM data
# ───────────────────────────────────────────────────────────────────────────────

# Skip OSRM data loading if SKIP_OSRM_DATA_LOAD is set (useful for CI)
if [ "${SKIP_OSRM_DATA_LOAD:-false}" = "true" ]; then
    echo "⏭️  Skipping OSRM data loading (SKIP_OSRM_DATA_LOAD=true)"
    echo ""
elif ! docker volume inspect osrm-data >/dev/null 2>&1; then
    echo "📥 OSRM data volume not found, creating and loading data..."
    echo "   ⚠️  This may take a while (download + extraction + partition + customize)..."
    docker volume create osrm-data
    # Add timeout to prevent infinite blocking (30 minutes max)
    timeout 1800 docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" -f ../docker/docker-compose.osrm-data.yml up || {
        echo "⚠️  OSRM data loading timed out or failed"
        echo "   Continuing anyway - OSRM service may not work until data is loaded"
    }
    echo ""
else
    # Check if OSRM data is loaded
    OSRM_FILES=$(docker run --rm -v osrm-data:/data alpine sh -c 'ls /data/*.osrm 2>/dev/null | wc -l' || echo "0")
    
    if [ "$OSRM_FILES" = "0" ]; then
        echo "⚠️  OSRM data not loaded yet"
        echo "   Loading OSRM data (this may take a while)..."
        # Add timeout to prevent infinite blocking (30 minutes max)
        timeout 1800 docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" -f ../docker/docker-compose.osrm-data.yml up || {
            echo "⚠️  OSRM data loading timed out or failed"
            echo "   Continuing anyway - OSRM service may not work until data is loaded"
        }
        echo ""
    else
        echo "✅ OSRM data volume exists with data"
    fi
fi

# ───────────────────────────────────────────────────────────────────────────────
# Start OSRM service
# ───────────────────────────────────────────────────────────────────────────────

# Skip OSRM service if SKIP_OSRM_DATA_LOAD is set (useful for CI)
if [ "${SKIP_OSRM_DATA_LOAD:-false}" = "true" ]; then
    echo "⏭️  Skipping OSRM service (SKIP_OSRM_DATA_LOAD=true)"
    echo ""
else
    echo "🗺️  Starting OSRM service..."
    docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" -f ../docker/docker-compose.osrm.yml up -d --remove-orphans

    # Wait for OSRM to be ready
    echo "⏳ Waiting for OSRM to be ready..."
    OSRM_CHECK_PORT="${OSRM_PORT:-5001}"

    for i in {1..30}; do
        if curl -sf "http://localhost:${OSRM_CHECK_PORT}/nearest/v1/driving/2.3522,48.8566" > /dev/null 2>&1; then
            echo "✅ OSRM is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "⚠️  OSRM not responding yet, continuing anyway..."
            echo "   Check logs: ./scripts/logs.sh ${ENVIRONMENT} osrm"
        fi
        sleep 2
    done
    echo ""
fi

# ───────────────────────────────────────────────────────────────────────────────
# Start application
# ───────────────────────────────────────────────────────────────────────────────

# Determine build mode:
# - BUILD_MODE=local : build images locally (for dev/CI)
# - API_IMAGE/WEB_IMAGE set : pull from GHCR (for staging/prod)
# - Default for local: build locally (ARM64 compatibility)
# - Default for other envs: pull from GHCR

# Check if we should build locally
# - BUILD_MODE=local explicitly set
# - Environment is local AND no images are explicitly specified
SHOULD_BUILD_LOCAL=false
if [ "${BUILD_MODE:-}" = "local" ]; then
    SHOULD_BUILD_LOCAL=true
elif [ "$ENVIRONMENT" = "local" ]; then
    # For local environment, build locally by default unless images are explicitly set
    if [ -z "${API_IMAGE}" ] && [ -z "${WEB_IMAGE}" ]; then
        SHOULD_BUILD_LOCAL=true
    fi
fi

if [ "$SHOULD_BUILD_LOCAL" = "true" ]; then
    echo "🔨 Building images locally..."
    docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" -f compose/docker-compose.yml -f compose/docker-compose.build.yml build
    echo ""
    echo "🚀 Starting application services..."
    docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" -f compose/docker-compose.yml -f compose/docker-compose.build.yml up -d --remove-orphans
elif [ -n "${API_IMAGE:-}" ] && [ -n "${WEB_IMAGE:-}" ]; then
    echo "🐳 Using pre-built images:"
    echo "   API: ${API_IMAGE}"
    echo "   Web: ${WEB_IMAGE}"
    echo ""
    echo "🚀 Starting application services..."
    docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" up -d --remove-orphans
else
    echo "🐳 Using default GHCR images (latest)..."
    echo "🚀 Starting application services..."
    docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" up -d --remove-orphans
fi

# ───────────────────────────────────────────────────────────────────────────────
# Summary
# ───────────────────────────────────────────────────────────────────────────────

echo ""
echo "📋 Container status:"
docker ps --filter "name=${PROJECT_NAME:-city-guided}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║          ✨ ${ENVIRONMENT} Environment Started!        "
echo "╚════════════════════════════════════════════════════════╝"
echo ""

if [ "$ENVIRONMENT" = "local" ] || [ "$ENVIRONMENT" = "ci" ]; then
    echo "🌍 URLs (via Caddy reverse proxy):"
    echo "   Frontend: http://localhost"
    echo "   API:      http://localhost/api"
    echo "   OSRM:     http://localhost/osrm"
    echo ""
    echo "   Direct access (debug):"
    echo "   Frontend: http://localhost:${WEB_PORT:-3080}"
    echo "   API:      http://localhost:${API_PORT:-4000}"
    echo "   OSRM:     http://localhost:${OSRM_PORT:-5001}"
else
    echo "🌍 URL: https://${SITE_DOMAIN:-example.com}"
    echo "   API:  https://${SITE_DOMAIN:-example.com}/api"
    echo "   OSRM: https://${SITE_DOMAIN:-example.com}/osrm"
fi

echo ""
echo "📝 Commands:"
echo "   Logs:  pnpm docker:logs ${ENVIRONMENT}"
echo "   Stop:  pnpm docker:stop ${ENVIRONMENT}"
echo ""

