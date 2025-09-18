/**
 * Core type definitions for the True Multi-LLM Collaboration System
 *
 * This file defines all interfaces, types, and enums used throughout
 * the collaboration system to ensure type safety and consistency.
 */

export type LLMProvider = 'OpenAI' | 'Anthropic' | 'xAI' | 'OpenRouter';
export type SessionStatus =
  | 'initializing'
  | 'active'
  | 'consensus_reached'
  | 'timeout'
  | 'completed'
  | 'failed';
export type RoundType = 'propose' | 'critique' | 'synthesize' | 'validate';
export type ConsensusLevel =
  | 'unanimous'
  | 'qualified_majority'
  | 'simple_majority'
  | 'forced_consensus';

/**
 * Core collaboration session interface
 */
export interface CollaborativeSession {
  id: string;
  initiator: string;
  participants: LLMParticipant[];
  rounds: CollaborationRound[];
  request: CollaborationRequest;
  timeLimit: number; // in milliseconds
  consensusThreshold: number; // percentage (0-100)
  status: SessionStatus;
  startTime: Date;
  endTime?: Date;
  metrics: SessionMetrics;
  output?: CollaborativeOutput;
}

/**
 * LLM participant in a collaborative session
 */
export interface LLMParticipant {
  id: string;
  provider: LLMProvider;
  model: string;
  role: string;
  strengths: string[];
  specializations: string[];
  performanceHistory: PerformanceRecord[];
  isActive: boolean;
  currentLoad: number; // 0-100 percentage
}

/**
 * Individual collaboration round
 */
export interface CollaborationRound {
  id: string;
  sessionId: string;
  roundNumber: number;
  type: RoundType;
  purpose: string;
  timeLimit: number;
  startTime: Date;
  endTime?: Date;
  contributions: Contribution[];
  roundOutput?: RoundOutput;
  status: 'pending' | 'active' | 'completed' | 'timeout';
}

/**
 * Individual contribution from an LLM participant
 */
export interface Contribution {
  id: string;
  roundId: string;
  author: LLMParticipant;
  content: string;
  confidence: number; // 0-100
  buildUpon: string[]; // IDs of contributions this builds upon
  critiques: string[]; // IDs of contributions this critiques
  timestamp: Date;
  tokenCount: number;
  metadata: ContributionMetadata;
}

/**
 * Metadata for contributions
 */
export interface ContributionMetadata {
  processingTime: number; // milliseconds
  retryCount: number;
  qualityScore?: number;
  semanticSimilarity?: number;
  innovationScore?: number;
  technicalAccuracy?: number;
}

/**
 * Output from a collaboration round
 */
export interface RoundOutput {
  roundId: string;
  type: RoundType;
  synthesizedContent: string;
  participatingContributions: string[]; // contribution IDs
  consensusLevel: ConsensusLevel;
  qualityScore: number;
  emergenceIndicators: EmergenceMetric[];
  nextRoundRecommendation?: RoundType;
}

/**
 * Final output from a collaborative session
 */
export interface CollaborativeOutput {
  sessionId: string;
  content: string;
  sources: Contribution[];
  rounds: RoundOutput[];
  emergenceIndicators: EmergenceMetric[];
  qualityScore: number;
  consensusLevel: ConsensusLevel;
  synthesisLog: SynthesisStep[];
  improvementMetrics: ImprovementMetric[];
  tokenUsage: TokenUsageMetrics;
}

/**
 * Request to initiate a collaborative session
 */
export interface CollaborationRequest {
  prompt: string;
  context?: string;
  requirements?: string[];
  constraints?: string[];
  preferredParticipants?: LLMProvider[];
  maxRounds?: number;
  timeLimit?: number;
  consensusThreshold?: number;
  qualityThreshold?: number;
  costBudget?: number; // in tokens
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Metrics for tracking session performance
 */
export interface SessionMetrics {
  totalDuration: number;
  roundCount: number;
  contributionCount: number;
  consensusAchieved: boolean;
  consensusTime?: number;
  qualityImprovement: number; // percentage vs single-LLM baseline
  tokenEfficiency: number; // quality per token
  participantUtilization: Record<string, number>; // participant ID -> utilization %
  emergenceScore: number; // measure of emergent intelligence
}

/**
 * Performance record for LLM participants
 */
export interface PerformanceRecord {
  sessionId: string;
  taskType: string;
  qualityScore: number;
  contributionValue: number;
  collaborationEffectiveness: number;
  tokenEfficiency: number;
  timestamp: Date;
}

/**
 * Metrics indicating emergent intelligence
 */
export interface EmergenceMetric {
  type: 'novel_solution' | 'synthesis_quality' | 'collective_insight' | 'innovation_leap';
  score: number; // 0-100
  description: string;
  evidence: string[];
  contributingSources: string[]; // contribution IDs
}

/**
 * Step in the synthesis process
 */
export interface SynthesisStep {
  stepNumber: number;
  operation: 'merge' | 'resolve_conflict' | 'enhance' | 'validate';
  inputs: string[]; // contribution IDs
  output: string;
  reasoning: string;
  confidenceScore: number;
}

/**
 * Metrics showing improvement over single-LLM baseline
 */
export interface ImprovementMetric {
  dimension: 'quality' | 'innovation' | 'completeness' | 'accuracy' | 'creativity';
  baselineScore: number;
  collaborativeScore: number;
  improvement: number; // percentage
  significance: 'minor' | 'moderate' | 'major' | 'breakthrough';
}

/**
 * Token usage tracking
 */
export interface TokenUsageMetrics {
  totalTokens: number;
  tokensPerParticipant: Record<string, number>;
  tokensPerRound: Record<number, number>;
  efficiency: number; // quality score per token
  budgetUtilization: number; // percentage of budget used
  costEstimate: number; // in USD
}

/**
 * Configuration for collaboration system
 */
export interface CollaborationConfig {
  defaultTimeLimit: number;
  defaultConsensusThreshold: number;
  maxParticipants: number;
  maxRounds: number;
  qualityThreshold: number;
  tokenBudgetDefault: number;
  enableCaching: boolean;
  enableLearning: boolean;
  debugMode: boolean;
}

/**
 * Events emitted by the collaboration system
 */
export interface CollaborationEvent {
  type:
    | 'session_started'
    | 'round_started'
    | 'contribution_received'
    | 'consensus_reached'
    | 'timeout_warning'
    | 'session_completed'
    | 'error';
  sessionId: string;
  timestamp: Date;
  data: any;
}

/**
 * Error types specific to collaboration system
 */
export class CollaborationError extends Error {
  constructor(
    message: string,
    public code: string,
    public sessionId?: string,
    public roundId?: string
  ) {
    super(message);
    this.name = 'CollaborationError';
  }
}

/**
 * Time management related interfaces
 */
export interface TimeManager {
  startTimer(duration: number, callbacks?: TimerCallbacks): string;
  stopTimer(timerId: string): void;
  getRemainingTime(timerId: string): number;
  isExpired(timerId: string): boolean;
}

export interface TimerCallbacks {
  onWarning?: (remainingTime: number) => void;
  onTimeout?: () => void;
  onTick?: (remainingTime: number) => void;
}

/**
 * Consensus building interfaces
 */
export interface ConsensusResult {
  achieved: boolean;
  level: ConsensusLevel;
  agreement: number; // percentage
  dissent: string[]; // minority opinions
  finalDecision: string;
  votingRecord?: VotingRecord;
}

export interface VotingRecord {
  options: string[];
  votes: Record<string, string>; // participant ID -> voted option
  results: Record<string, number>; // option -> vote count
  winner: string;
  margin: number; // percentage
}

/**
 * Task assignment interfaces
 */
export interface TaskAssignment {
  taskId: string;
  assignedParticipant: string; // participant ID
  rationale: string;
  specialization: string;
  priority: number;
  dependencies: string[]; // other task IDs
  estimatedTokens: number;
  estimatedDuration: number; // milliseconds
}

export interface StrengthProfile {
  participantId: string;
  strengths: Record<string, number>; // strength category -> score (0-100)
  weaknesses: string[];
  specializations: string[];
  historicalAccuracy: number;
  adaptabilityScore: number;
  collaborationScore: number;
  lastUpdated: Date;
}
