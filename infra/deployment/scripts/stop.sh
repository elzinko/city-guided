#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Stop Environment - Generic for any environment
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./stop.sh <environment>
#   ./stop.sh local
#   ./stop.sh ci          # Also cleans up volumes and network
#   ./stop.sh staging
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

cd "$DEPLOYMENT_DIR"

ENV_FILE="${CONFIG_DIR}/.env.${ENVIRONMENT}"

echo "╔════════════════════════════════════════════════════════╗"
echo "║         🛑 Stopping ${ENVIRONMENT} environment"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Load environment if exists
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
    ENV_FLAG="--env-file $ENV_FILE"
else
    echo "⚠️  ${ENV_FILE} not found, using defaults"
    ENV_FLAG=""
fi

# ───────────────────────────────────────────────────────────────────────────────
# Stop services
# ───────────────────────────────────────────────────────────────────────────────

echo "📦 Stopping application services..."

# Use build override if BUILD_MODE=local
if [ "${BUILD_MODE:-}" = "local" ]; then
    docker compose -f compose/docker-compose.yml $ENV_FLAG -f compose/docker-compose.yml -f compose/docker-compose.build.yml down -v 2>/dev/null || true
else
    docker compose -f compose/docker-compose.yml $ENV_FLAG down -v 2>/dev/null || true
fi

# Also stop old stacks with different project names (for backward compatibility)
if [ "$ENVIRONMENT" = "local" ]; then
    echo "🧹 Cleaning up old stack names..."
    docker compose -f compose/docker-compose.yml -p city-guide-local down -v 2>/dev/null || true
    docker compose -f compose/docker-compose.yml -p city-guided-local down -v 2>/dev/null || true
fi

echo ""
echo "🗺️  Stopping OSRM service..."
docker compose -f compose/docker-compose.yml $ENV_FLAG -f compose/docker-compose.osrm.yml down 2>/dev/null || true

# ───────────────────────────────────────────────────────────────────────────────
# CI cleanup: also remove network and volumes
# ───────────────────────────────────────────────────────────────────────────────

if [ "$ENVIRONMENT" = "ci" ]; then
    echo ""
    echo "🧹 CI cleanup: removing network and volumes..."
    docker network rm osrm-network 2>/dev/null || true
    docker volume rm osrm-data 2>/dev/null || true
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║          ✅ ${ENVIRONMENT} Environment Stopped         "
echo "╚════════════════════════════════════════════════════════╝"
echo ""

if [ "$ENVIRONMENT" != "ci" ]; then
    echo "💡 Tip: OSRM data is preserved in the osrm-data volume"
    echo "   To clean everything: pnpm docker:clean"
    echo ""
fi

