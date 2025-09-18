$key = $env:OPENROUTER_API_KEY

node out/testing/apiTesterCLI.js test --api OpenRouter --key $key --model gpt-4 --workflow "Create a simple to-do list app" --output test_result.json
