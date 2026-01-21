#!/bin/bash
# Setup Docker infrastructure for City-Guided
# Creates required networks and volumes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$(dirname "$DEPLOYMENT_DIR")/config"

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
if [ ! -f "$CONFIG_DIR/.env.local" ]; then
    echo "⚠️  .env.local not found. Creating from template..."
    if [ -f "$CONFIG_DIR/.env.example" ]; then
        cp "$CONFIG_DIR/.env.example" "$CONFIG_DIR/.env.local"
        echo "✅ Created .env.local - please review and adjust if needed"
    else
        echo "❌ .env.example not found in $CONFIG_DIR"
        exit 1
    fi
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Start environment: pnpm docker:local:start"
echo "   2. Or load OSRM data manually: cd infra/deployment && ./scripts/start.sh local"
echo ""
