#!/usr/bin/env bash

# Test script pour vérifier que les packages peuvent être construits

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)

echo "================================================"
echo "Testing package builds"
echo "================================================"

test_package() {
  local pkg_dir=$1
  local pkg_name=$2
  
  echo ""
  echo "→ Testing $pkg_name..."
  cd "$pkg_dir"
  
  # Clean
  rm -rf node_modules dist
  
  # Install
  echo "  Installing dependencies..."
  pnpm install --ignore-workspace > /dev/null 2>&1
  
  # Typecheck
  echo "  Type checking..."
  pnpm typecheck
  
  # Build
  echo "  Building..."
  pnpm build
  
  # Verify dist exists
  if [ ! -d "dist" ]; then
    echo "  ✗ Build failed: dist/ directory not created"
    exit 1
  fi
  
  # Verify CLI exists
  if [ ! -f "dist/cli.js" ]; then
    echo "  ✗ Build failed: dist/cli.js not created"
    exit 1
  fi
  
  echo "  ✓ $pkg_name build successful"
  
  cd - > /dev/null
}

test_package "$REPO_ROOT/.lifefindsaway" "@bacasable/lifefindsaway"
test_package "$REPO_ROOT/.iamthelaw" "@bacasable/iamthelaw"

echo ""
echo "================================================"
echo "✓ All packages build successfully!"
echo "================================================"
echo ""
echo "Ready to publish with:"
echo "  ./scripts/publish-package.sh both patch"
echo ""
