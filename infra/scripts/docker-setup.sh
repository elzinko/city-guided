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
  if sudo systemctl start docker 2>/dev/null; then
    sudo systemctl enable docker 2>/dev/null || true
    echo "✅ Docker daemon started"
  else
    echo "❌ Failed to start Docker daemon"
    echo "   You may need to start it manually: sudo systemctl start docker"
    echo "   Or check Docker installation: sudo yum install docker"
    exit 1
  fi
fi

# Add current user to docker group
CURRENT_USER=$(whoami)
echo "👤 Setting up Docker permissions for user: $CURRENT_USER"

if groups "$CURRENT_USER" | grep -q docker; then
  echo "✅ User $CURRENT_USER already in docker group"
  echo "   You can use Docker commands directly: docker ps, docker logs, etc."
else
  echo "🔧 Adding $CURRENT_USER to docker group..."
  if sudo usermod -aG docker "$CURRENT_USER"; then
    echo "✅ User added to docker group"
    echo ""
    echo "⚠️  IMPORTANT: Docker permissions applied!"
    echo "   In new sessions, you can use Docker without sudo."
    echo "   For this session, Docker commands should work now."
    echo ""
    # Try to refresh group membership
    if command -v newgrp &> /dev/null; then
      echo "🔄 Refreshing group membership..."
      # Note: newgrp would start a new shell, so we'll skip it for automation
    fi
  else
    echo "❌ Failed to add user to docker group"
    echo "   You may need to run Docker commands with sudo:"
    echo "   sudo docker ps"
    exit 1
  fi
fi

echo ""
echo "🎉 Docker setup complete!"
echo ""
echo "💡 Test commands:"
echo "   docker ps"
echo "   docker images"
if [ -d "~/city-guided/infra/docker" ]; then
  echo "   cd ~/city-guided/infra/docker && docker-compose ps"
fi