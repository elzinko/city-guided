#!/bin/bash
# Vérification de la configuration réseau selon l'environnement

ENVIRONMENT="${1:-local}"

echo "╔════════════════════════════════════════════════════════╗"
echo "║      🔍 Network Configuration Check ($ENVIRONMENT)"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$(dirname "$DEPLOYMENT_DIR")/config"

ENV_FILE="${CONFIG_DIR}/.env.${ENVIRONMENT}"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ ${ENV_FILE} not found!"
    exit 1
fi

# Load environment
source "$ENV_FILE"

echo "📋 Environment: $ENVIRONMENT"
echo ""

# Check NEXT_PUBLIC_API_URL
echo "🌐 NEXT_PUBLIC_API_URL configuration:"
if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    echo "   ✅ Not defined (will use Next.js rewrites)"
    echo "   → Client calls: /api/* (relative)"
    echo "   → Next.js proxies to: http://api:${API_PORT:-4000}/api/*"
    EXPECTED_MODE="rewrites"
else
    echo "   ✅ Defined: $NEXT_PUBLIC_API_URL"
    echo "   → Client calls directly: $NEXT_PUBLIC_API_URL"
    echo "   → No Next.js rewriting"
    EXPECTED_MODE="direct"
fi

echo ""

# Check DOCKER_ENV
echo "🐳 Docker environment:"
if [ "$DOCKER_ENV" = "true" ]; then
    echo "   ✅ DOCKER_ENV=true"
    echo "   → Can use service names (api, osrm)"
else
    echo "   ⚠️  DOCKER_ENV not set or false"
    echo "   → Will use localhost for rewrites"
fi

echo ""

# Check SHOW_DEV_OPTIONS
echo "🛠️  Developer options:"
if [ "$SHOW_DEV_OPTIONS" = "true" ]; then
    echo "   ✅ SHOW_DEV_OPTIONS=true"
    echo "   → Dev control panel will be visible"
else
    echo "   ℹ️  SHOW_DEV_OPTIONS=false"
    echo "   → Dev control panel hidden (production mode)"
fi

echo ""

# Recommendations
echo "💡 Recommendations for $ENVIRONMENT:"
echo ""

if [ "$ENVIRONMENT" = "local" ]; then
    if [ -n "$NEXT_PUBLIC_API_URL" ]; then
        echo "   ⚠️  WARNING: NEXT_PUBLIC_API_URL should NOT be defined for local!"
        echo "   → Remove from .env.local to use Docker network rewrites"
        echo "   → This will avoid CORS issues and use internal networking"
    else
        echo "   ✅ Configuration is optimal for local development"
    fi
    
    if [ "$DOCKER_ENV" != "true" ]; then
        echo "   ⚠️  WARNING: DOCKER_ENV should be 'true' for Docker"
        echo "   → Add DOCKER_ENV=true to .env.local"
    fi
    
    if [ "$SHOW_DEV_OPTIONS" != "true" ]; then
        echo "   ℹ️  Consider setting SHOW_DEV_OPTIONS=true for local dev"
    fi
    
elif [ "$ENVIRONMENT" = "staging" ] || [ "$ENVIRONMENT" = "prod" ]; then
    if [ -z "$NEXT_PUBLIC_API_URL" ]; then
        echo "   ⚠️  WARNING: NEXT_PUBLIC_API_URL should be defined for $ENVIRONMENT!"
        echo "   → Add public URL to .env.$ENVIRONMENT"
        echo "   → Example: NEXT_PUBLIC_API_URL=https://yourdomain.com/api"
    else
        echo "   ✅ Configuration is correct for $ENVIRONMENT"
    fi
    
    if [ "$ENVIRONMENT" = "prod" ] && [ "$SHOW_DEV_OPTIONS" = "true" ]; then
        echo "   ⚠️  WARNING: SHOW_DEV_OPTIONS should be false in production"
        echo "   → Set SHOW_DEV_OPTIONS=false in .env.prod"
    fi
fi

echo ""

# Test connectivity if containers are running
if command -v docker &> /dev/null; then
    if docker ps --filter "name=web" --format "{{.Names}}" | grep -q "web"; then
        echo "🧪 Testing connectivity..."
        echo ""
        
        # Check web container env
        echo "   📦 Web container environment:"
        WEB_NEXT_PUBLIC_API=$(docker exec web printenv NEXT_PUBLIC_API_URL 2>/dev/null || echo "")
        WEB_DOCKER_ENV=$(docker exec web printenv DOCKER_ENV 2>/dev/null || echo "")
        WEB_SHOW_DEV=$(docker exec web printenv SHOW_DEV_OPTIONS 2>/dev/null || echo "")
        
        if [ -z "$WEB_NEXT_PUBLIC_API" ]; then
            echo "   ✅ NEXT_PUBLIC_API_URL: (not set - using rewrites)"
        else
            echo "   → NEXT_PUBLIC_API_URL: $WEB_NEXT_PUBLIC_API"
        fi
        echo "   → DOCKER_ENV: $WEB_DOCKER_ENV"
        echo "   → SHOW_DEV_OPTIONS: $WEB_SHOW_DEV"
        
        echo ""
        
        # Test API connectivity
        echo "   🔗 Testing API connectivity..."
        if docker exec web curl -sf http://api:4000/api/health > /dev/null 2>&1; then
            echo "   ✅ web → api:4000 : OK (Docker network)"
        else
            echo "   ❌ web → api:4000 : FAILED"
        fi
        
        if docker exec api curl -sf http://localhost:4000/api/health > /dev/null 2>&1; then
            echo "   ✅ api health check : OK"
        else
            echo "   ❌ api health check : FAILED"
        fi
    else
        echo "ℹ️  Containers not running. Start with: pnpm docker:start $ENVIRONMENT"
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║              ✅ Configuration Check Complete           "
echo "╚════════════════════════════════════════════════════════╝"
echo ""

if [ "$ENVIRONMENT" = "local" ] && [ -n "$NEXT_PUBLIC_API_URL" ]; then
    echo "⚠️  Action required: Remove NEXT_PUBLIC_API_URL from .env.local"
    echo "   Then rebuild: pnpm docker:build local && pnpm docker:start local"
    echo ""
fi
