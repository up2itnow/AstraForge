/**
 * Centralized error handling utilities
 * Provides consistent error management across the extension
 */

import * as vscode from 'vscode';
import { logger } from './logger';

export interface ErrorContext {
  operation: string;
  component: string;
  metadata?: Record<string, unknown>;
}

export class AstraForgeError extends Error {
  public readonly context: ErrorContext;
  public readonly timestamp: Date;

  constructor(message: string, context: ErrorContext, cause?: Error) {
    super(message);
    this.name = 'AstraForgeError';
    this.context = context;
    this.timestamp = new Date();
    
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Handle errors consistently across the extension
 */
export function handleError(error: unknown, context: ErrorContext): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const astraError = new AstraForgeError(errorMessage, context, error instanceof Error ? error : undefined);
  
  // Log the error
  logger.error(`[${context.component}] ${context.operation} failed: ${errorMessage}`, {
    context,
    error: astraError,
    timestamp: astraError.timestamp.toISOString()
  });

  // Show user-friendly message
  const userMessage = getUserFriendlyMessage(context, errorMessage);
  vscode.window.showErrorMessage(userMessage);
}

/**
 * Handle async operations with consistent error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context);
    return null;
  }
}

/**
 * Retry async operations with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T | null> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        handleError(error, { ...context, metadata: { ...context.metadata, attempts: attempt } });
        return null;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return null;
}

/**
 * Generate user-friendly error messages
 */
function getUserFriendlyMessage(context: ErrorContext, errorMessage: string): string {
  const componentName = context.component.replace(/([A-Z])/g, ' $1').trim();
  
  // Map common error patterns to user-friendly messages
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return `${componentName}: Network connection issue. Please check your internet connection and try again.`;
  }
  
  if (errorMessage.includes('API key') || errorMessage.includes('unauthorized')) {
    return `${componentName}: Authentication failed. Please check your API key configuration.`;
  }
  
  if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
    return `${componentName}: Rate limit exceeded. Please wait a moment and try again.`;
  }
  
  if (errorMessage.includes('path') || errorMessage.includes('file') || errorMessage.includes('directory')) {
    return `${componentName}: File system error. Please check file permissions and try again.`;
  }
  
  // Default message
  return `${componentName}: ${context.operation} failed. Please try again or check the logs for details.`;
}

/**
 * Validate error recovery strategies
 */
export function validateErrorRecovery(error: unknown): {
  canRetry: boolean;
  shouldShowUser: boolean;
  suggestedAction?: string;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Network errors - usually retryable
  if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('ECONNRESET')) {
    return {
      canRetry: true,
      shouldShowUser: true,
      suggestedAction: 'Check your internet connection'
    };
  }
  
  // Authentication errors - not retryable without user action
  if (errorMessage.includes('unauthorized') || errorMessage.includes('API key')) {
    return {
      canRetry: false,
      shouldShowUser: true,
      suggestedAction: 'Check your API key configuration'
    };
  }
  
  // Rate limiting - retryable after delay
  if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
    return {
      canRetry: true,
      shouldShowUser: true,
      suggestedAction: 'Wait a moment before trying again'
    };
  }
  
  // File system errors - depends on the specific error
  if (errorMessage.includes('ENOENT') || errorMessage.includes('EACCES')) {
    return {
      canRetry: false,
      shouldShowUser: true,
      suggestedAction: 'Check file permissions and paths'
    };
  }
  
  // Default: don't retry, but inform user
  return {
    canRetry: false,
    shouldShowUser: true
  };
}