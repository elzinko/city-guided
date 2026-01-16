#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Show Container Status - Quick overview of all containers
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./status.sh [environment]
#   ./status.sh local
#   ./status.sh staging
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

ENVIRONMENT="${1:-local}"
CONTAINER_PREFIX="city-guided-${ENVIRONMENT}"

echo "╔════════════════════════════════════════════════════════╗"
echo "║         📊 Container Status (${ENVIRONMENT})            "
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# List all containers with the prefix
echo "📋 Containers:"
echo ""
docker ps -a --filter "name=${CONTAINER_PREFIX}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || {
    echo "⚠️  No containers found with prefix: ${CONTAINER_PREFIX}"
    echo ""
    echo "💡 Try:"
    echo "   pnpm docker:start ${ENVIRONMENT}"
    echo ""
    exit 1
}

echo ""
echo "📝 Quick commands:"
echo "   Logs:     pnpm docker:logs ${ENVIRONMENT}"
echo "   Logs API: pnpm docker:logs ${ENVIRONMENT} api"
echo "   Logs Web: pnpm docker:logs ${ENVIRONMENT} web"
echo "   Logs Caddy: pnpm docker:logs ${ENVIRONMENT} caddy"
echo ""

# Check if containers are running
RUNNING=$(docker ps --filter "name=${CONTAINER_PREFIX}" --format "{{.Names}}" 2>/dev/null | wc -l | tr -d ' ')
TOTAL=$(docker ps -a --filter "name=${CONTAINER_PREFIX}" --format "{{.Names}}" 2>/dev/null | wc -l | tr -d ' ')

if [ "$RUNNING" -eq 0 ]; then
    echo "⚠️  No containers are running!"
    echo "   Start with: pnpm docker:start ${ENVIRONMENT}"
elif [ "$RUNNING" -lt "$TOTAL" ]; then
    echo "⚠️  Some containers are stopped ($RUNNING/$TOTAL running)"
    echo "   Check logs: pnpm docker:logs ${ENVIRONMENT}"
else
    echo "✅ All containers are running ($RUNNING/$TOTAL)"
fi

echo ""
