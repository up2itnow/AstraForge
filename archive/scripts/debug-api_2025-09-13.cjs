// Simple debug script to test OpenRouter API directly
require('dotenv').config();
const axios = require('axios');

async function testOpenRouterAPI() {
  console.log('🔍 Debugging OpenRouter API Call...\n');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  const models = process.env.OPENROUTER_MODELS_TO_USE?.split(',').map(m => m.trim()) || [];
  
  console.log('✅ API Key present:', !!apiKey);
  if (apiKey) {
    console.log('✅ API Key length:', apiKey.length);
    console.log('✅ API Key starts with sk-or-v1-:', apiKey.startsWith('sk-or-v1-'));
    console.log('✅ API Key first 20 chars:', apiKey.substring(0, 20) + '...');
  }
  
  console.log('✅ Models configured:', models);
  console.log('✅ Using model:', models[0]);
  console.log('');
  
  if (!apiKey || models.length === 0) {
    console.log('❌ Missing API key or models configuration');
    return;
  }

  try {
    console.log('🚀 Making API request to OpenRouter...');
    // First, let's try to get the list of available models to verify our API key works
    console.log('🔍 First, testing with models endpoint...');
    
    try {
      const modelsResponse = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Models endpoint works! Found', modelsResponse.data.data.length, 'models');
    } catch (modelError) {
      console.log('❌ Models endpoint failed:', modelError.response?.status, modelError.response?.data);
      return;
    }
    
    console.log('🚀 Now trying chat completions...');
    
    // Try with a free model first
    const freeModel = 'meta-llama/llama-3.2-3b-instruct:free';
    console.log('🆓 First trying with free model:', freeModel);
    
    try {
      const freeResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: freeModel,
        messages: [{ role: 'user', content: 'Hello! Please respond with just "Hi there!"' }],
        max_tokens: 20
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://astraforge.dev',
          'X-Title': 'AstraForge IDE Debug'
        }
      });
      
      console.log('✅ FREE MODEL SUCCESS! Response status:', freeResponse.status);
      console.log('✅ Free model response:', JSON.stringify(freeResponse.data, null, 2));
      
    } catch (freeError) {
      console.log('❌ Free model also failed:', freeError.response?.status, freeError.response?.data);
    }
    
    console.log('\n💰 Now trying with your configured model:', models[0]);
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: models[0],
      messages: [{ role: 'user', content: 'Hello! Please respond with just "Hi there!"' }],
      max_tokens: 20
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://astraforge.dev',
        'X-Title': 'AstraForge IDE Debug'
      }
    });

    console.log('✅ SUCCESS! Response status:', response.status);
    console.log('✅ Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ ERROR occurred:');
    console.log('Status:', error.response?.status);
    console.log('Status text:', error.response?.statusText);
    console.log('Response data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Full error message:', error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔧 Troubleshooting 401 Error:');
      console.log('1. Verify your API key is correct and active');
      console.log('2. Check that your API key starts with "sk-or-v1-"');
      console.log('3. Ensure you have credits in your OpenRouter account');
      console.log('4. Verify the model name is correct');
    }
  }
}

testOpenRouterAPI();
