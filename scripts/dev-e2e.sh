#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Run E2E Tests - Start environment and run tests
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./scripts/dev-e2e.sh              # Run tests with Docker (recommended)
#   ./scripts/dev-e2e.sh --no-docker  # Run tests with dev servers (pnpm dev)
#   ./scripts/dev-e2e.sh --keep-up    # Keep services running after tests
#
# This script:
# 1. Starts the full environment (OSRM + API + Web + Caddy)
# 2. Waits for all services to be ready
# 3. Runs E2E tests
# 4. Optionally stops services (unless --keep-up)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

USE_DOCKER=true
KEEP_UP=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-docker)
            USE_DOCKER=false
            shift
            ;;
        --keep-up)
            KEEP_UP=true
            shift
            ;;
        *)
            echo "❌ Unknown option: $1"
            echo "Usage: $0 [--no-docker] [--keep-up]"
            exit 1
            ;;
    esac
done

cd "$ROOT_DIR"

echo "╔════════════════════════════════════════════════════════╗"
echo "║         🧪 E2E Tests Runner                            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Configuration:"
echo "   Mode:        $([ "$USE_DOCKER" = "true" ] && echo "Docker" || echo "Dev servers")"
echo "   Keep up:     $([ "$KEEP_UP" = "true" ] && echo "Yes" || echo "No")"
echo ""

# ───────────────────────────────────────────────────────────────────────────────
# Start environment
# ───────────────────────────────────────────────────────────────────────────────

if [ "$USE_DOCKER" = "true" ]; then
    echo "🐳 Starting Docker environment..."
    pnpm docker:start local
    
    echo ""
    echo "⏳ Waiting for all services to be ready..."
    pnpm docker:wait local all
    
    # Set E2E_BASE_URL for tests (via Caddy on port 80)
    export E2E_BASE_URL="http://localhost"
    export NEXT_PUBLIC_API_URL="http://localhost/api"
    export NEXT_PUBLIC_OSRM_URL="http://localhost/osrm"
else
    echo "🚀 Starting dev servers..."
    echo "   Note: Make sure OSRM is running (or set SKIP_OSRM=1)"
    echo ""
    
    # Start dev servers in background
    pnpm dev &
    DEV_PID=$!
    
    # Wait for servers to be ready
    echo "⏳ Waiting for dev servers..."
    for i in {1..60}; do
        if curl -sf "http://localhost:3080" > /dev/null 2>&1 && \
           curl -sf "http://localhost:4000/api/health" > /dev/null 2>&1; then
            echo "✅ Dev servers ready"
            break
        fi
        if [ $i -eq 60 ]; then
            echo "❌ Dev servers didn't start in time"
            kill $DEV_PID 2>/dev/null || true
            exit 1
        fi
        sleep 1
    done
    
    # Set E2E_BASE_URL for tests (direct ports)
    export E2E_BASE_URL="http://localhost:3080"
    export NEXT_PUBLIC_API_URL="http://localhost:4000"
    export NEXT_PUBLIC_OSRM_URL="http://localhost:5001"
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║         🧪 Running E2E Tests                            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ───────────────────────────────────────────────────────────────────────────────
# Run tests
# ───────────────────────────────────────────────────────────────────────────────

TEST_EXIT_CODE=0
pnpm test:e2e || TEST_EXIT_CODE=$?

echo ""

# ───────────────────────────────────────────────────────────────────────────────
# Cleanup
# ───────────────────────────────────────────────────────────────────────────────

if [ "$KEEP_UP" = "false" ]; then
    if [ "$USE_DOCKER" = "true" ]; then
        echo "🛑 Stopping Docker environment..."
        pnpm docker:stop local
    else
        echo "🛑 Stopping dev servers..."
        kill $DEV_PID 2>/dev/null || true
        pnpm dev:stop || true
    fi
    echo "✅ Environment stopped"
else
    echo "💡 Services kept running (--keep-up flag)"
    if [ "$USE_DOCKER" = "true" ]; then
        echo "   Access: http://localhost"
        echo "   Stop:   pnpm docker:stop local"
    else
        echo "   Access: http://localhost:3080"
        echo "   Stop:   pnpm dev:stop"
    fi
fi

echo ""

# Exit with test result
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✨ All tests passed!"
    exit 0
else
    echo "❌ Some tests failed (exit code: $TEST_EXIT_CODE)"
    exit $TEST_EXIT_CODE
fi
