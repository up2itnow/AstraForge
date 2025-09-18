#!/usr/bin/env node

/**
 * Environment Configuration Validator for AstraForge
 * Helps prevent common configuration issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 AstraForge Environment Validator\n');

// Check if .env exists
if (!fs.existsSync('.env')) {
    console.error('❌ No .env file found!');
    console.log('\nTo create one:');
    console.log('  1. Copy the example: cp example.env .env');
    console.log('  2. Add your actual API keys');
    console.log('  3. Run this validator again\n');
    process.exit(1);
}

// Load and parse .env
const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');
const env = {};

lines.forEach(line => {
    // Skip comments and empty lines
    if (!line || line.trim().startsWith('#')) return;
    
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

console.log('📋 Checking configuration...\n');

let errors = 0;
let warnings = 0;

// Check for placeholder values
const placeholderPatterns = [
    'REPLACE_ME',
    'your-key-here',
    'your-enterprise-key',
    'your-actual',
    'YOUR_ACTUAL',
    'sk-or-v1-your',
    'sk-proj-your',
    'sk-ant-your',
    'xai-your',
    'hf_your'
];

Object.entries(env).forEach(([key, value]) => {
    // Check for placeholder values
    const hasPlaceholder = placeholderPatterns.some(pattern => 
        value.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (hasPlaceholder) {
        console.error(`❌ ${key} contains a placeholder value!`);
        console.log(`   Current: "${value}"`);
        console.log(`   Fix: Replace with your actual API key\n`);
        errors++;
    }
});

// Check for duplicate keys
const keyOccurrences = {};
lines.forEach(line => {
    if (!line || line.trim().startsWith('#')) return;
    const [key] = line.split('=');
    if (key) {
        const trimmedKey = key.trim();
        keyOccurrences[trimmedKey] = (keyOccurrences[trimmedKey] || 0) + 1;
    }
});

Object.entries(keyOccurrences).forEach(([key, count]) => {
    if (count > 1) {
        console.warn(`⚠️  ${key} appears ${count} times in .env`);
        console.log(`   Only the last occurrence will be used\n`);
        warnings++;
    }
});

// Validate API key formats
if (env.OPENROUTER_API_KEY && !env.OPENROUTER_API_KEY.includes('REPLACE_ME')) {
    if (!env.OPENROUTER_API_KEY.startsWith('sk-or-v1-')) {
        console.warn('⚠️  OPENROUTER_API_KEY should start with "sk-or-v1-"');
        warnings++;
    } else if (env.OPENROUTER_API_KEY.length < 50) {
        console.warn('⚠️  OPENROUTER_API_KEY seems too short (should be 50-80 characters)');
        warnings++;
    } else {
        console.log('✅ OPENROUTER_API_KEY format looks correct');
    }
}

if (env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes('REPLACE_ME')) {
    if (!env.OPENAI_API_KEY.startsWith('sk-')) {
        console.warn('⚠️  OPENAI_API_KEY should start with "sk-"');
        warnings++;
    } else {
        console.log('✅ OPENAI_API_KEY format looks correct');
    }
}

if (env.ANTHROPIC_API_KEY && !env.ANTHROPIC_API_KEY.includes('REPLACE_ME')) {
    if (!env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
        console.warn('⚠️  ANTHROPIC_API_KEY should start with "sk-ant-"');
        warnings++;
    } else {
        console.log('✅ ANTHROPIC_API_KEY format looks correct');
    }
}

// Check for at least one valid API key
const hasValidApiKey = 
    (env.OPENROUTER_API_KEY && !env.OPENROUTER_API_KEY.includes('REPLACE_ME')) ||
    (env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes('REPLACE_ME')) ||
    (env.ANTHROPIC_API_KEY && !env.ANTHROPIC_API_KEY.includes('REPLACE_ME')) ||
    (env.XAI_API_KEY && !env.XAI_API_KEY.includes('REPLACE_ME'));

if (!hasValidApiKey) {
    console.error('\n❌ No valid API keys found!');
    console.log('   You need at least one API key to use AstraForge.');
    console.log('   Recommended: Get an OpenRouter key from https://openrouter.ai/keys\n');
    errors++;
} else {
    console.log('\n✅ At least one valid API key configured');
}

// Check models configuration
if (env.OPENROUTER_API_KEY && env.OPENROUTER_MODELS_TO_USE) {
    const models = env.OPENROUTER_MODELS_TO_USE.split(',').map(m => m.trim());
    if (models.length < 2) {
        console.warn('⚠️  Less than 2 models configured for multi-LLM collaboration');
        warnings++;
    } else {
        console.log(`✅ ${models.length} models configured for collaboration`);
    }
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors === 0 && warnings === 0) {
    console.log('✅ Configuration looks good! No issues found.');
    console.log('\nYou can now run:');
    console.log('  npm test  - to run tests with real APIs');
    console.log('  npm run compile && F5  - to launch the extension');
} else {
    if (errors > 0) {
        console.error(`❌ Found ${errors} error(s) that must be fixed`);
    }
    if (warnings > 0) {
        console.warn(`⚠️  Found ${warnings} warning(s) to review`);
    }
    console.log('\nPlease fix the issues above and run this validator again.');
    process.exit(errors > 0 ? 1 : 0);
}

console.log('='.repeat(50));
