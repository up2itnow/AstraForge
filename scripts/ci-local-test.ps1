# Local CI/CD Pipeline Test Script
# This script mimics what GitHub Actions would run in CI/CD

Write-Host "🚀 Starting AstraForge CI/CD Pipeline Test" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

try {
    # 1. Install dependencies
    Write-Host "📦 Step 1: Installing dependencies..." -ForegroundColor Yellow
    npm ci

    # 2. Type checking
    Write-Host "🔍 Step 2: Running TypeScript type checking..." -ForegroundColor Yellow
    npm run type-check

    # 3. Linting
    Write-Host "🧹 Step 3: Running ESLint..." -ForegroundColor Yellow
    npm run lint

    # 4. Formatting check
    Write-Host "🎨 Step 4: Checking code formatting..." -ForegroundColor Yellow
    npm run format:check

    # 5. Build the project
    Write-Host "🔨 Step 5: Compiling TypeScript..." -ForegroundColor Yellow
    npm run compile

    # 6. Run tests with coverage
    Write-Host "🧪 Step 6: Running tests with coverage..." -ForegroundColor Yellow
    npm run test:coverage

    # 7. Validate environment setup
    Write-Host "🌍 Step 7: Validating environment..." -ForegroundColor Yellow
    node validate-env.cjs

    Write-Host ""
    Write-Host "✅ CI/CD Pipeline completed successfully!" -ForegroundColor Green
    Write-Host "🎉 All tests passed, linting passed, and coverage meets requirements" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "❌ CI/CD Pipeline failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
