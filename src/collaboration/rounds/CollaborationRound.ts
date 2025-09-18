/**
 * CollaborationRound - Manages individual rounds within a collaborative session
 * 
 * Each round has a specific purpose (propose, critique, synthesize, validate)
 * and manages the collection and processing of contributions from LLM participants.
 */

import { 
  CollaborationRound as ICollaborationRound,
  RoundType,
  Contribution,
  RoundOutput,
  LLMParticipant,
  ConsensusLevel
} from '../types/collaborationTypes';
import { logger } from '../../utils/logger';

export class CollaborationRound implements ICollaborationRound {
  public id: string;
  public sessionId: string;
  public roundNumber: number;
  public type: RoundType;
  public purpose: string;
  public timeLimit: number;
  public startTime: Date;
  public endTime?: Date;
  public contributions: Contribution[] = [];
  public roundOutput?: RoundOutput;
  public status: 'pending' | 'active' | 'completed' | 'timeout' = 'pending';

  constructor(
    sessionId: string,
    roundNumber: number,
    type: RoundType,
    purpose: string,
    timeLimit: number
  ) {
    this.id = `round_${sessionId}_${roundNumber}_${type}`;
    this.sessionId = sessionId;
    this.roundNumber = roundNumber;
    this.type = type;
    this.purpose = purpose;
    this.timeLimit = timeLimit;
    this.startTime = new Date();
  }

  /**
   * Add a contribution to this round
   */
  addContribution(contribution: Contribution): void {
    if (this.status !== 'active') {
      throw new Error(`Cannot add contribution to round ${this.id} with status ${this.status}`);
    }

    contribution.roundId = this.id;
    this.contributions.push(contribution);
    
    logger.debug(`📝 Added contribution from ${contribution.author.provider} to round ${this.type}`);
  }

  /**
   * Get contributions by participant
   */
  getContributionsByParticipant(participantId: string): Contribution[] {
    return this.contributions.filter(c => c.author.id === participantId);
  }

  /**
   * Get the average confidence score for this round
   */
  getAverageConfidence(): number {
    if (this.contributions.length === 0) {
      return 0;
    }

    const totalConfidence = this.contributions.reduce((sum, c) => sum + c.confidence, 0);
    return totalConfidence / this.contributions.length;
  }

  /**
   * Get total token count for this round
   */
  getTotalTokenCount(): number {
    return this.contributions.reduce((sum, c) => sum + c.tokenCount, 0);
  }

  /**
   * Check if all expected participants have contributed
   */
  hasAllContributions(expectedParticipants: LLMParticipant[]): boolean {
    const contributorIds = new Set(this.contributions.map(c => c.author.id));
    return expectedParticipants.every(p => contributorIds.has(p.id));
  }

  /**
   * Generate round output summary
   */
  generateRoundOutput(): RoundOutput {
    const consensusLevel = this.determineConsensusLevel();
    const qualityScore = this.calculateQualityScore();
    
    this.roundOutput = {
      roundId: this.id,
      type: this.type,
      synthesizedContent: this.synthesizeContributions(),
      participatingContributions: this.contributions.map(c => c.id),
      consensusLevel,
      qualityScore,
      emergenceIndicators: [], // TODO: Implement emergence detection
      nextRoundRecommendation: this.recommendNextRound()
    };

    return this.roundOutput;
  }

  /**
   * Determine consensus level based on contribution analysis
   */
  private determineConsensusLevel(): ConsensusLevel {
    if (this.contributions.length === 0) {
      return 'forced_consensus';
    }

    // Simple implementation - can be enhanced with semantic analysis
    const agreements = this.analyzeAgreements();
    
    if (agreements >= 0.9) {
      return 'unanimous';
    } else if (agreements >= 0.66) {
      return 'qualified_majority';
    } else if (agreements >= 0.51) {
      return 'simple_majority';
    } else {
      return 'forced_consensus';
    }
  }

  /**
   * Analyze agreement levels between contributions
   */
  private analyzeAgreements(): number {
    if (this.contributions.length <= 1) {
      return 1.0; // Single contribution is 100% agreement with itself
    }

    // Simple implementation: average confidence as proxy for agreement
    // TODO: Implement semantic similarity analysis
    const avgConfidence = this.getAverageConfidence();
    return avgConfidence / 100;
  }

  /**
   * Calculate quality score for this round
   */
  private calculateQualityScore(): number {
    if (this.contributions.length === 0) {
      return 0;
    }

    // Factors: average confidence, contribution count, diversity
    const avgConfidence = this.getAverageConfidence();
    const contributionBonus = Math.min(this.contributions.length * 10, 30); // Up to 30 points for participation
    const diversityBonus = this.calculateDiversityBonus();

    return Math.min(100, avgConfidence + contributionBonus + diversityBonus);
  }

  /**
   * Calculate diversity bonus based on different providers contributing
   */
  private calculateDiversityBonus(): number {
    const uniqueProviders = new Set(this.contributions.map(c => c.author.provider));
    return uniqueProviders.size * 5; // 5 points per unique provider
  }

  /**
   * Synthesize contributions into a summary
   */
  private synthesizeContributions(): string {
    if (this.contributions.length === 0) {
      return `No contributions received for ${this.type} round.`;
    }

    if (this.contributions.length === 1) {
      return this.contributions[0].content;
    }

    // Simple synthesis - can be enhanced with LLM-powered synthesis
    const contributionSummaries = this.contributions.map((c, _index) => 
      `**${c.author.provider}** (Confidence: ${c.confidence}%): ${c.content.substring(0, 200)}...`
    );

    return `**${this.type.toUpperCase()} ROUND SYNTHESIS**\n\n${contributionSummaries.join('\n\n')}`;
  }

  /**
   * Recommend the next round type based on current round results
   */
  private recommendNextRound(): RoundType | undefined {
    const roundSequence: RoundType[] = ['propose', 'critique', 'synthesize', 'validate'];
    const currentIndex = roundSequence.indexOf(this.type);
    
    if (currentIndex < roundSequence.length - 1) {
      return roundSequence[currentIndex + 1];
    }

    // If we're at the last round, check if we need more iterations
    const qualityScore = this.calculateQualityScore();
    if (qualityScore < 70) {
      return 'propose'; // Start over if quality is too low
    }

    return undefined; // No more rounds needed
  }

  /**
   * Get round duration in milliseconds
   */
  getDuration(): number {
    if (!this.endTime) {
      return Date.now() - this.startTime.getTime();
    }
    return this.endTime.getTime() - this.startTime.getTime();
  }

  /**
   * Check if round is within time limit
   */
  isWithinTimeLimit(): boolean {
    return this.getDuration() <= this.timeLimit;
  }

  /**
   * Get round statistics
   */
  getStatistics(): {
    duration: number;
    contributionCount: number;
    averageConfidence: number;
    totalTokens: number;
    uniqueProviders: number;
    qualityScore: number;
  } {
    return {
      duration: this.getDuration(),
      contributionCount: this.contributions.length,
      averageConfidence: this.getAverageConfidence(),
      totalTokens: this.getTotalTokenCount(),
      uniqueProviders: new Set(this.contributions.map(c => c.author.provider)).size,
      qualityScore: this.calculateQualityScore()
    };
  }

  /**
   * Complete the round and generate final output
   */
  complete(): RoundOutput {
    this.status = 'completed';
    this.endTime = new Date();
    
    const output = this.generateRoundOutput();
    
    logger.info(`✅ Round ${this.type} completed:`);
    logger.debug(`   Duration: ${Math.round(this.getDuration()/1000)}s`);
    logger.debug(`   Contributions: ${this.contributions.length}`);
    logger.debug(`   Quality Score: ${output.qualityScore}`);
    logger.debug(`   Consensus: ${output.consensusLevel}`);
    
    return output;
  }

  /**
   * Mark round as timed out
   */
  timeout(): RoundOutput {
    this.status = 'timeout';
    this.endTime = new Date();
    
    const output = this.generateRoundOutput();
    
    logger.warn(`⏰ Round ${this.type} timed out:`);
    logger.debug(`   Partial contributions: ${this.contributions.length}`);
    logger.debug(`   Quality Score: ${output.qualityScore}`);
    
    return output;
  }
}
