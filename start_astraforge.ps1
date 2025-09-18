# AstraForge Quick Startup Script
Write-Host "🚀 Starting AstraForge..." -ForegroundColor Green

# Navigate to project directory
Set-Location "C:\Users\up2it\Desktop\AstraForge"

# Compile TypeScript
Write-Host "📦 Compiling TypeScript..." -ForegroundColor Yellow
npm run compile

# Test CLI functionality
Write-Host "🧪 Testing CLI..." -ForegroundColor Cyan
node out/testing/apiTesterCLI.js list --providers

Write-Host "`n✅ AstraForge is ready!" -ForegroundColor Green
Write-Host "📋 Next steps:" -ForegroundColor White
Write-Host "   🖥️  For UI: Press F5 in VS Code" -ForegroundColor Gray
Write-Host "   💻 For CLI: Use commands in STARTUP_GUIDE.md" -ForegroundColor Gray

# Optional: Open VS Code
$openCode = Read-Host "`nOpen VS Code now? (y/n)"
if ($openCode -eq 'y' -or $openCode -eq 'Y') {
    code .
    Write-Host "🎯 VS Code opened. Press F5 to start extension!" -ForegroundColor Green
}
