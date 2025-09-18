# 🚀 AstraForge VS Code Extension Setup Guide

## 🎯 **Best Options for Running in Real VS Code**

### **Option 1: Development Mode (Recommended)**
This runs your extension in a real VS Code Extension Development Host:

```bash
# 1. Open your project in VS Code
code .

# 2. Press F5 to launch Extension Development Host
# OR use Command Palette: "Debug: Start Debugging"
```

**✅ Advantages:**
- Real VS Code environment
- Hot reload on changes
- Full debugging capabilities
- Access to all VS Code APIs
- Works with Cursor too!

---

### **Option 2: Package and Install (Production-like)**
Create a VSIX package and install it permanently:

```bash
# 1. Install vsce (VS Code Extension Manager)
npm install -g vsce

# 2. Build the extension package
vsce package

# 3. Install the generated .vsix file
code --install-extension astraforge-ide-0.0.1.vsix
```

**✅ Advantages:**
- Permanent installation
- Works like any other VS Code extension
- Can be shared with others
- Production testing

---

### **Option 3: Use Cursor Directly (Best for You!)**
Since you're using Cursor, here's the optimal approach:

```bash
# 1. Open in Cursor
cursor .

# 2. Use Cursor's built-in extension development
# Press F5 or Ctrl+Shift+P > "Debug: Start Debugging"
```

**✅ Advantages:**
- Native Cursor support
- Same VS Code extension API
- Integrated development experience
- No need to switch editors

---

## 🔧 **Setup Steps for Any Option**

### **Step 1: Ensure Extension is Ready**
```bash
# Compile TypeScript
npm run compile

# Verify package.json is correct
cat package.json | grep -E "(main|activationEvents|contributes)"
```

### **Step 2: Check Dependencies**
```bash
# Install any missing dependencies
npm install

# Verify VS Code engine compatibility
npm ls @types/vscode
```

### **Step 3: Test Extension Structure**
Your extension should have:
- ✅ `package.json` with correct metadata
- ✅ `src/extension.ts` as entry point
- ✅ Compiled `out/extension.js`
- ✅ Proper activation events

---

## 📋 **Current Extension Status Check**

### **Your Extension Configuration:**
```json
{
  "name": "astraforge-ide",
  "displayName": "AstraForge IDE", 
  "main": "./out/extension.js",
  "engines": { "vscode": "^1.80.0" },
  "activationEvents": ["onView:astraforge.projectIgnition"],
  "contributes": {
    "views": {
      "explorer": [
        { "id": "astraforge.projectIgnition", "name": "Project Ignition" },
        { "id": "astraforge.apiTester", "name": "API Tester" }
      ]
    }
  }
}
```

✅ **Status: Ready for VS Code/Cursor!**

---

## 🎯 **Recommended Approach for You**

Since you're using **Cursor**, here's the **optimal workflow**:

### **Method: Cursor Extension Development (Best)**

```bash
# 1. Ensure you're in the project directory
cd C:\Users\up2it\Desktop\AstraForge

# 2. Open in Cursor
cursor .

# 3. Press F5 to start Extension Development Host
# This opens a new Cursor window with your extension loaded

# 4. In the new window, access your extension:
#    - Open Explorer (Ctrl+Shift+E)
#    - Look for "AstraForge" section at bottom
#    - Click "Project Ignition" or "API Tester"
```

### **Alternative: Use VS Code Alongside Cursor**

```bash
# 1. Keep Cursor for development
cursor .

# 2. Open same project in VS Code for extension testing
code .

# 3. Press F5 in VS Code to test extension
# 4. Make changes in Cursor, test in VS Code
```

---

## 🔄 **Removing Mock Dependencies**

Your project currently uses mocks for testing. To run in real VS Code:

### **Option A: Keep Mocks (Recommended)**
- Mocks are only used in **tests**
- Real VS Code provides actual `vscode` module
- No changes needed!

### **Option B: Remove Mocks (Not Recommended)**
```bash
# Only if you want to remove test mocks entirely
rm -rf __mocks__/
rm tests/setup.ts
# Update jest.config.js to remove mock configurations
```

**⚠️ Warning**: Removing mocks will break your tests!

---

## 🚀 **Quick Start Commands**

### **For Cursor Users:**
```bash
# Compile and start extension development
npm run compile && cursor . && echo "Press F5 in Cursor!"
```

### **For VS Code Users:**
```bash
# Compile and start extension development  
npm run compile && code . && echo "Press F5 in VS Code!"
```

### **For Production Installation:**
```bash
# Package and install permanently
npm install -g vsce
vsce package
cursor --install-extension astraforge-ide-0.0.1.vsix
```

---

## 🎯 **Testing Your Extension**

Once running in Cursor/VS Code Extension Host:

### **1. Test UI Elements**
- ✅ Explorer panel shows "AstraForge" section
- ✅ "Project Ignition" view loads
- ✅ "API Tester" view loads
- ✅ OpenRouter models auto-populate
- ✅ API key integration works

### **2. Test CLI Integration**
```bash
# In the Extension Host terminal
node out/testing/apiTesterCLI.js test --api OpenRouter --key "your-key" --prompt "Hello!"
```

### **3. Test Environment Integration**
- ✅ Your `.env` file is loaded
- ✅ 3-LLM panel configuration works
- ✅ Budget tracking functions

---

## 🔧 **Troubleshooting**

### **Issue: Extension doesn't activate**
```bash
# Check compilation
npm run compile

# Check for errors
cat out/extension.js | head -20
```

### **Issue: Views don't appear**
- Restart Extension Host (Ctrl+Shift+F5)
- Check Developer Console (Help > Toggle Developer Tools)
- Verify `activationEvents` in package.json

### **Issue: Environment variables not loading**
- Ensure `.env` file is in project root
- Check `envLoader` compilation in `out/src/utils/`

---

## 📝 **Summary**

**🏆 Best Option for You**: Use **Cursor Extension Development Mode**

1. **Open project in Cursor**: `cursor .`
2. **Press F5** to start Extension Development Host
3. **Access AstraForge** in Explorer panel
4. **Test your 3-LLM OpenRouter setup**

**✅ No need to replace mocks** - they're only for tests!
**✅ Full VS Code API access** in Extension Development Host
**✅ Your environment mapping** will work perfectly!
