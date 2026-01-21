#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Show Logs - Generic for any environment (local or remote)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./logs.sh <environment> [service] [lines]
#   ./logs.sh local           # All services (follow)
#   ./logs.sh staging         # All services via SSM
#   ./logs.sh staging api     # Specific service via SSM
#   ./logs.sh staging api 100 # Last 100 lines
#   ./logs.sh local osrm      # OSRM service
#
# Remote environments (staging, prod) use AWS SSM to fetch logs securely.
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ───────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ───────────────────────────────────────────────────────────────────────────────

ENVIRONMENT="${1:-local}"
SERVICE="${2:-}"
LINES="${3:-50}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$(dirname "$DEPLOYMENT_DIR")/config"

# ───────────────────────────────────────────────────────────────────────────────
# Check if remote environment
# ───────────────────────────────────────────────────────────────────────────────

is_remote_env() {
    case "$1" in
        staging|prod|production)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# ───────────────────────────────────────────────────────────────────────────────
# Remote logs via AWS SSM
# ───────────────────────────────────────────────────────────────────────────────

show_remote_logs() {
    local env="$1"
    local service="$2"
    local lines="$3"
    
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║         📋 Remote Logs (${env})                        "
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    
    # Get AWS region from environment or default
    AWS_REGION="${AWS_REGION:-eu-west-3}"
    
    # Get instance ID from SSM
    echo "🔍 Fetching instance ID from SSM..."
    INSTANCE_ID=$(aws ssm get-parameter \
        --name "/city-guided/${env}/SECRET_EC2_INSTANCE_ID" \
        --with-decryption \
        --query "Parameter.Value" \
        --output text \
        --region "$AWS_REGION" 2>/dev/null)
    
    if [ -z "$INSTANCE_ID" ]; then
        echo "❌ Could not get instance ID from SSM"
        echo "   Ensure 'pnpm provision ${env}' has been run"
        exit 1
    fi
    
    echo "📡 Instance: $INSTANCE_ID"
    echo ""
    
    # Build docker logs command
    local container_prefix="city-guided-${env}"
    
    if [ -n "$service" ]; then
        case "$service" in
            api|web|caddy|osrm)
                DOCKER_CMD="docker logs ${container_prefix}-${service} --tail ${lines}"
                echo "📋 Showing last ${lines} lines for ${service}..."
                ;;
            all)
                DOCKER_CMD="docker ps --filter name=${container_prefix} --format '{{.Names}}' | xargs -I {} sh -c 'echo \"=== {} ===\"  && docker logs {} --tail ${lines}'"
                echo "📋 Showing last ${lines} lines for all services..."
                ;;
            *)
                echo "❌ Unknown service: $service"
                echo "   Valid services: api, web, caddy, osrm, all"
                exit 1
                ;;
        esac
    else
        # Default: show all services
        DOCKER_CMD="for c in api web caddy osrm; do echo \"=== ${container_prefix}-\$c ===\"; docker logs ${container_prefix}-\$c --tail ${lines} 2>/dev/null || echo '(not running)'; echo ''; done"
        echo "📋 Showing last ${lines} lines for all services..."
    fi
    
    echo ""
    
    # Execute via SSM
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[\"${DOCKER_CMD}\"]" \
        --timeout-seconds 30 \
        --region "$AWS_REGION" \
        --query 'Command.CommandId' \
        --output text)
    
    # Wait for command to complete
    for i in {1..15}; do
        STATUS=$(aws ssm get-command-invocation \
            --command-id "$COMMAND_ID" \
            --instance-id "$INSTANCE_ID" \
            --region "$AWS_REGION" \
            --query 'Status' \
            --output text 2>/dev/null || echo "Pending")
        
        if [ "$STATUS" = "Success" ]; then
            break
        elif [ "$STATUS" = "Failed" ]; then
            echo "❌ Command failed"
            aws ssm get-command-invocation \
                --command-id "$COMMAND_ID" \
                --instance-id "$INSTANCE_ID" \
                --region "$AWS_REGION" \
                --query 'StandardErrorContent' \
                --output text
            exit 1
        fi
        sleep 1
    done
    
    # Show output
    aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$AWS_REGION" \
        --query 'StandardOutputContent' \
        --output text
    
    echo ""
    echo "───────────────────────────────────────────────────────────────"
    echo "💡 Tips:"
    echo "   More lines:    pnpm docker:logs ${env} ${service:-all} 200"
    echo "   Live logs:     pnpm ssh:staging  →  docker logs -f <container>"
    echo ""
}

# ───────────────────────────────────────────────────────────────────────────────
# Local logs
# ───────────────────────────────────────────────────────────────────────────────

show_local_logs() {
    local env="$1"
    local service="$2"
    
    # Use global variables defined at script start
    ENV_FILE="${CONFIG_DIR}/.env.${env}"
    
    # Check if env file exists
    if [ ! -f "$ENV_FILE" ]; then
        echo "⚠️  ${ENV_FILE} not found, using defaults"
        ENV_FLAG=""
        export COMPOSE_PROJECT_NAME="city-guided-${env}"
    else
        source "$ENV_FILE"
        ENV_FLAG="--env-file $ENV_FILE"
        export COMPOSE_PROJECT_NAME="${PROJECT_NAME:-city-guided}-${env}"
    fi
    
    # In CI, don't follow logs (show snapshot only)
    if [ "$env" = "ci" ]; then
        FOLLOW_FLAG=""
    else
        FOLLOW_FLAG="-f"
    fi
    
    # Compose files based on BUILD_MODE
    if [ "${BUILD_MODE:-}" = "local" ]; then
        COMPOSE_FILES="-f compose/docker-compose.yml -f compose/docker-compose.build.yml"
    else
        COMPOSE_FILES=""
    fi
    
    # Change to deployment directory for docker compose commands
    cd "$DEPLOYMENT_DIR"
    
    # Show logs
    if [ "$service" = "osrm" ]; then
        echo "📋 Showing OSRM logs (${env})..."
        [ -n "$FOLLOW_FLAG" ] && echo "   Press Ctrl+C to exit"
        echo ""
        docker compose -f compose/docker-compose.yml $ENV_FLAG -f compose/docker-compose.osrm.yml logs $FOLLOW_FLAG
    elif [ -n "$service" ]; then
        echo "📋 Showing logs for ${service} (${env})..."
        [ -n "$FOLLOW_FLAG" ] && echo "   Press Ctrl+C to exit"
        echo ""
        docker compose -f compose/docker-compose.yml $ENV_FLAG $COMPOSE_FILES logs $FOLLOW_FLAG "$service"
    else
        echo "📋 Showing logs for all services (${env})..."
        echo "   Usage: pnpm docker:logs ${env} [service|osrm]"
        [ -n "$FOLLOW_FLAG" ] && echo "   Press Ctrl+C to exit"
        echo ""
        
        echo "=== Application logs ==="
        docker compose -f compose/docker-compose.yml $ENV_FLAG $COMPOSE_FILES logs $FOLLOW_FLAG &
        APP_PID=$!
        
        echo ""
        echo "=== OSRM logs ==="
        docker compose -f compose/docker-compose.yml $ENV_FLAG -f compose/docker-compose.osrm.yml logs $FOLLOW_FLAG &
        OSRM_PID=$!
        
        # Wait for both if following
        if [ -n "$FOLLOW_FLAG" ]; then
            wait $APP_PID $OSRM_PID
        else
            wait
        fi
    fi
}

# ───────────────────────────────────────────────────────────────────────────────
# Main
# ───────────────────────────────────────────────────────────────────────────────

if is_remote_env "$ENVIRONMENT"; then
    show_remote_logs "$ENVIRONMENT" "$SERVICE" "$LINES"
else
    show_local_logs "$ENVIRONMENT" "$SERVICE"
fi
