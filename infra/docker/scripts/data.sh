#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════════════════════
# OSRM Data Volume Management
# ═══════════════════════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./data.sh                   # Create osrm-data volume if it doesn't exist
#   ./data.sh --force          # Force recreate volume
#   ./data.sh --remove         # Remove volume
#   ./data.sh --info           # Show volume info
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

VOLUME_NAME="osrm-data"

# ───────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ───────────────────────────────────────────────────────────────────────────────

FORCE=false
REMOVE=false
INFO=false

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
    --info|-i)
      INFO=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --force, -f    Force recreate volume"
      echo "  --remove, -r   Remove volume"
      echo "  --info, -i     Show volume information"
      echo "  --help, -h     Show this help"
      echo ""
      echo "Volume name: $VOLUME_NAME"
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
# Show volume info
# ───────────────────────────────────────────────────────────────────────────────

if [ "$INFO" = true ]; then
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║         💾 OSRM Data Volume Info                      "
  echo "╚════════════════════════════════════════════════════════╝"
  echo ""

  if docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
    echo "📋 Volume details:"
    docker volume inspect "$VOLUME_NAME" --format "table {{.Name}}\t{{.Driver}}\t{{.Mountpoint}}"

    echo ""
    echo "📁 Volume contents:"
    docker run --rm -v "$VOLUME_NAME:/data" alpine sh -c 'ls -la /data 2>/dev/null || echo "Volume is empty"'

    echo ""
    echo "📊 Volume usage:"
    docker run --rm -v "$VOLUME_NAME:/data" alpine sh -c 'du -sh /data 2>/dev/null || echo "Cannot determine size"'
  else
    echo "❌ Volume $VOLUME_NAME does not exist"
    exit 1
  fi

  exit 0
fi

# ───────────────────────────────────────────────────────────────────────────────
# Remove volume
# ───────────────────────────────────────────────────────────────────────────────

if [ "$REMOVE" = true ]; then
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║         🗑️  Removing OSRM Data Volume                 "
  echo "╚════════════════════════════════════════════════════════╝"
  echo ""

  if docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
    echo "💾 Removing volume: $VOLUME_NAME"
    docker volume rm "$VOLUME_NAME"
    echo "✅ Volume removed"
  else
    echo "ℹ️  Volume $VOLUME_NAME does not exist"
  fi

  exit 0
fi

# ───────────────────────────────────────────────────────────────────────────────
# Create volume
# ───────────────────────────────────────────────────────────────────────────────

echo "╔════════════════════════════════════════════════════════╗"
echo "║         💾 Creating OSRM Data Volume                  "
echo "╚════════════════════════════════════════════════════════╝"
echo ""

if [ "$FORCE" = true ]; then
  echo "🔄 Force recreating volume: $VOLUME_NAME"

  # Remove existing volume if it exists
  if docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
    docker volume rm "$VOLUME_NAME"
    echo "✅ Old volume removed"
  fi

  # Create new volume
  docker volume create "$VOLUME_NAME"
  echo "✅ Volume created: $VOLUME_NAME"

elif docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
  echo "✅ Volume $VOLUME_NAME already exists"

else
  echo "📦 Creating volume: $VOLUME_NAME"
  docker volume create "$VOLUME_NAME"
  echo "✅ Volume created: $VOLUME_NAME"
fi

echo ""
echo "📋 Volume info:"
docker volume inspect "$VOLUME_NAME" --format "table {{.Name}}\t{{.Driver}}\t{{.Mountpoint}}"