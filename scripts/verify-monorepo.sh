#!/bin/bash

# Monorepo Health Check Script
# Verifies that the Turborepo monorepo is correctly configured

set -e

echo "🔍 Co-Founder Monorepo Health Check"
echo "===================================="
echo ""

# Check Node version
echo "✓ Checking Node.js version..."
node_version=$(node -v)
echo "  Node.js: $node_version"

# Check npm version
echo "✓ Checking npm version..."
npm_version=$(npm -v)
echo "  npm: $npm_version"

# Check if node_modules exists
echo "✓ Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "  ❌ node_modules not found. Run 'npm install' first."
  exit 1
fi
echo "  ✓ Root dependencies installed"

# Check workspace resolution
echo "✓ Checking workspace resolution..."
if npm ls @co-founder/types --depth=0 &>/dev/null; then
  echo "  ✓ @co-founder/types package resolved"
else
  echo "  ⚠️  @co-founder/types not found in workspace"
fi

# Check if packages/types is built
echo "✓ Checking packages/types build..."
if [ -d "packages/types/dist" ]; then
  echo "  ✓ packages/types built successfully"
else
  echo "  ⚠️  packages/types not built. Running build..."
  cd packages/types && npm run build && cd ../..
  echo "  ✓ packages/types built"
fi

# Check apps/web
echo "✓ Checking apps/web..."
if [ -d "apps/web/node_modules" ]; then
  echo "  ✓ apps/web dependencies installed"
else
  echo "  ⚠️  apps/web dependencies not installed"
fi

# Check apps/api
echo "✓ Checking apps/api..."
if [ -d "apps/api/node_modules" ]; then
  echo "  ✓ apps/api dependencies installed"
else
  echo "  ⚠️  apps/api dependencies not installed"
fi

# Test Turbo build
echo "✓ Testing Turbo build..."
if npm run build &>/dev/null; then
  echo "  ✓ Turbo build successful"
else
  echo "  ❌ Turbo build failed"
  exit 1
fi

echo ""
echo "✅ Monorepo health check complete!"
echo "   All systems operational."
echo ""
echo "Next steps:"
echo "  - Run 'npm run dev' to start development servers"
echo "  - Run 'npm test' to run tests"
