#!/bin/bash
# Script to recreate the reverse proxy stack with the corrected CDK code
# This destroys and recreates the instance, resulting in a new Elastic IP
#
# Usage: ./recreate-proxy.sh [environment]
#
# This is the "proper" way to apply the CDK code fixes, but requires:
# - Updating DuckDNS with the new Elastic IP
# - Waiting for DNS propagation (1-2 minutes)
# - Accepting ~3 minutes of downtime

set -e

ENVIRONMENT=${1:-staging}
REGION="eu-west-3"

echo "🔄 Recreating reverse proxy stack for $ENVIRONMENT..."
echo ""
echo "⚠️  WARNING: This will:"
echo "  - Destroy the existing reverse proxy instance"
echo "  - Create a new instance with a NEW Elastic IP"
echo "  - Require updating DuckDNS with the new IP"
echo "  - Cause ~3 minutes of downtime"
echo ""

read -p "Continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
  echo "❌ Cancelled"
  exit 1
fi

echo "📋 Step 1/3: Destroying existing reverse proxy stack..."

# Use CDK directly to destroy only the reverse proxy stack
npx cdk destroy CityGuidedReverseProxyStack \
  --region "$REGION" \
  --context environment="$ENVIRONMENT" \
  --force

echo ""
echo "✓ Reverse proxy stack destroyed"
echo ""
echo "📋 Step 2/3: Provisioning new reverse proxy stack..."

# Re-provision the full infrastructure (will recreate the reverse proxy)
tsx scripts/provision.ts "$ENVIRONMENT"

echo ""
echo "✓ New reverse proxy stack provisioned"
echo ""
echo "📋 Step 3/3: Getting new Elastic IP..."

# Wait a bit for the stack to be fully created
sleep 5

NEW_IP=$(aws ec2 describe-addresses \
  --region "$REGION" \
  --filters "Name=tag:Name,Values=city-guided-proxy" \
  --query "Addresses[0].PublicIp" \
  --output text)

if [ "$NEW_IP" = "None" ] || [ -z "$NEW_IP" ]; then
  echo "⚠️  Could not retrieve new Elastic IP"
  echo "   Run: pnpm duckdns:ip $ENVIRONMENT"
else
  echo "✓ New Elastic IP: $NEW_IP"
fi

echo ""
echo "🔧 Next steps:"
echo ""
echo "1. Update DuckDNS with the new IP:"
echo "   pnpm duckdns:update $ENVIRONMENT"
echo ""
echo "2. Wait 1-2 minutes for DNS propagation"
echo ""
echo "3. Test the site:"
echo "   curl -I https://cityguided.duckdns.org/"
echo ""
echo "✅ Done! The reverse proxy has been recreated with the corrected code."
