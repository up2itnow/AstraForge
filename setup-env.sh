#!/bin/bash
# AstraForge Environment Setup Script (Unix/Linux/Mac)
# This script helps users create their .env file from the example

echo -e "\033[36m🚀 AstraForge Environment Setup\033[0m"
echo -e "\033[36m================================\033[0m"
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo -e "\033[33m⚠️  A .env file already exists!\033[0m"
    read -p "Do you want to overwrite it? (y/n): " response
    if [ "$response" != "y" ]; then
        echo -e "\033[31mSetup cancelled.\033[0m"
        exit 0
    fi
fi

# Check if example.env exists
if [ ! -f "example.env" ]; then
    echo -e "\033[31m❌ example.env not found!\033[0m"
    echo -e "\033[31mPlease ensure you're running this from the AstraForge root directory.\033[0m"
    exit 1
fi

# Copy example.env to .env
cp example.env .env
echo -e "\033[32m✅ Created .env from example.env\033[0m"
echo ""

echo -e "\033[36m📝 Now you need to add your API keys:\033[0m"
echo ""

# OpenRouter setup
echo -e "\033[33m1. OpenRouter API Key (Required for multi-LLM collaboration):\033[0m"
echo -e "\033[90m   - Get your key from: https://openrouter.ai/keys\033[0m"
echo -e "\033[90m   - Make sure you have billing set up at: https://openrouter.ai/account\033[0m"
read -p "   Enter your OpenRouter API key (or press Enter to skip): " openrouter_key

if [ ! -z "$openrouter_key" ]; then
    sed -i.bak "s/OPENROUTER_API_KEY=REPLACE_ME_WITH_YOUR_ACTUAL_KEY/OPENROUTER_API_KEY=$openrouter_key/" .env
    echo -e "   \033[32m✅ OpenRouter API key added\033[0m"
else
    echo -e "   \033[90m⏭️  Skipped OpenRouter\033[0m"
fi

echo ""

# OpenAI setup
echo -e "\033[33m2. OpenAI API Key (Optional):\033[0m"
echo -e "\033[90m   - Get your key from: https://platform.openai.com/api-keys\033[0m"
read -p "   Enter your OpenAI API key (or press Enter to skip): " openai_key

if [ ! -z "$openai_key" ]; then
    sed -i.bak "s/OPENAI_API_KEY=REPLACE_ME_WITH_YOUR_ACTUAL_KEY/OPENAI_API_KEY=$openai_key/" .env
    echo -e "   \033[32m✅ OpenAI API key added\033[0m"
else
    echo -e "   \033[90m⏭️  Skipped OpenAI\033[0m"
fi

echo ""

# Anthropic setup
echo -e "\033[33m3. Anthropic API Key (Optional):\033[0m"
echo -e "\033[90m   - Get your key from: https://console.anthropic.com/settings/keys\033[0m"
read -p "   Enter your Anthropic API key (or press Enter to skip): " anthropic_key

if [ ! -z "$anthropic_key" ]; then
    sed -i.bak "s/ANTHROPIC_API_KEY=sk-ant-your-anthropic-key/ANTHROPIC_API_KEY=$anthropic_key/" .env
    echo -e "   \033[32m✅ Anthropic API key added\033[0m"
else
    echo -e "   \033[90m⏭️  Skipped Anthropic\033[0m"
fi

echo ""

# Hugging Face setup
echo -e "\033[33m4. Hugging Face API Token (Required for embeddings):\033[0m"
echo -e "\033[90m   - Get your token from: https://huggingface.co/settings/tokens\033[0m"
read -p "   Enter your Hugging Face API token (or press Enter to skip): " hf_token

if [ ! -z "$hf_token" ]; then
    sed -i.bak "s/HUGGINGFACE_API_TOKEN=hf_your-huggingface-token/HUGGINGFACE_API_TOKEN=$hf_token/" .env
    echo -e "   \033[32m✅ Hugging Face token added\033[0m"
else
    echo -e "   \033[90m⏭️  Skipped Hugging Face\033[0m"
fi

echo ""

# xAI setup
echo -e "\033[33m5. xAI API Key (Optional - for Grok models):\033[0m"
echo -e "\033[90m   - Get your key from: https://x.ai/api\033[0m"
read -p "   Enter your xAI API key (or press Enter to skip): " xai_key

if [ ! -z "$xai_key" ]; then
    sed -i.bak "s/XAI_API_KEY=xai-your-xai-key/XAI_API_KEY=$xai_key/" .env
    echo -e "   \033[32m✅ xAI API key added\033[0m"
else
    echo -e "   \033[90m⏭️  Skipped xAI\033[0m"
fi

# Remove backup file
rm -f .env.bak

echo ""
echo -e "\033[36m================================\033[0m"
echo ""

# Run validator
echo -e "\033[36m🔍 Running environment validator...\033[0m"
echo ""
node validate-env.cjs

echo ""
echo -e "\033[36m================================\033[0m"
echo ""
echo -e "\033[32m✅ Setup complete!\033[0m"
echo ""
echo -e "\033[36mNext steps:\033[0m"
echo -e "\033[37m1. If the validator found issues, edit .env manually to fix them\033[0m"
echo -e "\033[37m2. Run 'npm test' to verify everything is working\033[0m"
echo -e "\033[37m3. Launch the extension with './launch_extension.ps1'\033[0m"
echo ""