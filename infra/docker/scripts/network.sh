#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Docker Network Management
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./network.sh              # Create osrm-network if it doesn't exist
#   ./network.sh --force      # Force recreate network
#   ./network.sh --remove     # Remove network
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

NETWORK_NAME="osrm-network"

# ───────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ───────────────────────────────────────────────────────────────────────────────

FORCE=false
REMOVE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --force|-f)
      FORCE=true
      shift
      ;;
    --remove|-r)
      REMOVE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --force, -f    Force recreate network"
      echo "  --remove, -r   Remove network"
      echo "  --help, -h     Show this help"
      echo ""
      echo "Network name: $NETWORK_NAME"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# ───────────────────────────────────────────────────────────────────────────────
# Remove network
# ───────────────────────────────────────────────────────────────────────────────

if [ "$REMOVE" = true ]; then
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║         🗑️  Removing Docker Network                    "
  echo "╚════════════════════════════════════════════════════════╝"
  echo ""

  if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    echo "🔗 Removing network: $NETWORK_NAME"
    docker network rm "$NETWORK_NAME"
    echo "✅ Network removed"
  else
    echo "ℹ️  Network $NETWORK_NAME does not exist"
  fi

  exit 0
fi

# ───────────────────────────────────────────────────────────────────────────────
# Create network
# ───────────────────────────────────────────────────────────────────────────────

echo "╔════════════════════════════════════════════════════════╗"
echo "║         🔗 Creating Docker Network                     "
echo "╚════════════════════════════════════════════════════════╝"
echo ""

if [ "$FORCE" = true ]; then
  echo "🔄 Force recreating network: $NETWORK_NAME"

  # Remove existing network if it exists
  if docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    docker network rm "$NETWORK_NAME"
    echo "✅ Old network removed"
  fi

  # Create new network
  docker network create "$NETWORK_NAME"
  echo "✅ Network created: $NETWORK_NAME"

elif docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  echo "✅ Network $NETWORK_NAME already exists"

else
  echo "📡 Creating network: $NETWORK_NAME"
  docker network create "$NETWORK_NAME"
  echo "✅ Network created: $NETWORK_NAME"
fi

echo ""
echo "📋 Network info:"
docker network inspect "$NETWORK_NAME" --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"