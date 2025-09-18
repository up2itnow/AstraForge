# AstraForge Environment Setup Script (Windows PowerShell)
# This script helps users create their .env file from the example

Write-Host "🚀 AstraForge Environment Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env already exists
if (Test-Path ".env") {
    Write-Host "⚠️  A .env file already exists!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to overwrite it? (y/n)"
    if ($response -ne 'y') {
        Write-Host "Setup cancelled." -ForegroundColor Red
        exit
    }
}

# Check if example.env exists
if (-not (Test-Path "example.env")) {
    Write-Host "❌ example.env not found!" -ForegroundColor Red
    Write-Host "Please ensure you're running this from the AstraForge root directory." -ForegroundColor Red
    exit 1
}

# Copy example.env to .env
Copy-Item "example.env" ".env"
Write-Host "✅ Created .env from example.env" -ForegroundColor Green
Write-Host ""

Write-Host "📝 Now you need to add your API keys:" -ForegroundColor Cyan
Write-Host ""

# OpenRouter setup
Write-Host "1. OpenRouter API Key (Required for multi-LLM collaboration):" -ForegroundColor Yellow
Write-Host "   - Get your key from: https://openrouter.ai/keys" -ForegroundColor Gray
Write-Host "   - Make sure you have billing set up at: https://openrouter.ai/account" -ForegroundColor Gray
$openrouter_key = Read-Host "   Enter your OpenRouter API key (or press Enter to skip)"

if ($openrouter_key -and $openrouter_key -ne "") {
    (Get-Content .env) -replace 'OPENROUTER_API_KEY=REPLACE_ME_WITH_YOUR_ACTUAL_KEY', "OPENROUTER_API_KEY=$openrouter_key" | Set-Content .env
    Write-Host "   ✅ OpenRouter API key added" -ForegroundColor Green
} else {
    Write-Host "   ⏭️  Skipped OpenRouter" -ForegroundColor Gray
}

Write-Host ""

# OpenAI setup
Write-Host "2. OpenAI API Key (Optional):" -ForegroundColor Yellow
Write-Host "   - Get your key from: https://platform.openai.com/api-keys" -ForegroundColor Gray
$openai_key = Read-Host "   Enter your OpenAI API key (or press Enter to skip)"

if ($openai_key -and $openai_key -ne "") {
    (Get-Content .env) -replace 'OPENAI_API_KEY=REPLACE_ME_WITH_YOUR_ACTUAL_KEY', "OPENAI_API_KEY=$openai_key" | Set-Content .env
    Write-Host "   ✅ OpenAI API key added" -ForegroundColor Green
} else {
    Write-Host "   ⏭️  Skipped OpenAI" -ForegroundColor Gray
}

Write-Host ""

# Anthropic setup
Write-Host "3. Anthropic API Key (Optional):" -ForegroundColor Yellow
Write-Host "   - Get your key from: https://console.anthropic.com/settings/keys" -ForegroundColor Gray
$anthropic_key = Read-Host "   Enter your Anthropic API key (or press Enter to skip)"

if ($anthropic_key -and $anthropic_key -ne "") {
    (Get-Content .env) -replace 'ANTHROPIC_API_KEY=sk-ant-your-anthropic-key', "ANTHROPIC_API_KEY=$anthropic_key" | Set-Content .env
    Write-Host "   ✅ Anthropic API key added" -ForegroundColor Green
} else {
    Write-Host "   ⏭️  Skipped Anthropic" -ForegroundColor Gray
}

Write-Host ""

# Hugging Face setup
Write-Host "4. Hugging Face API Token (Required for embeddings):" -ForegroundColor Yellow
Write-Host "   - Get your token from: https://huggingface.co/settings/tokens" -ForegroundColor Gray
$hf_token = Read-Host "   Enter your Hugging Face API token (or press Enter to skip)"

if ($hf_token -and $hf_token -ne "") {
    (Get-Content .env) -replace 'HUGGINGFACE_API_TOKEN=hf_your-huggingface-token', "HUGGINGFACE_API_TOKEN=$hf_token" | Set-Content .env
    Write-Host "   ✅ Hugging Face token added" -ForegroundColor Green
} else {
    Write-Host "   ⏭️  Skipped Hugging Face" -ForegroundColor Gray
}

Write-Host ""

# xAI setup
Write-Host "5. xAI API Key (Optional - for Grok models):" -ForegroundColor Yellow
Write-Host "   - Get your key from: https://x.ai/api" -ForegroundColor Gray
$xai_key = Read-Host "   Enter your xAI API key (or press Enter to skip)"

if ($xai_key -and $xai_key -ne "") {
    (Get-Content .env) -replace 'XAI_API_KEY=xai-your-xai-key', "XAI_API_KEY=$xai_key" | Set-Content .env
    Write-Host "   ✅ xAI API key added" -ForegroundColor Green
} else {
    Write-Host "   ⏭️  Skipped xAI" -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Run validator
Write-Host "🔍 Running environment validator..." -ForegroundColor Cyan
Write-Host ""
node validate-env.cjs

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. If the validator found issues, edit .env manually to fix them" -ForegroundColor White
Write-Host "2. Run 'npm test' to verify everything is working" -ForegroundColor White
Write-Host "3. Launch the extension with './launch_extension.ps1'" -ForegroundColor White
Write-Host ""