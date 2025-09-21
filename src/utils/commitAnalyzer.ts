/**
 * Commit Message Analyzer
 * Analyzes commit messages and issue descriptions for severity levels
 */

export interface SeverityAnalysis {
  hasSeverityKeywords: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  matchedKeywords: string[];
}

export class CommitAnalyzer {
  // Extract the regex pattern as a static constant to improve performance
  private static readonly SEVERITY_KEYWORDS = /\b(critical|blocker|major|urgent|severe)\b/gi;

  /**
   * Analyzes a commit message or issue description for severity keywords
   * Now uses a static regex pattern for better performance
   */
  analyzeSeverity(message: string): SeverityAnalysis {
    // Reset the regex lastIndex to ensure consistent behavior with global flag
    CommitAnalyzer.SEVERITY_KEYWORDS.lastIndex = 0;
    
    const matches = message.match(CommitAnalyzer.SEVERITY_KEYWORDS) || [];
    const matchedKeywords = matches.map(match => match.toLowerCase());
    
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (matchedKeywords.includes('critical') || matchedKeywords.includes('blocker')) {
      severity = 'critical';
    } else if (matchedKeywords.includes('major') || matchedKeywords.includes('urgent')) {
      severity = 'high';
    } else if (matchedKeywords.includes('severe')) {
      severity = 'medium';
    }
    
    return {
      hasSeverityKeywords: matches.length > 0,
      severity,
      matchedKeywords: Array.from(new Set(matchedKeywords))
    };
  }
  
  /**
   * Analyzes multiple messages at once
   */
  analyzeBatch(messages: string[]): SeverityAnalysis[] {
    return messages.map(message => this.analyzeSeverity(message));
  }
  
  /**
   * Gets the highest severity from a list of messages
   */
  getHighestSeverity(messages: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const analyses = this.analyzeBatch(messages);
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    
    let highestIndex = 0;
    for (const analysis of analyses) {
      const index = severityLevels.indexOf(analysis.severity);
      if (index > highestIndex) {
        highestIndex = index;
      }
    }
    
    return severityLevels[highestIndex] as 'low' | 'medium' | 'high' | 'critical';
  }
}