# 🔐 Secure API Key Setup (No Codebase Exposure)

## Multiple Secure Options:

### Option 1: Set Environment Variable for This Session
```powershell
# Set for current PowerShell session only (most secure)
$env:OPENROUTER_API_KEY = "sk-or-your-actual-key-here"

# Test it works:
echo "Key set: $($env:OPENROUTER_API_KEY.Substring(0,8))..."

# Then run your test:
node out/testing/apiTesterCLI.js test --api OpenRouter --key $env:OPENROUTER_API_KEY --workflow "Create a simple to-do list app"
```

### Option 2: Create Temporary Script (Auto-deletes)
```powershell
# Create temp script that sets key and runs test
@"
`$env:OPENROUTER_API_KEY = "sk-or-your-actual-key-here"
node out/testing/apiTesterCLI.js test --api OpenRouter --key `$env:OPENROUTER_API_KEY --workflow "Create a simple to-do list app"
"@ | Out-File -FilePath "temp_test.ps1"

# Run it
.\temp_test.ps1

# Delete it
Remove-Item "temp_test.ps1"
```

### Option 3: Use VS Code UI (Most Secure)
```
1. Open VS Code
2. Go to AstraForge → API Tester (sidebar panel)
3. Enter your OpenRouter API key
4. Click "Store Key" (uses VS Code's encrypted SecretStorage)
5. Test conference mode with budget monitoring
```

### Option 4: PowerShell Profile (Persistent)
```powershell
# Add to your PowerShell profile (if you want it permanent)
notepad $PROFILE

# Add this line to the file:
# $env:OPENROUTER_API_KEY = "sk-or-your-actual-key-here"
```

## 🎯 Recommended: Option 1 (Session Only)

This is the most secure for testing:
1. Sets key only for current session
2. No file system traces
3. No codebase exposure
4. Auto-cleared when you close PowerShell

## ✅ Ready to Test Your 3-LLM System!

Once you set the key with any method above, your command will work:
- 🤖 3 LLMs will collaborate (Concept/Development/Coding)
- 💰 Budget tracking (~$1.50-3.00, under $10 limit)
- 📊 Real-time cost monitoring
- 🎯 Professional JSON output with AI responses

**Your AI-powered IDE is ready to create that to-do list app!** 🚀
