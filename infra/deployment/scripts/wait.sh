#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Wait Script - Wait for services to be ready
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./wait.sh [environment] [service]
#   ./wait.sh local              # Wait for all services (via Caddy)
#   ./wait.sh ci osrm            # Wait for OSRM only
#   ./wait.sh staging api        # Wait for API only
#   ./wait.sh local caddy        # Wait for Caddy reverse proxy
#
# Services: osrm, api, web, caddy, all (default)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

ENVIRONMENT="${1:-local}"
SERVICE="${2:-all}"
TIMEOUT="${WAIT_TIMEOUT:-120}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DOCKER_DIR"

ENV_FILE=".env.${ENVIRONMENT}"

# Load environment if exists
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
fi

# Default ports
OSRM_PORT="${OSRM_PORT:-5001}"
API_PORT="${API_PORT:-4000}"
WEB_PORT="${WEB_PORT:-3080}"
CADDY_HTTP_PORT="${CADDY_HTTP_PORT:-80}"

# ───────────────────────────────────────────────────────────────────────────────
# Wait functions
# ───────────────────────────────────────────────────────────────────────────────

wait_for_osrm() {
    echo "⏳ Waiting for OSRM on port ${OSRM_PORT}..."
    local start_time=$(date +%s)
    
    while true; do
        if curl -sf "http://localhost:${OSRM_PORT}/nearest/v1/driving/2.3522,48.8566" > /dev/null 2>&1; then
            echo "✅ OSRM is ready"
            return 0
        fi
        
        local elapsed=$(($(date +%s) - start_time))
        if [ $elapsed -ge $TIMEOUT ]; then
            echo "❌ OSRM timeout after ${TIMEOUT}s"
            return 1
        fi
        
        echo "   OSRM not ready yet... (${elapsed}s/${TIMEOUT}s)"
        sleep 2
    done
}

wait_for_api() {
    echo "⏳ Waiting for API on port ${API_PORT}..."
    local start_time=$(date +%s)
    
    while true; do
        if curl -sf "http://localhost:${API_PORT}/api/health" > /dev/null 2>&1; then
            echo "✅ API is ready"
            return 0
        fi
        
        local elapsed=$(($(date +%s) - start_time))
        if [ $elapsed -ge $TIMEOUT ]; then
            echo "❌ API timeout after ${TIMEOUT}s"
            return 1
        fi
        
        echo "   API not ready yet... (${elapsed}s/${TIMEOUT}s)"
        sleep 2
    done
}

wait_for_web() {
    echo "⏳ Waiting for Web on port ${WEB_PORT}..."
    local start_time=$(date +%s)
    
    while true; do
        if curl -sf "http://localhost:${WEB_PORT}" > /dev/null 2>&1; then
            echo "✅ Web is ready"
            return 0
        fi
        
        local elapsed=$(($(date +%s) - start_time))
        if [ $elapsed -ge $TIMEOUT ]; then
            echo "❌ Web timeout after ${TIMEOUT}s"
            return 1
        fi
        
        echo "   Web not ready yet... (${elapsed}s/${TIMEOUT}s)"
        sleep 2
    done
}

wait_for_caddy() {
    echo "⏳ Waiting for Caddy on port ${CADDY_HTTP_PORT}..."
    local start_time=$(date +%s)
    
    while true; do
        # Check frontend via Caddy
        if curl -sf "http://localhost:${CADDY_HTTP_PORT}" > /dev/null 2>&1; then
            # Also check API via Caddy
            if curl -sf "http://localhost:${CADDY_HTTP_PORT}/api/health" > /dev/null 2>&1; then
                echo "✅ Caddy is ready (frontend + API proxied)"
                return 0
            fi
        fi
        
        local elapsed=$(($(date +%s) - start_time))
        if [ $elapsed -ge $TIMEOUT ]; then
            echo "❌ Caddy timeout after ${TIMEOUT}s"
            return 1
        fi
        
        echo "   Caddy not ready yet... (${elapsed}s/${TIMEOUT}s)"
        sleep 2
    done
}

# ───────────────────────────────────────────────────────────────────────────────
# Main
# ───────────────────────────────────────────────────────────────────────────────

echo "╔════════════════════════════════════════════════════════╗"
echo "║         ⏳ Waiting for services                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Environment: ${ENVIRONMENT}"
echo "📋 Service:     ${SERVICE}"
echo "📋 Timeout:     ${TIMEOUT}s"
echo ""

case "$SERVICE" in
    osrm)
        wait_for_osrm
        ;;
    api)
        wait_for_api
        ;;
    web)
        wait_for_web
        ;;
    caddy)
        wait_for_caddy
        ;;
    all)
        wait_for_osrm
        wait_for_caddy  # Caddy proxies both web and API
        ;;
    *)
        echo "❌ Unknown service: $SERVICE"
        echo "   Valid services: osrm, api, web, caddy, all"
        exit 1
        ;;
esac

echo ""
echo "✨ All requested services are ready!"
echo ""

