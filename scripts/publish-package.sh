#!/usr/bin/env bash

# Script de publication pour lifefindsaway et iamthelaw
# Usage: ./scripts/publish-package.sh [package] [version-type]
#   package: lifefindsaway | iamthelaw | both
#   version-type: patch | minor | major

set -e

PACKAGE=${1:-}
VERSION_TYPE=${2:-patch}

if [ -z "$PACKAGE" ]; then
  echo "Usage: $0 [package] [version-type]"
  echo "  package: lifefindsaway | iamthelaw | both"
  echo "  version-type: patch | minor | major (default: patch)"
  exit 1
fi

publish_package() {
  local pkg_dir=$1
  local pkg_name=$2
  
  echo ""
  echo "================================================"
  echo "Publishing $pkg_name"
  echo "================================================"
  
  cd "$pkg_dir"
  
  echo "→ Installing dependencies..."
  pnpm install --ignore-workspace
  
  echo "→ Bumping version ($VERSION_TYPE)..."
  npm version "$VERSION_TYPE"
  
  echo "→ Building..."
  pnpm build
  
  echo "→ Publishing to GitHub Packages..."
  npm publish
  
  NEW_VERSION=$(node -p "require('./package.json').version")
  echo "✓ Published $pkg_name@$NEW_VERSION"
  
  cd - > /dev/null
}

# Get the repository root
REPO_ROOT=$(git rev-parse --show-toplevel)

if [ "$PACKAGE" = "both" ]; then
  publish_package "$REPO_ROOT/.lifefindsaway" "@bacasable/lifefindsaway"
  publish_package "$REPO_ROOT/.iamthelaw" "@bacasable/iamthelaw"
elif [ "$PACKAGE" = "lifefindsaway" ]; then
  publish_package "$REPO_ROOT/.lifefindsaway" "@bacasable/lifefindsaway"
elif [ "$PACKAGE" = "iamthelaw" ]; then
  publish_package "$REPO_ROOT/.iamthelaw" "@bacasable/iamthelaw"
else
  echo "Error: Unknown package '$PACKAGE'"
  echo "Valid options: lifefindsaway, iamthelaw, both"
  exit 1
fi

echo ""
echo "================================================"
echo "✓ Publication complete!"
echo "================================================"
echo ""
echo "To use in another project:"
echo "  1. Create .npmrc with: @bacasable:registry=https://npm.pkg.github.com"
echo "  2. Run: pnpm add @bacasable/$PACKAGE"
echo ""
