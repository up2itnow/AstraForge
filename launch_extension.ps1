# AstraForge Extension Launcher for Cursor/VS Code
Write-Host "🚀 AstraForge Extension Launcher" -ForegroundColor Green
Write-Host "═" * 40

# Compile TypeScript
Write-Host "`n📦 Compiling TypeScript..." -ForegroundColor Yellow
npm run compile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Compilation successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Compilation failed!" -ForegroundColor Red
    exit 1
}

# Check extension structure
Write-Host "`n🔍 Checking extension structure..." -ForegroundColor Yellow
$extensionJS = Test-Path "out/extension.js"
$packageJSON = Test-Path "package.json"
$envFile = Test-Path ".env"

Write-Host "   Extension JS: $(if ($extensionJS) { '✅' } else { '❌' })" -ForegroundColor $(if ($extensionJS) { 'Green' } else { 'Red' })
Write-Host "   Package JSON: $(if ($packageJSON) { '✅' } else { '❌' })" -ForegroundColor $(if ($packageJSON) { 'Green' } else { 'Red' })
Write-Host "   Environment:  $(if ($envFile) { '✅' } else { '❌' })" -ForegroundColor $(if ($envFile) { 'Green' } else { 'Red' })

if (-not ($extensionJS -and $packageJSON)) {
    Write-Host "`n❌ Extension is not ready. Please fix compilation errors." -ForegroundColor Red
    exit 1
}

Write-Host "`n🎯 Choose your launch method:" -ForegroundColor Cyan
Write-Host "1. Launch in Cursor (Recommended)" -ForegroundColor White
Write-Host "2. Launch in VS Code" -ForegroundColor White
Write-Host "3. Show manual instructions" -ForegroundColor White

$choice = Read-Host "`nEnter your choice (1-3)"

switch ($choice) {
    "1" {
        Write-Host "`n🔄 Launching Cursor..." -ForegroundColor Green
        cursor .
        Write-Host "`n✅ Cursor opened!" -ForegroundColor Green
        Write-Host "📋 Next steps:" -ForegroundColor Cyan
        Write-Host "   1. Press F5 to start Extension Development Host" -ForegroundColor White
        Write-Host "   2. In the new window, open Explorer (Ctrl+Shift+E)" -ForegroundColor White
        Write-Host "   3. Look for 'AstraForge' section at the bottom" -ForegroundColor White
        Write-Host "   4. Click 'API Tester' to test your OpenRouter setup" -ForegroundColor White
    }
    "2" {
        Write-Host "`n🔄 Launching VS Code..." -ForegroundColor Green
        code .
        Write-Host "`n✅ VS Code opened!" -ForegroundColor Green
        Write-Host "📋 Next steps:" -ForegroundColor Cyan
        Write-Host "   1. Press F5 to start Extension Development Host" -ForegroundColor White
        Write-Host "   2. In the new window, open Explorer (Ctrl+Shift+E)" -ForegroundColor White
        Write-Host "   3. Look for 'AstraForge' section at the bottom" -ForegroundColor White
        Write-Host "   4. Click 'API Tester' to test your OpenRouter setup" -ForegroundColor White
    }
    "3" {
        Write-Host "`n📋 Manual Instructions:" -ForegroundColor Cyan
        Write-Host "══════════════════════" -ForegroundColor Cyan
        Write-Host "`n🔧 Method 1: Extension Development" -ForegroundColor Yellow
        Write-Host "   cursor .  # or: code ." -ForegroundColor Gray
        Write-Host "   # Press F5 to launch Extension Development Host" -ForegroundColor Gray
        Write-Host "`n🔧 Method 2: Package Installation" -ForegroundColor Yellow
        Write-Host "   npm install -g vsce" -ForegroundColor Gray
        Write-Host "   vsce package" -ForegroundColor Gray
        Write-Host "   cursor --install-extension astraforge-ide-0.0.1.vsix" -ForegroundColor Gray
        Write-Host "`n🔧 Method 3: CLI Testing" -ForegroundColor Yellow
        Write-Host "   node out/testing/apiTesterCLI.js test --api OpenRouter --key `"your-key`" --prompt `"Hello!`"" -ForegroundColor Gray
    }
    default {
        Write-Host "`n❌ Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n🎉 Ready to test your AstraForge 3-LLM OpenRouter setup!" -ForegroundColor Green
