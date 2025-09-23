/**
 * Commit Analyzer for severity detection and categorization
 * Optimized with static regex patterns for better performance
 */

export interface SeverityAnalysis {
  level: 'critical' | 'high' | 'medium' | 'low';
  keywords: string[];
  score: number;
  category: string;
}

export class CommitAnalyzer {
  // Extract the regex pattern as a static constant to improve performance
  private static readonly SEVERITY_KEYWORDS = /\b(critical|blocker|major|urgent|severe|emergency|hotfix)\b/gi;

  private static readonly HIGH_PRIORITY_KEYWORDS = /\b(important|fix|bug|error|fail|crash|security)\b/gi;

  private static readonly MEDIUM_PRIORITY_KEYWORDS = /\b(improve|update|enhance|refactor|optimize)\b/gi;

  private static readonly LOW_PRIORITY_KEYWORDS = /\b(minor|docs|documentation|style|format|cleanup)\b/gi;

  /**
   * Analyze commit message for severity level
   */
  analyzeSeverity(message: string): SeverityAnalysis {
    // Reset the regex lastIndex to ensure consistent behavior with global flag
    CommitAnalyzer.SEVERITY_KEYWORDS.lastIndex = 0;
    CommitAnalyzer.HIGH_PRIORITY_KEYWORDS.lastIndex = 0;
    CommitAnalyzer.MEDIUM_PRIORITY_KEYWORDS.lastIndex = 0;
    CommitAnalyzer.LOW_PRIORITY_KEYWORDS.lastIndex = 0;

    const criticalMatches = message.match(CommitAnalyzer.SEVERITY_KEYWORDS) || [];
    const highMatches = message.match(CommitAnalyzer.HIGH_PRIORITY_KEYWORDS) || [];
    const mediumMatches = message.match(CommitAnalyzer.MEDIUM_PRIORITY_KEYWORDS) || [];
    const lowMatches = message.match(CommitAnalyzer.LOW_PRIORITY_KEYWORDS) || [];

    let level: SeverityAnalysis['level'] = 'low';
    let score = 0;
    let keywords: string[] = [];
    let category = 'general';

    if (criticalMatches.length > 0) {
      level = 'critical';
      score = 90 + (criticalMatches.length * 5);
      keywords = criticalMatches.map(match => match.toLowerCase());
      category = 'emergency';
    } else if (highMatches.length > 0) {
      level = 'high';
      score = 70 + (highMatches.length * 3);
      keywords = highMatches.map(match => match.toLowerCase());
      category = 'maintenance';
    } else if (mediumMatches.length > 0) {
      level = 'medium';
      score = 50 + (mediumMatches.length * 2);
      keywords = mediumMatches.map(match => match.toLowerCase());
      category = 'improvement';
    } else if (lowMatches.length > 0) {
      level = 'low';
      score = 20 + lowMatches.length;
      keywords = lowMatches.map(match => match.toLowerCase());
      category = 'documentation';
    } else {
      score = 10;
      category = 'general';
    }

    return {
      level,
      keywords,
      score: Math.min(score, 100),
      category
    };
  }

  /**
   * Categorize commit based on conventional commit format
   */
  categorizeCommit(message: string): string {
    const conventionalPattern = /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build)(\(.+\))?:/;
    const match = message.match(conventionalPattern);
    
    if (match) {
      return match[1];
    }

    // Fallback to keyword-based categorization
    const analysis = this.analyzeSeverity(message);
    return analysis.category;
  }

  /**
   * Generate commit summary with severity analysis
   */
  generateCommitSummary(message: string): {
    message: string;
    severity: SeverityAnalysis;
    category: string;
    timestamp: string;
  } {
    return {
      message,
      severity: this.analyzeSeverity(message),
      category: this.categorizeCommit(message),
      timestamp: new Date().toISOString()
    };
  }
}