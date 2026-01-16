#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Build Script - Build Docker images locally
# ═══════════════════════════════════════════════════════════════════════════════
#
# Use this when you want to build images locally instead of using GHCR images.
# Useful for development when you have local changes to test.
#
# Usage:
#   ./build.sh [environment]
#   ./build.sh local        # Build for local development
#   ./build.sh              # Default: local
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

ENVIRONMENT="${1:-local}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DOCKER_DIR"

ENV_FILE=".env.${ENVIRONMENT}"

echo "╔════════════════════════════════════════════════════════╗"
echo "║         🔨 Building Docker images locally              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Environment: ${ENVIRONMENT}"
echo ""

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  ${ENV_FILE} not found, using defaults"
fi

# Build images using the build override file
echo "🔨 Building API image..."
docker compose -f ../compose/docker-compose.yml -f ../compose/docker-compose.yml -f ../compose/docker-compose.build.yml --env-file "$ENV_FILE" build api

echo ""
echo "🔨 Building Web image..."
docker compose -f ../compose/docker-compose.yml -f ../compose/docker-compose.yml -f ../compose/docker-compose.build.yml --env-file "$ENV_FILE" build web

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║          ✅ Build Complete!                            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📦 Built images:"
echo "   - city-guided-api:local"
echo "   - city-guided-web:local"
echo ""
echo "💡 To use these images, update your .env.${ENVIRONMENT}:"
echo "   API_IMAGE=city-guided-api:local"
echo "   WEB_IMAGE=city-guided-web:local"
echo ""
echo "   Then run: ./scripts/start.sh ${ENVIRONMENT}"
echo ""

