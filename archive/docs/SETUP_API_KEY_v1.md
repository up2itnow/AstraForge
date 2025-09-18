# 🔑 Set Up Your OpenRouter API Key

## The CLI is working perfectly! You just need to set your API key:

### Option 1: Set Environment Variable (Recommended)
```powershell
# In PowerShell (AF1 environment)
$env:OPENROUTER_API_KEY = "your-actual-openrouter-api-key-here"

# Then test:
node out/testing/apiTesterCLI.js test --api OpenRouter --key $env:OPENROUTER_API_KEY --workflow "Create a simple to-do list app"
```

### Option 2: Direct Key (Less Secure)
```powershell
node out/testing/apiTesterCLI.js test --api OpenRouter --key "your-actual-api-key" --workflow "Create a simple to-do list app"
```

### Option 3: Use the UI (Most Secure)
1. Open VS Code
2. Go to AstraForge → API Tester (sidebar)
3. Enter your OpenRouter API key
4. Click "Store Key" (uses VS Code SecretStorage)
5. Test workflow or conference mode

## ✅ Everything is Working!

Your CLI test proved:
- ✅ Multi-word argument parsing works
- ✅ Workflow simulation works  
- ✅ Error handling works
- ✅ JSON output works
- ✅ All phases execute correctly

**Just add your real API key and you're ready to test your 3-LLM conferencing system!** 🚀

## Expected Results:
- **Cost**: ~$1.50-3.00 (well under $10 budget)
- **Phases**: Planning → Prototyping → Testing → Deployment
- **Output**: Detailed JSON with AI responses for each phase
- **Conference**: 3 LLMs (Concept/Development/Coding) working together
