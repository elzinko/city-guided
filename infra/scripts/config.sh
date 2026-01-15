#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Configuration Management Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./config.sh get <environment>         # Show deployed SSM parameters
#   ./config.sh push <environment>        # Update SSM from .env file
#   ./config.sh diff <environment>        # Compare local .env vs SSM
#
# Examples:
#   ./config.sh get staging                # Show all staging parameters
#   ./config.sh push staging               # Deploy config to staging
#   ./config.sh diff staging               # Compare local vs deployed
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ───────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ───────────────────────────────────────────────────────────────────────────────

COMMAND="${1:-get}"
ENVIRONMENT="${2:-staging}"

# Validate command
case "$COMMAND" in
  get|push|diff)
    ;;
  --help|-h)
    echo "Usage: ./config.sh <command> <environment>"
    echo ""
    echo "Commands:"
    echo "  get    Show deployed SSM parameters"
    echo "  push   Update SSM from .env file (fast update)"
    echo "  diff   Compare local .env vs SSM parameters"
    echo ""
    echo "Environments: staging, prod"
    echo ""
    echo "Examples:"
    echo "  ./config.sh get staging"
    echo "  ./config.sh push staging"
    echo "  ./config.sh diff staging"
    exit 0
    ;;
  *)
    echo "❌ Unknown command: $COMMAND"
    echo "   Valid: get, push, diff"
    echo "   Usage: ./config.sh <command> <environment>"
    exit 1
    ;;
esac

# Validate environment
case "$ENVIRONMENT" in
  staging|prod|production)
    ;;
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    echo "   Valid: staging, prod"
    exit 1
    ;;
esac

# Normalize environment name
[ "$ENVIRONMENT" = "production" ] && ENVIRONMENT="prod"

AWS_REGION="${AWS_REGION:-eu-west-3}"
SSM_PATH="/city-guided/${ENVIRONMENT}"
ENV_FILE="infra/docker/.env.${ENVIRONMENT}"

# ───────────────────────────────────────────────────────────────────────────────
# Utility functions
# ───────────────────────────────────────────────────────────────────────────────

# Get all SSM parameters for environment
get_ssm_params() {
  aws ssm get-parameters-by-path \
    --path "$SSM_PATH" \
    --region "$AWS_REGION" \
    --recursive \
    --query 'Parameters[*].[Name,Type,Value]' \
    --output text 2>/dev/null || echo ""
}

# Parse .env file
parse_env_file() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "❌ File not found: $file"
    return 1
  fi

  # Simple .env parser (removes comments and empty lines)
  grep -v '^#' "$file" | grep -v '^$' | while IFS='=' read -r key value; do
    # Remove quotes if present
    value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")
    echo "${key}=${value}"
  done
}

# ───────────────────────────────────────────────────────────────────────────────
# Command: GET (show deployed parameters)
# ───────────────────────────────────────────────────────────────────────────────

if [ "$COMMAND" = "get" ]; then
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║         📄 Deployed Config: ${ENVIRONMENT}              "
  echo "╚════════════════════════════════════════════════════════╝"
  echo ""
  echo "🔍 SSM Path: ${SSM_PATH}/*"
  echo ""

  SSM_DATA=$(get_ssm_params)

  if [ -z "$SSM_DATA" ]; then
    echo "❌ No parameters found in SSM"
    echo "   Run: pnpm provision ${ENVIRONMENT}"
    echo "   Or:  pnpm update-config ${ENVIRONMENT}"
    exit 1
  fi

  # Count parameters
  PARAM_COUNT=$(echo "$SSM_DATA" | wc -l)
  SECRET_COUNT=$(echo "$SSM_DATA" | grep "SecureString" | wc -l)
  VAR_COUNT=$((PARAM_COUNT - SECRET_COUNT))

  echo "📊 Summary:"
  echo "   Total: $PARAM_COUNT parameters"
  echo "   Variables: $VAR_COUNT"
  echo "   Secrets: $SECRET_COUNT (encrypted)"
  echo ""

  echo "📋 Parameters:"
  echo "$SSM_DATA" | while read -r name type value; do
    # Extract parameter name (remove SSM path prefix)
    param_name=$(basename "$name")

    if [ "$type" = "SecureString" ]; then
      echo "   🔒 $param_name = ***ENCRYPTED***"
    else
      # Truncate long values
      if [ ${#value} -gt 50 ]; then
        echo "   📄 $param_name = ${value:0:47}..."
      else
        echo "   📄 $param_name = $value"
      fi
    fi
  done

  echo ""
  echo "✅ Config retrieved successfully"
fi

# ───────────────────────────────────────────────────────────────────────────────
# Command: PUSH (update SSM parameters)
# ───────────────────────────────────────────────────────────────────────────────

if [ "$COMMAND" = "push" ]; then
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║         🚀 Push Config: ${ENVIRONMENT}                  "
  echo "╚════════════════════════════════════════════════════════╝"
  echo ""
  echo "📤 Source: $ENV_FILE"
  echo "📥 Target: ${SSM_PATH}/*"
  echo ""

  # Check if .env file exists
  if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file not found: $ENV_FILE"
    echo "   Create it first or run: pnpm provision ${ENVIRONMENT}"
    exit 1
  fi

  # Use the update-config script
  echo "⚡ Updating configuration..."
  cd "$(dirname "$0")/.." && pnpm update-config "$ENVIRONMENT"

  echo ""
  echo "✅ Configuration pushed successfully!"
  echo "   Use 'pnpm config get ${ENVIRONMENT}' to verify"
fi

# ───────────────────────────────────────────────────────────────────────────────
# Command: DIFF (compare local vs deployed)
# ───────────────────────────────────────────────────────────────────────────────

if [ "$COMMAND" = "diff" ]; then
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║         🔍 Config Diff: ${ENVIRONMENT}                  "
  echo "╚════════════════════════════════════════════════════════╝"
  echo ""
  echo "📊 Comparing:"
  echo "   Local:  $ENV_FILE"
  echo "   Remote: ${SSM_PATH}/*"
  echo ""

  # Check if .env file exists
  if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file not found: $ENV_FILE"
    exit 1
  fi

  # Get SSM parameters
  SSM_DATA=$(get_ssm_params)
  if [ -z "$SSM_DATA" ]; then
    echo "❌ No parameters found in SSM"
    echo "   Run: pnpm provision ${ENVIRONMENT}"
    exit 1
  fi

  # Create temp files for comparison
  LOCAL_TMP=$(mktemp)
  REMOTE_TMP=$(mktemp)

  # Parse local .env file
  parse_env_file "$ENV_FILE" | sort > "$LOCAL_TMP"

  # Parse SSM data
  echo "$SSM_DATA" | while read -r name type value; do
    param_name=$(basename "$name")
    echo "${param_name}=${value}"
  done | sort > "$REMOTE_TMP"

  # Compare files
  if diff -u "$REMOTE_TMP" "$LOCAL_TMP" >/dev/null 2>&1; then
    echo "✅ Configurations are identical"
  else
    echo "⚠️  Differences found:"
    echo ""
    diff -u "$REMOTE_TMP" "$LOCAL_TMP" || true
  fi

  # Cleanup
  rm -f "$LOCAL_TMP" "$REMOTE_TMP"
fi