#!/bin/bash
# Setup Docker infrastructure for City-Guided
# Creates required networks and volumes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Setting up Docker infrastructure..."
echo ""

# Create OSRM network if it doesn't exist
if ! docker network inspect osrm-network >/dev/null 2>&1; then
    echo "📡 Creating osrm-network..."
    docker network create osrm-network
    echo "✅ Network created"
else
    echo "✅ Network osrm-network already exists"
fi

echo ""

# Create OSRM data volume if it doesn't exist
if ! docker volume inspect osrm-data >/dev/null 2>&1; then
    echo "💾 Creating osrm-data volume..."
    docker volume create osrm-data
    echo "✅ Volume created"
else
    echo "✅ Volume osrm-data already exists"
fi

echo ""

# Check if .env.local exists
if [ ! -f "$DOCKER_DIR/.env.local" ]; then
    echo "⚠️  .env.local not found. Creating from template..."
    cp "$DOCKER_DIR/.env.example" "$DOCKER_DIR/.env.local"
    echo "✅ Created .env.local - please review and adjust if needed"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Load OSRM data: cd infra/docker && docker-compose --env-file .env.local -f ../../docker/docker-compose.osrm-data.yml up"
echo "   2. Start OSRM: npm run docker:local:start (or use scripts/local-start.sh)"
echo ""
