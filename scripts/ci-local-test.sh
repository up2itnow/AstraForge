#!/bin/bash
# Local CI/CD Pipeline Test Script
# This script mimics what GitHub Actions would run in CI/CD

set -e  # Exit on any error

echo "🚀 Starting AstraForge CI/CD Pipeline Test"
echo "=========================================="

# 1. Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm ci

# 2. Type checking
echo "🔍 Step 2: Running TypeScript type checking..."
npm run type-check

# 3. Linting
echo "🧹 Step 3: Running ESLint..."
npm run lint

# 4. Formatting check
echo "🎨 Step 4: Checking code formatting..."
npm run format:check

# 5. Build the project
echo "🔨 Step 5: Compiling TypeScript..."
npm run compile

# 6. Run tests with coverage
echo "🧪 Step 6: Running tests with coverage..."
npm run test:coverage

# 7. Validate environment setup
echo "🌍 Step 7: Validating environment..."
node validate-env.cjs

echo ""
echo "✅ CI/CD Pipeline completed successfully!"
echo "🎉 All tests passed, linting passed, and coverage meets requirements"
