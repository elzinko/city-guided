#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Docker Setup for EC2 Instance
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script fixes Docker permissions and sets up the environment
# for the ec2-user to run Docker commands without sudo.
#
# Usage:
#   ./docker-setup.sh          # Setup Docker for current user
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║         🐳 Docker Setup for EC2 Instance                "
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if running on EC2
if [ ! -f /sys/hypervisor/uuid ] && ! curl -s http://169.254.169.254/latest/meta-data/ >/dev/null 2>&1; then
  echo "⚠️  Not running on EC2 instance"
  echo "   This script is designed for AWS EC2 instances"
  echo ""
  echo "💡 For local development, run:"
  echo "   npm run docker:setup"
  exit 0
fi

echo "🔍 Checking Docker installation..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not installed"
  echo "   Run the provisioning script first: pnpm provision <environment>"
  exit 1
fi

echo "✅ Docker found: $(docker --version)"

# Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker daemon not running"
  echo "   Starting Docker service..."
  sudo systemctl start docker
  sudo systemctl enable docker
  echo "✅ Docker daemon started"
fi

# Add current user to docker group
CURRENT_USER=$(whoami)
echo "👤 Setting up Docker permissions for user: $CURRENT_USER"

if groups "$CURRENT_USER" | grep -q docker; then
  echo "✅ User $CURRENT_USER already in docker group"
else
  echo "🔧 Adding $CURRENT_USER to docker group..."
  sudo usermod -aG docker "$CURRENT_USER"
  echo "✅ User added to docker group"
  echo ""
  echo "⚠️  IMPORTANT: You need to logout and login again, or run:"
  echo "   newgrp docker"
  echo ""
  echo "Then you can use Docker commands without sudo:"
  echo "   docker ps"
  echo "   docker logs <container>"
fi

echo ""
echo "🎉 Docker setup complete!"
echo ""
echo "💡 Test commands:"
echo "   docker ps"
echo "   docker images"
echo "   cd ~/city-guided/infra/docker && docker-compose ps"