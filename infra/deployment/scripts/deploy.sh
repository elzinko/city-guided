#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Deploy Script - Generic for any environment
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script:
# 1. Fetches configuration from AWS SSM Parameter Store
# 2. Generates .env.<environment> file with image tags
# 3. Pulls images from GHCR and starts containers
#
# Usage:
#   ./deploy.sh <environment>
#   IMAGE_TAG=abc123 ./deploy.sh staging
#   ./deploy.sh prod
#
# Environment variables:
#   IMAGE_TAG - Docker image tag to deploy (default: latest)
#
# Prerequisites:
#   - AWS CLI configured with proper permissions
#   - SSM parameters provisioned via: pnpm provision <environment>
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ───────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ───────────────────────────────────────────────────────────────────────────────

ENVIRONMENT="${1:-staging}"
SSM_PATH="/city-guided/${ENVIRONMENT}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# GHCR images
GHCR_REPO="ghcr.io/elzinko/city-guided"
API_IMAGE="${GHCR_REPO}-api:${IMAGE_TAG}"
WEB_IMAGE="${GHCR_REPO}-web:${IMAGE_TAG}"

# Auto-detect AWS region from instance metadata (for EC2) or use default
if [ -z "$AWS_DEFAULT_REGION" ]; then
    # Try to get region from EC2 instance metadata
    TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null || true)
    if [ -n "$TOKEN" ]; then
        AWS_DEFAULT_REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null || echo "eu-west-3")
    else
        AWS_DEFAULT_REGION="eu-west-3"
    fi
    export AWS_DEFAULT_REGION
fi
echo "🌍 AWS Region: ${AWS_DEFAULT_REGION}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$(dirname "$DEPLOYMENT_DIR")/config"

cd "$DEPLOYMENT_DIR"

ENV_FILE="${CONFIG_DIR}/.env.${ENVIRONMENT}"

echo "╔════════════════════════════════════════════════════════╗"
echo "║         🚀 City-Guided Deployment                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Environment: ${ENVIRONMENT}"
echo "📦 SSM Path:    ${SSM_PATH}"
echo "📁 Config file: ${ENV_FILE}"
echo ""

# ───────────────────────────────────────────────────────────────────────────────
# Fetch configuration from AWS SSM Parameter Store
# ───────────────────────────────────────────────────────────────────────────────

echo "📥 Fetching configuration from AWS SSM..."

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found!"
    echo "   Install: https://aws.amazon.com/cli/"
    exit 1
fi
    
# Fetch all parameters for this environment
PARAMS=$(aws ssm get-parameters-by-path \
    --path "${SSM_PATH}" \
    --with-decryption \
    --query "Parameters[*].[Name,Value]" \
    --output text 2>/dev/null)

if [ -z "$PARAMS" ]; then
    echo "❌ No parameters found in SSM at ${SSM_PATH}"
    echo ""
    echo "   Did you run: pnpm provision ${ENVIRONMENT}"
    echo ""
    
    # Fallback: check if .env file exists
    if [ -f "$ENV_FILE" ]; then
        echo "⚠️  Using existing ${ENV_FILE} file"
    else
        exit 1
    fi
else
    # Generate .env file from SSM parameters
    echo "📝 Generating ${ENV_FILE} from SSM parameters..."
    
    # First, collect all parameters into temporary files
    TEMP_PARAMS=$(mktemp)
    TEMP_VARS=$(mktemp)
    
    # Parse SSM output and store variables (using process substitution to avoid subshell)
    while IFS=$'\t' read -r name value; do
        # Extract variable name from full path (e.g., /city-guided/staging/SITE_DOMAIN -> SITE_DOMAIN)
        var_name=$(basename "$name")
        
        # Store in temp file for later processing (with SECRET_ prefix)
        echo "${var_name}=${value}" >> "$TEMP_PARAMS"
        
        # Also store without SECRET_ prefix for sourcing (secrets are stored with prefix in SSM)
        if [[ "$var_name" == SECRET_* ]]; then
            # Store secret without prefix for .env file
            echo "${var_name#SECRET_}=${value}" >> "$TEMP_VARS"
        else
            echo "${var_name}=${value}" >> "$TEMP_VARS"
        fi
    done < <(echo "$PARAMS")
    
    # Source variables for use in heredoc
    source "$TEMP_VARS" 2>/dev/null || true
    
    # Generate structured .env file with sections
    cat > "$ENV_FILE" << EOF
# ═══════════════════════════════════════════════════════════════════════════════
# Environment Configuration: ${ENVIRONMENT}
# Generated by deploy.sh from AWS SSM Parameter Store
# Source: ${SSM_PATH}/*
# Generated at: $(date -Iseconds)
# ═══════════════════════════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────────────────────────
# Environment & Project
# ───────────────────────────────────────────────────────────────────────────────

ENVIRONMENT=${ENVIRONMENT}
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-city-guided-${ENVIRONMENT}}
NODE_ENV=${NODE_ENV:-production}

# ───────────────────────────────────────────────────────────────────────────────
# Site Configuration
# ───────────────────────────────────────────────────────────────────────────────

SITE_DOMAIN=${SITE_DOMAIN:-localhost}

# ───────────────────────────────────────────────────────────────────────────────
# Ports Configuration
# ───────────────────────────────────────────────────────────────────────────────

API_PORT=${API_PORT:-4000}
WEB_PORT=${WEB_PORT:-3080}
OSRM_PORT=${OSRM_PORT:-5001}
CADDY_HTTP_PORT=${CADDY_HTTP_PORT:-80}
CADDY_HTTPS_PORT=${CADDY_HTTPS_PORT:-443}

# ───────────────────────────────────────────────────────────────────────────────
# OSRM Configuration
# ───────────────────────────────────────────────────────────────────────────────

OSRM_URL=${OSRM_URL:-http://osrm:5000}
OSRM_REGION_BASE=${OSRM_REGION_BASE:-europe-france-ile-de-france}
OSRM_NETWORK_EXTERNAL=${OSRM_NETWORK_EXTERNAL:-true}

# ───────────────────────────────────────────────────────────────────────────────
# Docker Images (from GHCR)
# ───────────────────────────────────────────────────────────────────────────────

API_IMAGE=${API_IMAGE:-ghcr.io/elzinko/city-guided-api:${IMAGE_TAG}}
WEB_IMAGE=${WEB_IMAGE:-ghcr.io/elzinko/city-guided-web:${IMAGE_TAG}}

# ───────────────────────────────────────────────────────────────────────────────
# Application URLs (derived from SITE_DOMAIN)
# ───────────────────────────────────────────────────────────────────────────────

NEXT_PUBLIC_API_URL=https://${SITE_DOMAIN}/api
NEXT_PUBLIC_OSRM_URL=https://${SITE_DOMAIN}/osrm

# ───────────────────────────────────────────────────────────────────────────────
# Build Metadata
# ───────────────────────────────────────────────────────────────────────────────

APP_VERSION=${IMAGE_TAG}
APP_REPO_URL=https://github.com/elzinko/city-guided

# ───────────────────────────────────────────────────────────────────────────────
# Docker Compose Settings
# ───────────────────────────────────────────────────────────────────────────────

RESTART_POLICY=${RESTART_POLICY:-unless-stopped}
HEALTHCHECK_INTERVAL=${HEALTHCHECK_INTERVAL:-30s}
HEALTHCHECK_TIMEOUT=${HEALTHCHECK_TIMEOUT:-10s}
HEALTHCHECK_RETRIES=${HEALTHCHECK_RETRIES:-3}
HEALTHCHECK_START_PERIOD=${HEALTHCHECK_START_PERIOD:-40s}

# ───────────────────────────────────────────────────────────────────────────────
# Application Configuration
# ───────────────────────────────────────────────────────────────────────────────

LOG_LEVEL=${LOG_LEVEL:-info}
DATABASE_URL=${DATABASE_URL:-}

EOF

    # Add secrets section if any SECRET_ variables exist (write without SECRET_ prefix)
    SECRET_VARS=$(grep "^SECRET_" "$TEMP_PARAMS" | sed 's/^SECRET_//' || true)
    if [ -n "$SECRET_VARS" ]; then
        cat >> "$ENV_FILE" << EOF
# ───────────────────────────────────────────────────────────────────────────────
# Secrets (from SSM Parameter Store)
# ───────────────────────────────────────────────────────────────────────────────

EOF
        echo "$SECRET_VARS" >> "$ENV_FILE"
    fi
    
    # Add any other variables that weren't categorized
    # Exclude already handled variables and secrets
    OTHER_VARS=$(grep -v "^ENVIRONMENT=\|^COMPOSE_PROJECT_NAME=\|^NODE_ENV=\|^SITE_DOMAIN=\|^API_PORT=\|^WEB_PORT=\|^OSRM_PORT=\|^CADDY_HTTP_PORT=\|^CADDY_HTTPS_PORT=\|^OSRM_URL=\|^OSRM_REGION_BASE=\|^OSRM_NETWORK_EXTERNAL=\|^API_IMAGE=\|^WEB_IMAGE=\|^NEXT_PUBLIC_API_URL=\|^NEXT_PUBLIC_OSRM_URL=\|^APP_VERSION=\|^APP_REPO_URL=\|^RESTART_POLICY=\|^HEALTHCHECK_\|^LOG_LEVEL=\|^DATABASE_URL=\|^SECRET_" "$TEMP_VARS" 2>/dev/null || true)
    
    if [ -n "$OTHER_VARS" ]; then
        cat >> "$ENV_FILE" << EOF
# ───────────────────────────────────────────────────────────────────────────────
# Additional Configuration
# ───────────────────────────────────────────────────────────────────────────────

EOF
        echo "$OTHER_VARS" >> "$ENV_FILE"
    fi
    
    # Clean up temp files
    rm -f "$TEMP_PARAMS" "$TEMP_VARS"

    echo "✅ ${ENV_FILE} generated from SSM with structured format"
fi

echo ""
echo "📋 Configuration loaded:"
grep -E "^(SITE_DOMAIN|ENVIRONMENT|API_PORT|WEB_PORT|API_IMAGE|WEB_IMAGE)=" "$ENV_FILE" 2>/dev/null | sed 's/^/   /' || true
echo ""

# ───────────────────────────────────────────────────────────────────────────────
# Pull images from GHCR
# ───────────────────────────────────────────────────────────────────────────────

echo "🐳 Pulling images from GHCR..."
echo "   API: ${API_IMAGE}"
echo "   Web: ${WEB_IMAGE}"
echo ""

# Detect local architecture
LOCAL_ARCH=$(uname -m)
if [ "$LOCAL_ARCH" = "arm64" ]; then
    # On ARM64 (Apple Silicon), force linux/amd64 platform for images built on GitHub Actions
    echo "⚠️  Detected ARM64 architecture, forcing linux/amd64 platform for compatibility"
    PLATFORM_FLAG="--platform linux/amd64"
else
    PLATFORM_FLAG=""
fi

docker pull ${PLATFORM_FLAG} "${API_IMAGE}" || { echo "❌ Failed to pull API image"; exit 1; }
docker pull ${PLATFORM_FLAG} "${WEB_IMAGE}" || { echo "❌ Failed to pull Web image"; exit 1; }

echo "✅ Images pulled successfully"
echo ""

# ───────────────────────────────────────────────────────────────────────────────
# Start the environment
# ───────────────────────────────────────────────────────────────────────────────

echo "🚀 Starting ${ENVIRONMENT} environment..."
echo ""

# Use the generic start script
chmod +x "$SCRIPT_DIR/start.sh"
"$SCRIPT_DIR/start.sh" "$ENVIRONMENT"
