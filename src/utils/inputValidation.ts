/**
 * Input Validation and Sanitization Utilities
 * Ensures all user inputs are properly validated before sending to LLMs
 * Optimized with static regex patterns for better performance
 */

// Static regex patterns for improved performance
const SCRIPT_SANITIZATION_PATTERNS = [
  /<[^>]*>/g, // HTML tags
  /<script[^>]*>.*?<\/script>/gi, // Script tags
  /javascript:/gi, // JavaScript protocols
  /on\w+\s*=/gi, // Event handlers
] as const;

const SUSPICIOUS_PATTERNS = [
  /system\s*:/gi,
  /(?:ignore|disregard|forget).*(?:instructions|prompt|rules)/gi,
  /(?:act|pretend|roleplay)\s+as/gi,
  /(?:you\s+are|you're)\s+(?:now|a)/gi,
] as const;

const INJECTION_PATTERNS = [
  /\${.*}/g, // Template literals
  /<%.*%>/g, // Template tags
  /{{.*}}/g, // Handlebars/Mustache
  /\[\[.*\]\]/g, // Wiki/Markdown links that could be exploited
] as const;

const API_KEY_PATTERN = /^[a-zA-Z0-9\-_]+$/;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS_PATTERN = /[\x00-\x1F\x7F]/g;

// Path traversal and filename validation patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\./g, // Directory traversal
  /\.\\/, // Windows path traversal  
  /\/\.\./g, // Unix path traversal
] as const;

const DANGEROUS_FILENAME_PATTERNS = [
  /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
  // eslint-disable-next-line no-control-regex
  /[<>:"|?*\x00-\x1f]/g, // Invalid filename characters
] as const;

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

  // Basic input validation
  const basicValidation = validateBasicInput(input);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // Length validation
  const lengthErrors = validateInputLength(input, options);
  errors.push(...lengthErrors);

  // Content sanitization
  const sanitizedInput = sanitizeInput(input, options);

  // Pattern validation
  const patternErrors = validatePatterns(sanitizedInput, options);
  errors.push(...patternErrors);

  return {
    isValid: errors.length === 0,
    sanitized: errors.length === 0 ? sanitizedInput.trim() : undefined,
    errors,
  };
}

/**
 * Validate basic input properties
 */
function validateBasicInput(input: string): ValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      errors: ['Input must be a non-empty string'],
    };
  }
  return { isValid: true, errors: [] };
}

/**
 * Validate input length
 */
function validateInputLength(input: string, options: ValidationOptions): string[] {
  const errors: string[] = [];

  if (options.maxLength && input.length > options.maxLength) {
    errors.push(`Input exceeds maximum length of ${options.maxLength} characters`);
  }

  if (options.minLength && input.length < options.minLength) {
    errors.push(`Input must be at least ${options.minLength} characters long`);
  }

  return errors;
}

/**
 * Sanitize input by removing dangerous content
 */
function sanitizeInput(input: string, options: ValidationOptions): string {
  let sanitized = input;

  // Remove control characters and potentially dangerous content
  sanitized = removeControlCharacters(sanitized);

  // HTML/Script sanitization using static patterns
  if (!options.allowHtml) {
    sanitized = sanitized.replace(SCRIPT_SANITIZATION_PATTERNS[0], '');
  }

  if (!options.allowScripts) {
    sanitized = sanitized.replace(SCRIPT_SANITIZATION_PATTERNS[1], '');
    sanitized = sanitized.replace(SCRIPT_SANITIZATION_PATTERNS[2], '');
    sanitized = sanitized.replace(SCRIPT_SANITIZATION_PATTERNS[3], '');
  }

  return sanitized;
}

/**
 * Validate input against suspicious patterns
 */
function validatePatterns(sanitizedInput: string, options: ValidationOptions): string[] {
  const errors: string[] = [];

  // Check for suspicious patterns using static constants
  for (const pattern of SUSPICIOUS_PATTERNS) {
    // Reset lastIndex for global regexes to ensure consistent behavior
    pattern.lastIndex = 0;
    if (pattern.test(sanitizedInput)) {
      errors.push('Input contains potentially suspicious content');
      break;
    }
  }

  // Custom pattern validation
  if (options.customPatterns) {
    for (const pattern of options.customPatterns) {
      if (pattern.test(sanitizedInput)) {
        errors.push('Input violates custom validation pattern');
        break;
      }
    }
  }

  // Check for potential injection attempts using static patterns
  for (const pattern of INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(sanitizedInput)) {
      errors.push('Input contains potentially unsafe template syntax');
      break;
    }
  }

  return errors;
}

/**
 * Validate API key format
 *
 * @param apiKey - The API key to validate
 * @param provider - The provider name for specific validation rules
 * @returns Validation result
 */
function validateBasicApiKey(apiKey: string, errors: string[]): string | null {
  if (!apiKey || typeof apiKey !== 'string') {
    errors.push('API key must be a non-empty string');
    return null;
  }

  const cleanKey = apiKey.trim();

  if (cleanKey.length < 10) {
    errors.push('API key appears to be too short');
    return null;
  }

  // Use static pattern for API key validation
  if (!API_KEY_PATTERN.test(cleanKey)) {
    errors.push('API key contains invalid characters');
    return null;
  }

  return cleanKey;
}

function validateProviderSpecific(apiKey: string, provider: string, errors: string[]): void {
  const lowerProvider = provider.toLowerCase();

  switch (lowerProvider) {
    case 'openai':
      if (!apiKey.startsWith('sk-')) {
        errors.push('OpenAI API keys should start with "sk-"');
      }
      if (apiKey.length < 51) {
        errors.push('OpenAI API key appears to be invalid length');
      }
      break;

    case 'anthropic':
      if (!apiKey.startsWith('sk-ant-')) {
        errors.push('Anthropic API keys should start with "sk-ant-"');
      }
      break;

    case 'xai':
      if (!apiKey.startsWith('xai-')) {
        errors.push('xAI API keys should start with "xai-"');
      }
      break;

    case 'openrouter':
      if (!apiKey.startsWith('sk-or-')) {
        errors.push('OpenRouter API keys should start with "sk-or-"');
      }
      break;
  }
}

export function validateApiKey(apiKey: string, provider: string): ValidationResult {
  const errors: string[] = [];

  const cleanKey = validateBasicApiKey(apiKey, errors);
  if (!cleanKey) {
    return {
      isValid: false,
      errors,
    };
  }

  validateProviderSpecific(cleanKey, provider, errors);

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
  if (hasControlCharacters(content)) {
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

/**
 * Remove control characters from a string
 */
function removeControlCharacters(input: string): string {
  // Use static pattern for better performance
  return input.replace(CONTROL_CHARACTERS_PATTERN, '');
}

/**
 * Check if a string contains control characters  
 */
function hasControlCharacters(input: string): boolean {
  CONTROL_CHARACTERS_PATTERN.lastIndex = 0;
  return CONTROL_CHARACTERS_PATTERN.test(input);
}

/**
 * Sanitize path input to prevent directory traversal attacks
 */
export function sanitizeForPath(input: string, options: { maxLength?: number; allowDots?: boolean } = {}): string {
  const { maxLength = 100, allowDots = false } = options;
  
  if (!input || typeof input !== 'string') {
    return 'unnamed';
  }

  let sanitized = input.trim();

  // Remove path traversal sequences and dangerous characters
  sanitized = removePathTraversalSequences(sanitized);
  sanitized = removeDangerousFilenameChars(sanitized);
  sanitized = handleWindowsReservedNames(sanitized);

  // Handle dots, spaces, and cleanup
  if (!allowDots) {
    sanitized = sanitized.replace(/^\.+|\.+$/g, '');
  }

  sanitized = sanitized.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-');

  // Ensure not empty and within length limit  
  if (!sanitized || sanitized === '-') {
    sanitized = 'unnamed';
  }

  return sanitized.substring(0, maxLength);
}

// Helper functions to reduce complexity
function removePathTraversalSequences(input: string): string {
  let result = input;
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, '');
  }
  return result;
}

function removeDangerousFilenameChars(input: string): string {
  return input.replace(DANGEROUS_FILENAME_PATTERNS[1], '-');
}

function handleWindowsReservedNames(input: string): string {
  if (DANGEROUS_FILENAME_PATTERNS[0].test(input)) {
    return `file-${input}`;
  }
  return input;
}

/**
 * Validate and sanitize file path to prevent traversal attacks
 */
export function validateAndSanitizePath(inputPath: string, _baseDir: string): ValidationResult {
  const errors: string[] = [];

  if (!inputPath || typeof inputPath !== 'string') {
    return {
      isValid: false,
      errors: ['Path must be a non-empty string'],
    };
  }

  // Check for path traversal attempts using static patterns
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(inputPath)) {
      errors.push('Path contains directory traversal sequences');
      break;
    }
  }

  // Additional path validation
  if (inputPath.includes('\x00')) {
    errors.push('Path contains null bytes');
  }

  if (inputPath.length > 260) { // Windows MAX_PATH limit
    errors.push('Path exceeds maximum length');
  }

  // eslint-disable-next-line no-control-regex
  const sanitized = inputPath.replace(/[<>:"|?*\x00-\x1f]/g, '');

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}

/**
 * Create a safe path by combining base directory and sanitized filename
 */
export function createSafePath(baseDir: string, filename: string): string {
  const sanitizedFilename = sanitizeForPath(filename);
  return require('path').join(baseDir, sanitizedFilename);
}

/**
 * Validate filename for safety
 */
export function validateFilename(filename: string): ValidationResult {
  const errors: string[] = [];

  if (!filename || typeof filename !== 'string') {
    return {
      isValid: false,
      errors: ['Filename must be a non-empty string'],
    };
  }

  // Check against dangerous filename patterns
  if (DANGEROUS_FILENAME_PATTERNS[0].test(filename)) {
    errors.push('Filename is a reserved system name');
  }

  if (DANGEROUS_FILENAME_PATTERNS[1].test(filename)) {
    errors.push('Filename contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? filename : sanitizeForPath(filename),
  };
}
