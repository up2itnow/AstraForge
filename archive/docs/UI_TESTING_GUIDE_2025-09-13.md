# 🚀 AstraForge UI Testing Guide

## 🎯 **Quick UI Test Launch**

### **Step 1: Launch Extension Development Host**

```bash
# If you're in Cursor (recommended):
# 1. Press F5
# 2. Or use Command Palette (Ctrl+Shift+P) → "Debug: Start Debugging"

# If you're in VS Code:
# 1. Press F5  
# 2. Or use Command Palette (Ctrl+Shift+P) → "Debug: Start Debugging"
```

This will open a **new Cursor/VS Code window** with your AstraForge extension loaded.

---

### **Step 2: Access AstraForge UI Components**

In the **new Extension Development Host window**:

#### **🔍 Open Explorer Panel**
```
Ctrl+Shift+E (or click Explorer icon in Activity Bar)
```

#### **📍 Find AstraForge Section**
Scroll down in Explorer panel to find:
- **"Project Ignition"** - For project idea submission
- **"API Tester"** - For testing your OpenRouter 3-LLM setup

---

## 🧪 **UI Test Checklist**

### **✅ Test 1: Project Ignition UI**
1. **Click "Project Ignition"** in Explorer
2. **Expected UI Elements:**
   - Text area for project idea input
   - "Submit Idea" button
   - Workflow phase indicators
   - "Proceed to Next Phase" button

3. **Test Actions:**
   - Enter a project idea: `"Create a simple to-do list app"`
   - Click "Submit Idea"
   - Check for workflow progression feedback

---

### **✅ Test 2: API Tester UI**
1. **Click "API Tester"** in Explorer
2. **Expected UI Elements:**
   - Provider dropdown (OpenAI, Anthropic, xAI, OpenRouter)
   - API Key input field
   - Model dropdown
   - Test prompt/idea textarea
   - Budget limit input ($10 default)
   - Conference rounds input (2 default)
   - Buttons: "Test LLM", "Test Vector", "Test Workflow", "Test Conference"
   - Key management: "Store Key", "Load Key", "Validate Key"

3. **Test Actions:**
   - Select "OpenRouter" as provider
   - Enter your API key (or click "Load Key" if stored)
   - Check if models auto-populate from your .env
   - Enter test prompt: `"Hello, tell me a fun fact!"`
   - Click "Test LLM"

---

### **✅ Test 3: Environment Integration**
1. **Check .env Loading:**
   - Models should auto-populate for OpenRouter
   - Should show "✅ Using OpenRouter configuration from .env"
   - Should display your 3 models with roles (Concept, Development, Coding)

2. **Test 3-LLM Conference:**
   - Enter idea: `"Design a simple calendar app"`
   - Set budget: `$5`
   - Set rounds: `2`
   - Click "Test Conference"
   - Watch for 3-LLM discussion and final vote

---

## 🔧 **Troubleshooting UI Issues**

### **Issue: Extension doesn't appear**
```bash
# Check if extension loaded correctly
# In Extension Host, press Ctrl+Shift+I (Developer Tools)
# Look for any red errors in Console
```

### **Issue: Views don't show in Explorer**
- Try restarting Extension Host: `Ctrl+Shift+F5`
- Check that you're looking in the **Explorer panel** (not Search/Source Control)
- Scroll down - AstraForge views appear at the bottom

### **Issue: API Tester shows errors**
- Ensure your `.env` file exists with `OPENROUTER_API_KEY`
- Check network connectivity to OpenRouter
- Verify API key format: should start with `sk-or-v1-`

### **Issue: Environment not loading**
- Check `.env` file is in project root
- Restart Extension Host after .env changes
- Check Developer Console for environment loading messages

---

## 📋 **Expected UI Screenshots/Descriptions**

### **Project Ignition View:**
```
┌─ Project Ignition ─────────────────┐
│                                    │
│  💡 Enter your project idea:       │
│  ┌────────────────────────────────┐ │
│  │ Create a simple to-do list app │ │
│  │                                │ │
│  └────────────────────────────────┘ │
│                                    │
│  [Submit Idea]                     │
│                                    │
│  Phase: Planning ⏳                │
│  [Proceed to Next Phase]           │
│                                    │
└────────────────────────────────────┘
```

### **API Tester View:**
```
┌─ API Tester ───────────────────────┐
│                                    │
│  Provider: [OpenRouter      ▼]     │
│  API Key:  [••••••••••••••••]      │
│  Model:    [x-ai/grok-4     ▼]     │
│                                    │
│  Prompt/Idea:                      │
│  ┌────────────────────────────────┐ │
│  │ Hello, tell me a fun fact!     │ │
│  └────────────────────────────────┘ │
│                                    │
│  Budget: [$10.00] Rounds: [2]      │
│                                    │
│  [Test LLM] [Test Conference]      │
│  [Store Key] [Load Key]            │
│                                    │
│  Results: ✅ Connected to OpenRouter│
│                                    │
└────────────────────────────────────┘
```

---

## 🎯 **Quick Test Script**

If UI testing fails, you can test the backend directly:

```bash
# Test CLI functionality
node out/testing/apiTesterCLI.js quick --prompt "Hello from AstraForge!"

# Test environment loading
node -e "
const { envLoader } = require('./out/src/utils/envLoader.js');
console.log('API Key:', envLoader.getOpenRouterApiKey() ? 'Found' : 'Missing');
console.log('Models:', envLoader.getOpenRouterModels());
"
```

---

## 🚀 **Ready to Test!**

**Your next steps:**
1. **Press F5** in Cursor to launch Extension Development Host
2. **Open Explorer** (Ctrl+Shift+E) in the new window  
3. **Click "API Tester"** to test your OpenRouter setup
4. **Try the 3-LLM conference** with a simple project idea

**Expected result:** Full UI with OpenRouter models loaded and 3-LLM conferencing working! 🎉

