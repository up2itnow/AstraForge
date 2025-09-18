.\# AstraForge Startup Guide

## 🚀 Complete Startup Process for UI and CLI

### 📋 **Prerequisites**
- ✅ Your `.env` file is correctly configured
- ✅ Node.js and npm are installed
- ✅ VS Code is installed (for UI)
- ✅ OpenRouter API key is valid

---

## 🖥️ **UI Startup Process (VS Code Extension)**

### **Step 1: Prepare the Extension**
```bash
# Navigate to your project directory
cd C:\Users\up2it\Desktop\AstraForge

# Ensure dependencies are installed
npm install

# Compile TypeScript to JavaScript
npm run compile
```

### **Step 2: Start VS Code Extension**
```bash
# Open VS Code in the project directory
code .
```

### **Step 3: Activate Extension (Two Methods)**

#### **Method A: Development Mode (Recommended)**
1. Press `F5` in VS Code to start Extension Development Host
2. In the new VS Code window, open the Command Palette (`Ctrl+Shift+P`)
3. Type `AstraForge` and select commands

#### **Method B: Install and Use**
1. Press `Ctrl+Shift+P` in VS Code
2. Type `Extensions: Install from VSIX`
3. Navigate to your extension package (if built)

### **Step 4: Access the UI**
1. **Open Explorer Panel** (Left sidebar)
2. **Find "AstraForge"** section at the bottom
3. **Click "Project Ignition"** or **"API Tester"** view
4. Your OpenRouter configuration will auto-populate:
   - ✅ Provider: OpenRouter (pre-selected)
   - ✅ Models: Your 3 models with role labels
   - ✅ API key can be loaded from storage

### **Step 5: Test the UI**
```
UI Elements Ready:
├── Provider: OpenRouter ✅
├── API Key: [Load from .env or enter manually]
├── Models: 
│   ├── x-ai/grok-4 (Concept) ✅
│   ├── google/gemini-2.5-pro (Development) ✅
│   └── anthropic/claude-sonnet-4 (Coding) ✅
├── Test Buttons:
│   ├── Test LLM ✅
│   ├── Test Vector ✅
│   ├── Test Workflow ✅
│   └── Test Conference ✅
└── Budget/Rounds Controls ✅
```

---

## 💻 **CLI Startup Process**

### **Step 1: Compile and Prepare**
```bash
# Navigate to project directory
cd C:\Users\up2it\Desktop\AstraForge

# Install dependencies (if not done)
npm install

# Compile TypeScript
npm run compile

# Verify CLI is ready
node out/testing/apiTesterCLI.js --help
```

### **Step 2: Basic CLI Commands**

#### **Test Single LLM (Concept Model)**
```bash
node out/testing/apiTesterCLI.js test \
  --api OpenRouter \
  --key "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" \
  --model "x-ai/grok-4" \
  --prompt "Hello from AstraForge! Tell me about AI coding assistants."
```

#### **Test Development Model**
```bash
node out/testing/apiTesterCLI.js test \
  --api OpenRouter \
  --key "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" \
  --model "google/gemini-2.5-pro" \
  --prompt "How would you structure a React todo app?"
```

#### **Test Coding Model**
```bash
node out/testing/apiTesterCLI.js test \
  --api OpenRouter \
  --key "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" \
  --model "anthropic/claude-sonnet-4" \
  --prompt "Write a TypeScript function to validate email addresses."
```

#### **Test Workflow Simulation**
```bash
node out/testing/apiTesterCLI.js test \
  --api OpenRouter \
  --key "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" \
  --workflow "Create a simple calendar app with React and TypeScript"
```

### **Step 3: Advanced CLI Usage**

#### **Batch Testing with File**
```bash
# Create a test file
echo "What is React?" > test_prompts.txt
echo "How do I use TypeScript?" >> test_prompts.txt
echo "Explain REST APIs" >> test_prompts.txt

# Run batch test
node out/testing/apiTesterCLI.js test \
  --api OpenRouter \
  --key "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" \
  --model "x-ai/grok-4" \
  --file "test_prompts.txt" \
  --output "results.json"
```

#### **List Available Options**
```bash
# List supported providers
node out/testing/apiTesterCLI.js list --providers

# List models for OpenRouter
node out/testing/apiTesterCLI.js list --models OpenRouter
```

---

## 🔧 **Troubleshooting Startup Issues**

### **Common CLI Issues**

#### **Issue: "Cannot find module"**
```bash
# Solution: Recompile TypeScript
npm run compile
```

#### **Issue: "Invalid API key format"**
```bash
# Solution: Verify your .env file
Get-Content .env

# Should show:
# OPENROUTER_API_KEY=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
# OPENROUTER_MODELS_TO_USE=x-ai/grok-4, google/gemini-2.5-pro, anthropic/claude-sonnet-4
```

#### **Issue: "Command not found"**
```bash
# Solution: Use full path
node C:\Users\up2it\Desktop\AstraForge\out\testing\apiTesterCLI.js --help
```

### **Common UI Issues**

#### **Issue: Extension not loading**
1. Check VS Code Developer Tools (`Help > Toggle Developer Tools`)
2. Look for errors in Console
3. Ensure extension is compiled: `npm run compile`

#### **Issue: Models not populating**
1. Check `.env` file format
2. Restart VS Code Extension Host (`F5` again)
3. Check VS Code Output panel for errors

---

## 🎯 **Quick Start Commands**

### **For CLI Testing**
```bash
# Navigate to project
cd C:\Users\up2it\Desktop\AstraForge

# Quick single test
node out/testing/apiTesterCLI.js test --api OpenRouter --key "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" --model "x-ai/grok-4" --prompt "Hello AstraForge!"
```

### **For UI Testing**
```bash
# Open VS Code
code C:\Users\up2it\Desktop\AstraForge

# Press F5 to start extension
# Navigate to Explorer > AstraForge > API Tester
```

---

## 📊 **Expected Startup Output**

### **CLI Success Output**
```json
{
  "type": "llm_test",
  "timestamp": "2024-01-XX...",
  "provider": "OpenRouter",
  "model": "x-ai/grok-4",
  "result": {
    "success": true,
    "response": "Hello! I'm an AI assistant...",
    "latency": 1234,
    "estimatedCost": 0.01,
    "tokens": 50
  }
}
```

### **UI Success Indicators**
- ✅ Green status messages
- ✅ Provider dropdown shows "OpenRouter" selected
- ✅ Models populate with role labels
- ✅ Test buttons are enabled
- ✅ Results display in the panel

---

**🎉 You're ready to start testing your AstraForge API Tester with your OpenRouter 3-LLM configuration!**
