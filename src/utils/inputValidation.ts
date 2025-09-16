/**
 * Input Validation and Sanitization Utilities
 * Ensures all user inputs are properly validated before sending to LLMs
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: string;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowHtml?: boolean;
  allowScripts?: boolean;
  customPatterns?: RegExp[];
}

/**
 * Default validation options for LLM prompts
 */
const DEFAULT_PROMPT_OPTIONS: ValidationOptions = {
  maxLength: 10000,
  minLength: 1,
  allowHtml: false,
  allowScripts: false,
  customPatterns: []
};

/**
 * Sanitize and validate user input for LLM consumption
 * 
 * @param input - The user input to validate
 * @param options - Validation options
 * @returns Validation result with sanitized input
 */
export function validateLLMInput(
  input: string, 
  options: ValidationOptions = DEFAULT_PROMPT_OPTIONS
): ValidationResult {
  const errors: string[] = [];
  let sanitized = input;

  // Basic null/undefined check
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      errors: ['Input must be a non-empty string']
    };
  }

  // Length validation
  if (options.maxLength && input.length > options.maxLength) {
    errors.push(`Input exceeds maximum length of ${options.maxLength} characters`);
  }

  if (options.minLength && input.length < options.minLength) {
    errors.push(`Input must be at least ${options.minLength} characters long`);
  }

  // Remove control characters and potentially dangerous content
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // HTML/Script sanitization
  if (!options.allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  if (!options.allowScripts) {
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /system\s*:/gi,
    /(?:ignore|disregard|forget).*(?:instructions|prompt|rules)/gi,
    /(?:act|pretend|roleplay)\s+as/gi,
    /(?:you\s+are|you're)\s+(?:now|a)/gi
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      errors.push('Input contains potentially suspicious content');
      break;
    }
  }

  // Custom pattern validation
  if (options.customPatterns) {
    for (const pattern of options.customPatterns) {
      if (pattern.test(sanitized)) {
        errors.push('Input violates custom validation pattern');
        break;
      }
    }
  }

  // Check for potential injection attempts
  const injectionPatterns = [
    /\${.*}/g,  // Template literals
    /<%.*%>/g,  // Template tags
    /{{.*}}/g,  // Handlebars/Mustache
    /\[\[.*\]\]/g  // Wiki/Markdown links that could be exploited
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(sanitized)) {
      errors.push('Input contains potentially unsafe template syntax');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized.trim() : undefined
  };
}

/**
 * Validate API key format
 * 
 * @param apiKey - The API key to validate
 * @param provider - The provider name for specific validation rules
 * @returns Validation result
 */
export function validateApiKey(apiKey: string, provider: string): ValidationResult {
  const errors: string[] = [];

  if (!apiKey || typeof apiKey !== 'string') {
    return {
      isValid: false,
      errors: ['API key must be a non-empty string']
    };
  }

  // Remove whitespace
  const cleanKey = apiKey.trim();

  // Basic length validation
  if (cleanKey.length < 10) {
    errors.push('API key appears to be too short');
  }

  // Provider-specific validation
  switch (provider.toLowerCase()) {
    case 'openai':
      if (!cleanKey.startsWith('sk-')) {
        errors.push('OpenAI API keys should start with "sk-"');
      }
      if (cleanKey.length < 51) {
        errors.push('OpenAI API key appears to be invalid length');
      }
      break;

    case 'anthropic':
      if (!cleanKey.startsWith('sk-ant-')) {
        errors.push('Anthropic API keys should start with "sk-ant-"');
      }
      break;

    case 'xai':
      if (!cleanKey.startsWith('xai-')) {
        errors.push('xAI API keys should start with "xai-"');
      }
      break;

    case 'openrouter':
      if (!cleanKey.startsWith('sk-or-')) {
        errors.push('OpenRouter API keys should start with "sk-or-"');
      }
      break;
  }

  // Check for suspicious characters
  if (!/^[a-zA-Z0-9\-_]+$/.test(cleanKey)) {
    errors.push('API key contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? cleanKey : undefined
  };
}

/**
 * Validate project idea input
 * 
 * @param idea - The project idea to validate
 * @returns Validation result
 */
export function validateProjectIdea(idea: string): ValidationResult {
  return validateLLMInput(idea, {
    maxLength: 5000,
    minLength: 10,
    allowHtml: false,
    allowScripts: false
  });
}

/**
 * Validate file content before processing
 * 
 * @param content - File content to validate
 * @param filename - Optional filename for context
 * @returns Validation result
 */
export function validateFileContent(content: string, filename?: string): ValidationResult {
  const errors: string[] = [];
  
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      errors: ['File content must be a string']
    };
  }

  // Check file size (10MB limit)
  if (content.length > 10 * 1024 * 1024) {
    errors.push('File content exceeds 10MB limit');
  }

  // Check for binary content
  if (/[\x00-\x08\x0E-\x1F\x7F]/.test(content)) {
    errors.push('File appears to contain binary data');
  }

  // Filename validation
  if (filename) {
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    if (dangerousExtensions.includes(ext)) {
      errors.push('File type not allowed');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? content : undefined
  };
}