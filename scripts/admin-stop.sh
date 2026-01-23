#!/bin/bash
# Stop POI Admin environment
# Usage: pnpm admin:stop

set -e

echo "🛑 Stopping POI Admin environment..."
echo ""

# Stop processes on ports 4000 and 3081
echo "📦 Stopping API and Admin servers..."
PIDS=$(lsof -ti:4000,3081 2>/dev/null || true)
if [ -n "$PIDS" ]; then
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    echo "✅ Servers stopped"
else
    echo "ℹ️  No servers running on ports 4000/3081"
fi
echo ""

echo "✨ POI Admin environment stopped!"
