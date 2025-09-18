# 🔧 AstraForge ENETUNREACH Fix Guide

## 🔍 **Diagnosis Results**
✅ **Basic Internet**: Working  
✅ **DNS Resolution**: Working  
✅ **OpenRouter API**: Reachable  
✅ **Node.js HTTPS**: Working  

**Current Issue**: API key validation, not network connectivity

---

## 🚨 **ENETUNREACH Quick Fixes**

### **1. Immediate Network Reset**
```powershell
# Run as Administrator
netsh winsock reset
netsh int ip reset
ipconfig /flushdns
ipconfig /renew
```

### **2. Test Network Connectivity**
```powershell
# Run our diagnostic script
.\network_diagnostics.ps1

# Test Node.js connectivity
node troubleshoot_enetunreach.js
```

### **3. Common ENETUNREACH Causes & Solutions**

#### **🔥 Firewall Issues**
```powershell
# Temporarily disable Windows Firewall (testing only)
netsh advfirewall set allprofiles state off

# Test your CLI command
# Then re-enable firewall:
netsh advfirewall set allprofiles state on
```

#### **🌐 VPN/Proxy Issues**
```powershell
# Check proxy settings
netsh winhttp show proxy

# Reset proxy
netsh winhttp reset proxy

# If using VPN, try disconnecting temporarily
```

#### **📡 Network Adapter Issues**
```powershell
# Reset network adapter
Get-NetAdapter | Restart-NetAdapter

# Or disable/enable in Device Manager
```

---

## 🛠️ **AstraForge Specific Fixes**

### **Fix 1: API Key Validation Issue**
Your current error is "Invalid API key format". Let's fix this:

```javascript
// The CLI expects a different validation format
// Update src/testing/apiTesterCLI.ts validation
```

### **Fix 2: Offline Testing Mode**
```bash
# Create offline test
node out/testing/apiTesterCLI.js test \
  --api OpenRouter \
  --key "test-key" \
  --model "test-model" \
  --prompt "Hello" \
  --offline
```

### **Fix 3: Environment Variable Method**
```powershell
# Set environment variable
$env:OPENROUTER_API_KEY = "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"

# Test with environment
node out/testing/apiTesterCLI.js test --api OpenRouter --prompt "Hello"
```

---

## 🔄 **Network Troubleshooting Steps**

### **Step 1: Basic Connectivity**
```powershell
ping 8.8.8.8
ping openrouter.ai
nslookup openrouter.ai
```

### **Step 2: Port Testing**
```powershell
Test-NetConnection openrouter.ai -Port 443
telnet openrouter.ai 443
```

### **Step 3: Node.js Specific**
```bash
# Test with curl (should work)
curl -H "Authorization: Bearer your-key" https://openrouter.ai/api/v1/models

# Test with Node.js (might fail with ENETUNREACH)
node troubleshoot_enetunreach.js
```

---

## 🎯 **Most Likely Solutions**

### **For ENETUNREACH specifically:**

1. **Corporate Network**: If you're on a corporate network:
   ```powershell
   # Check corporate proxy
   netsh winhttp show proxy
   # Contact IT for Node.js/HTTPS access
   ```

2. **Windows Defender/Antivirus**:
   ```powershell
   # Add Node.js to exclusions
   # Temporarily disable real-time protection
   ```

3. **IPv6 Issues**:
   ```powershell
   # Disable IPv6 temporarily
   netsh interface ipv6 set global randomizeidentifiers=disabled
   ```

4. **Network Adapter Driver**:
   ```powershell
   # Update network drivers
   # Device Manager > Network adapters > Update driver
   ```

---

## 🚀 **Alternative Testing Methods**

### **Method 1: Use PowerShell Instead**
```powershell
# Direct API test with PowerShell
$headers = @{ "Authorization" = "Bearer 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" }
Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/models" -Headers $headers
```

### **Method 2: Mobile Hotspot Test**
```bash
# Connect to mobile hotspot
# Test if ENETUNREACH persists
node out/testing/apiTesterCLI.js test --api OpenRouter --key "your-key" --prompt "Hello"
```

### **Method 3: Different Network**
```bash
# Try from different location/network
# This isolates if it's network-specific
```

---

## 📋 **Checklist to Resolve ENETUNREACH**

- [ ] Run network reset commands
- [ ] Flush DNS cache
- [ ] Disable VPN temporarily
- [ ] Check Windows Firewall
- [ ] Test with mobile hotspot
- [ ] Update network drivers
- [ ] Check antivirus settings
- [ ] Test with PowerShell API call
- [ ] Try different Node.js version
- [ ] Contact ISP if persistent

---

## 🔧 **Quick Fix Commands**

```powershell
# Emergency network reset (run as admin)
netsh winsock reset && netsh int ip reset && ipconfig /flushdns && shutdown /r /t 0

# Test after restart
node troubleshoot_enetunreach.js
```

**Most ENETUNREACH issues resolve with network reset + restart!** 🔄
