#!/bin/bash
# Clean all Docker resources (containers, volumes, networks)
# WARNING: This will delete all data including OSRM data!

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DOCKER_DIR"

echo "⚠️  WARNING: This will remove all containers, volumes, and networks!"
echo "   Including OSRM data (you'll need to re-download)"
echo ""
read -p "Are you sure? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "🧹 Cleaning up..."
echo ""

# Stop all services
echo "📦 Stopping all services..."
docker-compose --env-file .env.local down -v 2>/dev/null || true
docker-compose --env-file .env.local -f ../docker/docker-compose.osrm.yml down 2>/dev/null || true

echo ""

# Remove images (optional - uncomment if you want to remove images too)
echo "🖼️  Removing images..."
docker-compose --env-file .env.local down --rmi local 2>/dev/null || true

echo ""

# Remove volumes
echo "💾 Removing volumes..."
docker volume rm osrm-data 2>/dev/null && echo "  ✓ osrm-data removed" || echo "  ⊘ osrm-data not found"

echo ""

# Remove networks
echo "📡 Removing networks..."
docker network rm osrm-network 2>/dev/null && echo "  ✓ osrm-network removed" || echo "  ⊘ osrm-network not found"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📝 To set up again: npm run docker:setup"
echo ""
