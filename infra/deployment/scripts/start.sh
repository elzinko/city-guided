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
# Helper: run_with_timeout - runs a command with optional timeout
# Uses gtimeout (macOS with coreutils) or timeout (Linux), or runs without timeout
# ───────────────────────────────────────────────────────────────────────────────
run_with_timeout() {
    local timeout_seconds="$1"
    shift
    
    if command -v gtimeout &> /dev/null; then
        gtimeout "$timeout_seconds" "$@"
    elif command -v timeout &> /dev/null; then
        timeout "$timeout_seconds" "$@"
    else
        # No timeout command available, run without timeout
        echo "⚠️  timeout command not found, running without timeout limit"
        "$@"
    fi
}

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

# Set COMPOSE_PROJECT_NAME for docker-compose stack naming
# Format: city-guided-<environment> (ex: city-guided-local, city-guided-staging)
export COMPOSE_PROJECT_NAME="${PROJECT_NAME:-city-guided}-${ENVIRONMENT}"
echo "[DEBUG] COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME"

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
docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" -f compose/docker-compose.osrm.yml down --remove-orphans 2>/dev/null || true

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
# OSRM Service (optional - disabled by default)
# ───────────────────────────────────────────────────────────────────────────────
# To enable OSRM, set ENABLE_OSRM=true in your .env file or environment
# Files are preserved in compose/docker-compose.osrm.yml and docker-compose.osrm-data.yml

if [ "${ENABLE_OSRM:-false}" = "true" ]; then
    echo "🗺️  OSRM enabled, checking data..."
    
    # Check if OSRM data is loaded
    OSRM_FILES=$(docker run --rm -v osrm-data:/data alpine sh -c 'ls /data/*.osrm 2>/dev/null | wc -l' 2>/dev/null || echo "0")
    
    if [ "$OSRM_FILES" = "0" ]; then
        echo "📥 OSRM data not loaded yet"
        echo "   Loading OSRM data (this may take a while)..."
        echo "   ⚠️  First run: download + extraction + partition + customize..."
        run_with_timeout 1800 docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" -f compose/docker-compose.osrm-data.yml up || {
            echo "⚠️  OSRM data loading timed out or failed"
            echo "   Continuing anyway - OSRM service may not work until data is loaded"
        }
        echo ""
    else
        echo "✅ OSRM data volume exists with data"
    fi

    echo "🗺️  Starting OSRM service..."
    docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" -f compose/docker-compose.osrm.yml up -d --remove-orphans

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
else
    echo "⏭️  OSRM disabled (set ENABLE_OSRM=true to enable)"
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
    # Note: Don't use --remove-orphans here to avoid removing OSRM container started earlier
    docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" -f compose/docker-compose.yml -f compose/docker-compose.build.yml up -d
elif [ -n "${API_IMAGE:-}" ] && [ -n "${WEB_IMAGE:-}" ]; then
    echo "🐳 Using pre-built images:"
    echo "   API: ${API_IMAGE}"
    echo "   Web: ${WEB_IMAGE}"
    echo ""
    echo "🚀 Starting application services..."
    # Note: Don't use --remove-orphans here to avoid removing OSRM container started earlier
    docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" up -d
else
    echo "🐳 Using default GHCR images (latest)..."
    echo "🚀 Starting application services..."
    # Note: Don't use --remove-orphans here to avoid removing OSRM container started earlier
    docker compose -f compose/docker-compose.yml --env-file "$ENV_FILE" up -d
fi

# ───────────────────────────────────────────────────────────────────────────────
# Summary
# ───────────────────────────────────────────────────────────────────────────────

echo ""
echo "📋 Container status:"
docker ps --filter "name=${COMPOSE_PROJECT_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║          ✨ ${ENVIRONMENT} Environment Started!        "
echo "╚════════════════════════════════════════════════════════╝"
echo ""

if [ "$ENVIRONMENT" = "local" ] || [ "$ENVIRONMENT" = "ci" ]; then
    echo "🌍 URLs (via Caddy reverse proxy):"
    echo "   Frontend: http://localhost"
    echo "   API:      http://localhost/api"
    if [ "${ENABLE_OSRM:-false}" = "true" ]; then
        echo "   OSRM:     http://localhost/osrm"
    fi
    echo ""
    echo "   Direct access (debug):"
    echo "   Frontend: http://localhost:${WEB_PORT:-3080}"
    echo "   API:      http://localhost:${API_PORT:-4000}"
    if [ "${ENABLE_OSRM:-false}" = "true" ]; then
        echo "   OSRM:     http://localhost:${OSRM_PORT:-5001}"
    fi
else
    echo "🌍 URL: https://${SITE_DOMAIN:-example.com}"
    echo "   API:  https://${SITE_DOMAIN:-example.com}/api"
    if [ "${ENABLE_OSRM:-false}" = "true" ]; then
        echo "   OSRM: https://${SITE_DOMAIN:-example.com}/osrm"
    fi
fi

echo ""
echo "📝 Commands:"
echo "   Logs:  pnpm docker:logs ${ENVIRONMENT}"
echo "   Stop:  pnpm docker:stop ${ENVIRONMENT}"
echo ""

