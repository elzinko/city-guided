#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Connect to EC2 Instance
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./ssh.sh <environment>              # SSM Session Manager (recommended)
#   ./ssh.sh <environment> --console    # EC2 Instance Connect in browser
#   ./ssh.sh <environment> --ssh        # Traditional SSH (requires key)
#
# Examples:
#   ./ssh.sh staging              # Connect to staging via SSM
#   ./ssh.sh prod --console       # Open prod in browser
#   ./ssh.sh staging --ssh        # SSH to staging (requires key)
#
# SSM Session Manager is recommended because:
#   - No SSH key required
#   - Authenticated via IAM
#   - More secure (no open ports needed)
#
# Prerequisites:
#   - AWS CLI v2 configured
#   - Session Manager plugin: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ───────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ───────────────────────────────────────────────────────────────────────────────

ENVIRONMENT="${1:-staging}"
MODE="${2:-}"

# Validate environment
case "$ENVIRONMENT" in
  staging|prod|production)
    ;;
  --help|-h)
    echo "Usage: ./ssh.sh <environment> [--console|--ssh]"
    echo ""
    echo "Environments: staging, prod"
    echo ""
    echo "Options:"
    echo "  (default)   Connect via SSM Session Manager (no key required)"
    echo "  --console   Open EC2 Instance Connect in browser"
    echo "  --ssh       Connect via traditional SSH (requires key)"
    exit 0
    ;;
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    echo "   Valid: staging, prod"
    echo "   Usage: ./ssh.sh <environment> [--console|--ssh]"
    exit 1
    ;;
esac

# Normalize environment name
[ "$ENVIRONMENT" = "production" ] && ENVIRONMENT="prod"

AWS_REGION="${AWS_REGION:-eu-west-3}"
KEY_PATH="$HOME/.ssh/city-guided-${ENVIRONMENT}.pem"

# ───────────────────────────────────────────────────────────────────────────────
# Get EC2 instance info from SSM
# ───────────────────────────────────────────────────────────────────────────────

echo "╔════════════════════════════════════════════════════════╗"
echo "║         🔌 Connect to ${ENVIRONMENT}                    "
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo "🔍 Getting EC2 instance info from SSM..."

INSTANCE_ID=$(aws ssm get-parameter \
  --name "/city-guided/${ENVIRONMENT}/SECRET_EC2_INSTANCE_ID" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text \
  --region "$AWS_REGION" 2>/dev/null || echo "")

PUBLIC_IP=$(aws ssm get-parameter \
  --name "/city-guided/${ENVIRONMENT}/SECRET_EC2_PUBLIC_IP" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text \
  --region "$AWS_REGION" 2>/dev/null || echo "")

if [ -z "$INSTANCE_ID" ]; then
  echo "❌ Could not get EC2 info from SSM"
  echo "   Ensure '/city-guided/${ENVIRONMENT}/*' parameters exist"
  echo "   Run: pnpm provision ${ENVIRONMENT}"
  exit 1
fi

echo "📍 Environment: $ENVIRONMENT"
echo "📍 Instance:    $INSTANCE_ID"
[ -n "$PUBLIC_IP" ] && echo "📍 IP:          $PUBLIC_IP"
echo ""

# ───────────────────────────────────────────────────────────────────────────────
# Option 1: EC2 Instance Connect (browser)
# ───────────────────────────────────────────────────────────────────────────────

if [ "$MODE" = "--console" ]; then
  URL="https://${AWS_REGION}.console.aws.amazon.com/ec2/home?region=${AWS_REGION}#ConnectToInstance:instanceId=${INSTANCE_ID}"
  echo "🌐 Opening EC2 Instance Connect..."
  echo "   $URL"
  open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null || echo "   Open this URL in your browser"
  exit 0
fi

# ───────────────────────────────────────────────────────────────────────────────
# Option 2: Traditional SSH (requires key)
# ───────────────────────────────────────────────────────────────────────────────

if [ "$MODE" = "--ssh" ]; then
  if [ -z "$PUBLIC_IP" ]; then
    echo "❌ Public IP not found in SSM"
    echo "   Use SSM Session Manager instead: pnpm ssh ${ENVIRONMENT}"
    exit 1
  fi

  if [ ! -f "$KEY_PATH" ]; then
    echo "❌ SSH key not found: $KEY_PATH"
    echo ""
    echo "To create a new key pair:"
    echo "  aws ec2 delete-key-pair --key-name city-guided-${ENVIRONMENT} --region $AWS_REGION 2>/dev/null"
    echo "  aws ec2 create-key-pair --key-name city-guided-${ENVIRONMENT} --region $AWS_REGION \\"
    echo "    --query 'KeyMaterial' --output text > $KEY_PATH"
    echo "  chmod 400 $KEY_PATH"
    echo ""
    echo "Or use SSM (no key required): pnpm ssh ${ENVIRONMENT}"
    exit 1
  fi

  echo "🔐 Connecting via SSH..."
  exec ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ec2-user@"$PUBLIC_IP"
fi

# ───────────────────────────────────────────────────────────────────────────────
# Default: SSM Session Manager (recommended)
# ───────────────────────────────────────────────────────────────────────────────

# Check if session-manager-plugin is installed
if ! command -v session-manager-plugin &> /dev/null; then
  echo "⚠️  Session Manager plugin not installed"
  echo ""
  echo "Install it:"
  echo "  macOS:  brew install --cask session-manager-plugin"
  echo "  Linux:  https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
  echo ""
  echo "Or use alternative methods:"
  echo "  pnpm ssh ${ENVIRONMENT} --console   # Browser-based"
  echo "  pnpm ssh ${ENVIRONMENT} --ssh       # Traditional SSH (requires key)"
  exit 1
fi

echo "🔐 Connecting via SSM Session Manager..."
echo "   No SSH key required - authenticated via IAM"
echo ""
echo "💡 Tips once connected:"
echo "   ~/city-guided/infra/scripts/docker-setup.sh  # Setup Docker permissions"
echo "   cd city-guided/infra/docker"
echo "   docker ps"
echo "   docker logs city-guided-${ENVIRONMENT}-api -f"
echo ""

exec aws ssm start-session \
  --target "$INSTANCE_ID" \
  --region "$AWS_REGION"


