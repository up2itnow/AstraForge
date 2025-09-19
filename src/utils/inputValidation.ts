/**
 * Input Validation and Sanitization Utilities
 * Ensures all user inputs are properly validated before sending to LLMs
 * Includes path traversal prevention for secure file operations
 */

import * as path from 'path';

/**
 * Path validation result interface
 */
export interface PathValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedPath?: string;
}

/**
 * Sanitize and validate file paths to prevent path traversal attacks
 *
 * @param inputPath - The path to validate and sanitize
 * @param basePath - Optional base path to restrict operations within
 * @returns Path validation result with sanitized path
 */
export function validateAndSanitizePath(
  inputPath: string,
  basePath?: string
): PathValidationResult {
  const errors: string[] = [];

  if (!inputPath || typeof inputPath !== 'string') {
    return {
      isValid: false,
      errors: ['Path must be a non-empty string'],
    };
  }

  // Remove null bytes and control characters
  let sanitized = inputPath.replace(/[\u0000-\u001f\u007f]/g, '');

  // Check for path traversal sequences BEFORE sanitization
  const traversalPatterns = [
    /\.\./,           // Standard directory traversal
    /\.\\/,           // Windows directory traversal
    /\.\//,           // Current directory references (when used maliciously)
  ];

  const containsTraversal = traversalPatterns.some(pattern => pattern.test(inputPath));
  if (containsTraversal) {
    errors.push('Path contains potentially dangerous traversal sequences');
  }

  // Remove dangerous path components
  sanitized = sanitized
    .replace(/\.\./g, '')        // Remove all .. sequences
    .replace(/\.\\/g, '')        // Remove .\ sequences  
    .replace(/\.\//g, '')        // Remove ./ sequences
    .replace(/\/+/g, '/')        // Normalize multiple slashes
    .replace(/\\+/g, '\\')       // Normalize multiple backslashes
    .replace(/^[\/\\]+/, '')     // Remove leading slashes
    .replace(/[\/\\]+$/, '');    // Remove trailing slashes

  // Validate against absolute paths (should be relative)
  if (path.isAbsolute(inputPath)) {
    errors.push('Absolute paths are not allowed');
  }

  // Check for dangerous file names in path components
  const dangerousNames = [
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i,  // Windows reserved names
    /^\./,                                       // Hidden files starting with dot
    /[<>:"|?*]/,                                // Invalid filename characters
  ];

  const pathParts = sanitized.split(/[/\\]/);
  for (const part of pathParts) {
    if (part) {
      // Check reserved names by removing extension first
      const nameWithoutExt = part.split('.')[0];
      if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(nameWithoutExt)) {
        errors.push('Path contains invalid or dangerous filename components');
        break;
      }
      // Check other dangerous patterns
      if (dangerousNames.slice(1).some(pattern => pattern.test(part))) {
        errors.push('Path contains invalid or dangerous filename components');
        break;
      }
    }
  }

  // If basePath provided, ensure sanitized path would be within it
  if (basePath && sanitized && errors.length === 0) {
    try {
      const resolvedBase = path.resolve(basePath);
      const resolvedPath = path.resolve(basePath, sanitized);
      
      if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
        errors.push('Path would escape the allowed base directory');
      }
    } catch {
      errors.push('Invalid path structure');
    }
  }

  // Final length check
  if (sanitized.length > 260) {
    errors.push('Path exceeds maximum allowed length');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedPath: errors.length === 0 ? sanitized : undefined,
  };
}

/**
 * Create a safe path by joining base path with sanitized user input
 *
 * @param basePath - The base directory path
 * @param userPath - User-provided path component
 * @returns Safe path or null if validation fails
 */
export function createSafePath(basePath: string, userPath: string): string | null {
  const validation = validateAndSanitizePath(userPath, basePath);
  
  if (!validation.isValid || !validation.sanitizedPath) {
    return null;
  }

  return path.join(basePath, validation.sanitizedPath);
}

/**
 * Validate filename to ensure it's safe for file operations
 *
 * @param filename - The filename to validate
 * @returns Validation result
 */
export function validateFilename(filename: string): ValidationResult {
  const errors: string[] = [];

  if (!filename || typeof filename !== 'string') {
    return {
      isValid: false,
      errors: ['Filename must be a non-empty string'],
    };
  }

  // Remove path separators - filename should not contain paths
  const sanitized = filename.replace(/[/\\]/g, '');

  if (sanitized !== filename) {
    errors.push('Filename cannot contain path separators');
  }

  // Check length
  if (sanitized.length > 255) {
    errors.push('Filename exceeds maximum length of 255 characters');
  }

  // Check for dangerous characters
  if (/[<>:"|?*\u0000-\u001f\u007f]/.test(sanitized)) {
    errors.push('Filename contains invalid characters');
  }

  // Check for reserved names (name without extension)
  const nameWithoutExt = path.parse(sanitized).name;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(nameWithoutExt)) {
    errors.push('Filename uses a reserved system name');
  }

  // Check for dangerous extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif', '.vbs', '.js', '.jar'];
  const ext = path.extname(sanitized).toLowerCase();
  if (dangerousExtensions.includes(ext)) {
    errors.push('File extension is not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}
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
  customPatterns: [],
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
      errors: ['Input must be a non-empty string'],
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
  sanitized = sanitized.replace(/[\u0000-\u001f\u007f]/g, '');

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
    /(?:you\s+are|you're)\s+(?:now|a)/gi,
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
    /\${.*}/g, // Template literals
    /<%.*%>/g, // Template tags
    /{{.*}}/g, // Handlebars/Mustache
    /\[\[.*\]\]/g, // Wiki/Markdown links that could be exploited
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
    sanitized: errors.length === 0 ? sanitized.trim() : undefined,
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
      errors: ['API key must be a non-empty string'],
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
    sanitized: errors.length === 0 ? cleanKey : undefined,
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
    allowScripts: false,
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
      errors: ['File content must be a string'],
    };
  }

  // Check file size (10MB limit)
  if (content.length > 10 * 1024 * 1024) {
    errors.push('File content exceeds 10MB limit');
  }

  // Check for binary content
  if (/[\u0000-\u0008\u000e-\u001f\u007f]/.test(content)) {
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
    sanitized: errors.length === 0 ? content : undefined,
  };
}
