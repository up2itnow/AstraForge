/**
 * CollaborativeSessionManager - Main orchestrator for multi-LLM collaboration
 *
 * This class manages the entire lifecycle of collaborative sessions,
 * from initiation through completion, ensuring proper time management,
 * consensus building, and quality assurance.
 */
// vscode not required directly in this manager
import { EventEmitter } from 'events';
import { CollaborationError } from './types/collaborationTypes';
import { TimeManager } from './timing/TimeManager';
import { CollaborationRound } from './rounds/CollaborationRound';
import { logger } from '../utils/logger';
export class CollaborativeSessionManager extends EventEmitter {
    constructor(_llmManager, _vectorDB, testMode = false) {
        super();
        this._llmManager = _llmManager;
        this._vectorDB = _vectorDB;
        this.sessions = new Map();
        this.sessionIdCounter = 0;
        this.testMode = false;
        this.timeManager = new TimeManager();
        this.testMode = testMode || process.env.NODE_ENV === 'test';
        this.setupEventHandlers();
    }
    /**
     * Start a new collaborative session
     */
    async startSession(request) {
        const sessionId = `session_${++this.sessionIdCounter}_${Date.now()}`;
        logger.info(`🚀 Starting collaborative session ${sessionId}`);
        logger.debug(`📝 Prompt: ${request.prompt.substring(0, 100)}...`);
        try {
            // Validate request
            this.validateRequest(request);
            // Select participants
            const participants = await this.selectParticipants(request);
            // Create session
            const session = {
                id: sessionId,
                initiator: 'user', // TODO: Get actual user context
                participants,
                rounds: [],
                request,
                timeLimit: request.timeLimit || 300000, // 5 minutes default
                consensusThreshold: request.consensusThreshold || 66, // 66% default
                status: 'initializing',
                startTime: new Date(),
                metrics: this.initializeMetrics()
            };
            this.sessions.set(sessionId, session);
            // Set up session timer
            const _sessionTimerId = this.timeManager.createSessionTimer(sessionId, session.timeLimit, (remaining) => this.handleSessionWarning(sessionId, remaining), () => this.handleSessionTimeout(sessionId));
            // Update status and emit event
            session.status = 'active';
            this.emitEvent('session_started', sessionId, { session });
            // Execute collaboration rounds (skip in test mode to allow manual testing)
            if (!this.testMode) {
                await this.executeRounds(session);
            }
            return session;
        }
        catch (error) {
            logger.error(`❌ Failed to start session ${sessionId}:`, error);
            const collaborationError = error instanceof CollaborationError
                ? error
                : new CollaborationError(`Failed to start session: ${error}`, 'SESSION_START_FAILED', sessionId);
            this.emitEvent('error', sessionId, { error: collaborationError });
            throw collaborationError;
        }
    }
    /**
     * Execute collaboration rounds for a session
     */
    async executeRounds(session) {
        const maxRounds = session.request.maxRounds || 4;
        const roundTypes = ['propose', 'critique', 'synthesize', 'validate'];
        logger.info(`🔄 Executing up to ${maxRounds} collaboration rounds`);
        for (let roundNumber = 1; roundNumber <= maxRounds; roundNumber++) {
            if (session.status !== 'active') {
                logger.warn(`⏹️ Session ${session.id} no longer active, stopping rounds`);
                break;
            }
            const roundType = roundTypes[Math.min(roundNumber - 1, roundTypes.length - 1)];
            try {
                logger.info(`🎯 Starting round ${roundNumber}: ${roundType}`);
                const round = new CollaborationRound(session.id, roundNumber, roundType, this.getRoundPurpose(roundType, roundNumber), this.getRoundTimeLimit(roundType));
                // Add round to session
                session.rounds.push(round);
                this.emitEvent('round_started', session.id, { round });
                // Execute the round
                await this.executeRound(session, round);
                // Check if we've reached consensus
                if (this.hasReachedConsensus(session)) {
                    logger.info(`✅ Consensus reached in round ${roundNumber}`);
                    session.status = 'consensus_reached';
                    break;
                }
                // Check quality threshold
                if (this.meetsQualityThreshold(session)) {
                    logger.info(`🎯 Quality threshold met in round ${roundNumber}`);
                    break;
                }
            }
            catch (error) {
                logger.error(`❌ Error in round ${roundNumber}:`, error);
                // Continue to next round unless critical error
                if (error instanceof CollaborationError && error.code === 'CRITICAL_FAILURE') {
                    throw error;
                }
            }
        }
        // Finalize session
        await this.finalizeSession(session);
    }
    /**
     * Execute a single collaboration round
     */
    async executeRound(session, round) {
        // Set up round timer
        const roundTimerId = this.timeManager.createRoundTimer(round.type, round.timeLimit, (remaining) => this.handleRoundWarning(session.id, round.id, remaining), () => this.handleRoundTimeout(session.id, round.id));
        round.status = 'active';
        round.startTime = new Date();
        try {
            // Execute round based on type
            switch (round.type) {
                case 'propose':
                    await this.executeProposalRound(session, round);
                    break;
                case 'critique':
                    await this.executeCritiqueRound(session, round);
                    break;
                case 'synthesize':
                    await this.executeSynthesisRound(session, round);
                    break;
                case 'validate':
                    await this.executeValidationRound(session, round);
                    break;
            }
            round.status = 'completed';
            round.endTime = new Date();
        }
        catch (error) {
            logger.error(`❌ Round ${round.id} failed:`, error);
            round.status = 'timeout';
            throw error;
        }
        finally {
            this.timeManager.stopTimer(roundTimerId);
        }
    }
    /**
     * Execute a proposal round where LLMs generate initial ideas
     */
    async executeProposalRound(session, round) {
        logger.info(`💡 Executing proposal round`);
        const proposalPrompt = this.buildProposalPrompt(session.request);
        // Get proposals from all active participants in parallel
        const proposalPromises = session.participants
            .filter(p => p.isActive)
            .map(async (participant) => {
            try {
                const response = await this._llmManager.generateResponse(participant.provider.toLowerCase(), proposalPrompt);
                const contribution = {
                    id: `contrib_${Date.now()}_${participant.id}`,
                    roundId: round.id,
                    author: participant,
                    content: response,
                    confidence: 85, // Default confidence for proposals
                    buildUpon: [],
                    critiques: [],
                    timestamp: new Date(),
                    tokenCount: this.estimateTokenCount(response),
                    metadata: {
                        processingTime: 0, // TODO: Track actual processing time
                        retryCount: 0
                    }
                };
                round.contributions.push(contribution);
                this.emitEvent('contribution_received', session.id, { contribution });
                return contribution;
            }
            catch (error) {
                logger.error(`❌ Error getting proposal from ${participant.provider}:`, error);
                return null;
            }
        });
        await Promise.all(proposalPromises);
        logger.info(`💡 Collected ${round.contributions.length} proposals`);
    }
    /**
     * Execute a critique round where LLMs review and provide feedback
     */
    async executeCritiqueRound(session, round) {
        logger.info(`🔍 Executing critique round`);
        // Get previous round's contributions
        const previousRound = session.rounds[session.rounds.length - 2]; // -1 is current round, -2 is previous
        if (!previousRound || previousRound.contributions.length === 0) {
            throw new CollaborationError('No previous contributions to critique', 'NO_PREVIOUS_CONTRIBUTIONS', session.id, round.id);
        }
        const critiquePrompt = this.buildCritiquePrompt(previousRound.contributions);
        // Get critiques from participants
        const critiquePromises = session.participants
            .filter(p => p.isActive)
            .map(async (participant) => {
            try {
                const response = await this._llmManager.generateResponse(participant.provider.toLowerCase(), critiquePrompt);
                const contribution = {
                    id: `contrib_${Date.now()}_${participant.id}`,
                    roundId: round.id,
                    author: participant,
                    content: response,
                    confidence: 80,
                    buildUpon: previousRound.contributions.map(c => c.id),
                    critiques: previousRound.contributions.map(c => c.id),
                    timestamp: new Date(),
                    tokenCount: this.estimateTokenCount(response),
                    metadata: {
                        processingTime: 0,
                        retryCount: 0
                    }
                };
                round.contributions.push(contribution);
                this.emitEvent('contribution_received', session.id, { contribution });
                return contribution;
            }
            catch (error) {
                logger.error(`❌ Error getting critique from ${participant.provider}:`, error);
                return null;
            }
        });
        await Promise.all(critiquePromises);
        logger.info(`🔍 Collected ${round.contributions.length} critiques`);
    }
    /**
     * Execute a synthesis round where ideas are combined
     */
    async executeSynthesisRound(session, round) {
        logger.info(`🔀 Executing synthesis round`);
        // Get all previous contributions
        const allContributions = session.rounds
            .slice(0, -1) // Exclude current round
            .flatMap(r => r.contributions);
        if (allContributions.length === 0) {
            throw new CollaborationError('No contributions to synthesize', 'NO_CONTRIBUTIONS_TO_SYNTHESIZE', session.id, round.id);
        }
        const synthesisPrompt = this.buildSynthesisPrompt(allContributions);
        // Use the most capable participant for synthesis (TODO: Make this intelligent)
        const synthesizer = this.selectSynthesizer(session.participants);
        try {
            const response = await this._llmManager.generateResponse(synthesizer.provider.toLowerCase(), synthesisPrompt);
            const contribution = {
                id: `contrib_${Date.now()}_${synthesizer.id}`,
                roundId: round.id,
                author: synthesizer,
                content: response,
                confidence: 90,
                buildUpon: allContributions.map(c => c.id),
                critiques: [],
                timestamp: new Date(),
                tokenCount: this.estimateTokenCount(response),
                metadata: {
                    processingTime: 0,
                    retryCount: 0
                }
            };
            round.contributions.push(contribution);
            this.emitEvent('contribution_received', session.id, { contribution });
        }
        catch (error) {
            logger.error(`❌ Error in synthesis:`, error);
            throw error;
        }
        logger.info(`🔀 Synthesis completed`);
    }
    /**
     * Execute a validation round where the synthesized solution is validated
     */
    async executeValidationRound(session, round) {
        logger.info(`✅ Executing validation round`);
        // Get the synthesis from previous round
        const synthesisRound = session.rounds[session.rounds.length - 2];
        if (!synthesisRound || synthesisRound.contributions.length === 0) {
            throw new CollaborationError('No synthesis to validate', 'NO_SYNTHESIS_TO_VALIDATE', session.id, round.id);
        }
        const synthesisContribution = synthesisRound.contributions[0]; // Should be only one synthesis
        const validationPrompt = this.buildValidationPrompt(synthesisContribution, session.request);
        // Get validation from all participants
        const validationPromises = session.participants
            .filter(p => p.isActive && p.id !== synthesisContribution.author.id) // Exclude synthesizer
            .map(async (participant) => {
            try {
                const response = await this._llmManager.generateResponse(participant.provider.toLowerCase(), validationPrompt);
                const contribution = {
                    id: `contrib_${Date.now()}_${participant.id}`,
                    roundId: round.id,
                    author: participant,
                    content: response,
                    confidence: 85,
                    buildUpon: [synthesisContribution.id],
                    critiques: [],
                    timestamp: new Date(),
                    tokenCount: this.estimateTokenCount(response),
                    metadata: {
                        processingTime: 0,
                        retryCount: 0
                    }
                };
                round.contributions.push(contribution);
                this.emitEvent('contribution_received', session.id, { contribution });
                return contribution;
            }
            catch (error) {
                logger.error(`❌ Error getting validation from ${participant.provider}:`, error);
                return null;
            }
        });
        await Promise.all(validationPromises);
        logger.info(`✅ Collected ${round.contributions.length} validations`);
    }
    /**
     * Finalize the collaborative session and generate output
     */
    async finalizeSession(session) {
        logger.info(`🏁 Finalizing session ${session.id}`);
        session.endTime = new Date();
        session.status = 'completed';
        // Generate collaborative output
        session.output = await this.generateCollaborativeOutput(session);
        // Update metrics
        this.updateSessionMetrics(session);
        // Store in vector DB for future reference
        await this.storeSessionInVectorDB(session);
        this.emitEvent('session_completed', session.id, { session });
        logger.info(`✅ Session ${session.id} completed successfully`);
        logger.info(`📊 Quality Score: ${session.output.qualityScore}`);
        logger.info(`🎯 Consensus Level: ${session.output.consensusLevel}`);
        logger.info(`⚡ Token Usage: ${session.output.tokenUsage.totalTokens}`);
    }
    // Helper methods would continue here...
    // Due to length constraints, I'll include the key helper method signatures
    validateRequest(request) {
        if (!request.prompt || request.prompt.trim().length === 0) {
            throw new CollaborationError('Request prompt cannot be empty', 'INVALID_REQUEST');
        }
        if (request.priority && !['low', 'medium', 'high', 'critical'].includes(request.priority)) {
            throw new CollaborationError('Invalid priority level', 'INVALID_REQUEST');
        }
        if (request.timeLimit && request.timeLimit < 10000) {
            throw new CollaborationError('Time limit must be at least 10 seconds', 'INVALID_REQUEST');
        }
    }
    async selectParticipants(request) {
        // Create default participants based on available LLM providers
        const participants = [
            {
                id: 'openai_participant',
                provider: 'OpenAI',
                model: 'gpt-4',
                role: 'implementer',
                strengths: ['implementation', 'code_quality', 'bug_detection'],
                specializations: ['coding', 'technical_analysis'],
                performanceHistory: [],
                isActive: true,
                currentLoad: 0
            },
            {
                id: 'anthropic_participant',
                provider: 'Anthropic',
                model: 'claude-3-sonnet',
                role: 'reasoner',
                strengths: ['reasoning', 'logic', 'security'],
                specializations: ['architecture', 'analysis'],
                performanceHistory: [],
                isActive: true,
                currentLoad: 0
            },
            {
                id: 'grok_participant',
                provider: 'xAI',
                model: 'grok-beta',
                role: 'innovator',
                strengths: ['creativity', 'innovation', 'ux_design'],
                specializations: ['creative_solutions', 'user_experience'],
                performanceHistory: [],
                isActive: true,
                currentLoad: 0
            }
        ];
        // Filter by preferred participants if specified
        if (request.preferredParticipants && request.preferredParticipants.length > 0) {
            return participants.filter(p => request.preferredParticipants.includes(p.provider));
        }
        return participants;
    }
    initializeMetrics() {
        return {
            totalDuration: 0,
            roundCount: 0,
            contributionCount: 0,
            consensusAchieved: false,
            qualityImprovement: 0,
            tokenEfficiency: 0,
            participantUtilization: {},
            emergenceScore: 0
        };
    }
    getRoundPurpose(type, _roundNumber) {
        const purposes = {
            propose: `Generate initial ideas and approaches for the given problem`,
            critique: `Review and provide constructive feedback on previous proposals`,
            synthesize: `Combine the best elements from proposals and critiques into a unified solution`,
            validate: `Validate the synthesized solution for correctness, completeness, and quality`
        };
        return purposes[type];
    }
    getRoundTimeLimit(type) {
        const limits = {
            propose: 60000, // 1 minute
            critique: 45000, // 45 seconds
            synthesize: 90000, // 1.5 minutes
            validate: 30000 // 30 seconds
        };
        return limits[type];
    }
    buildProposalPrompt(request) {
        return `${request.prompt}\n\nPlease provide your initial proposal for addressing this request. Focus on your unique strengths and perspective.`;
    }
    buildCritiquePrompt(contributions) {
        const contributionTexts = contributions.map(c => `${c.author.provider}: ${c.content}`).join('\n\n');
        return `Please review these proposals and provide constructive critique:\n\n${contributionTexts}\n\nIdentify strengths, weaknesses, and suggestions for improvement.`;
    }
    buildSynthesisPrompt(contributions) {
        const contributionTexts = contributions.map(c => `${c.author.provider}: ${c.content}`).join('\n\n');
        return `Please synthesize these contributions into a unified, comprehensive solution:\n\n${contributionTexts}\n\nCombine the best elements and resolve any conflicts.`;
    }
    buildValidationPrompt(synthesis, request) {
        return `Please validate this synthesized solution against the original request:\n\nOriginal Request: ${request.prompt}\n\nSynthesized Solution: ${synthesis.content}\n\nProvide validation feedback and any final improvements.`;
    }
    selectSynthesizer(participants) {
        // TODO: Implement intelligent synthesizer selection
        return participants.find(p => p.provider === 'Anthropic') || participants[0];
    }
    estimateTokenCount(text) {
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
    hasReachedConsensus(_session) {
        // TODO: Implement consensus detection logic
        return false;
    }
    meetsQualityThreshold(_session) {
        // TODO: Implement quality threshold checking
        return false;
    }
    async generateCollaborativeOutput(session) {
        // Get all contributions from all rounds
        const allContributions = session.rounds.flatMap(round => round.contributions);
        // Find the final synthesized content (usually from the last synthesis or validation round)
        let finalContent = '';
        const lastRound = session.rounds[session.rounds.length - 1];
        if (lastRound && lastRound.contributions.length > 0) {
            // Use the last contribution as the final content
            finalContent = lastRound.contributions[lastRound.contributions.length - 1].content;
        }
        else if (allContributions.length > 0) {
            // Fallback: combine all contributions
            finalContent = allContributions.map(c => `**${c.author.provider}**: ${c.content}`).join('\n\n');
        }
        else {
            finalContent = 'No collaborative output generated - session completed without contributions.';
        }
        // Calculate quality score (average of contribution confidence scores)
        const qualityScore = allContributions.length > 0
            ? allContributions.reduce((sum, c) => sum + c.confidence, 0) / allContributions.length
            : 0;
        // Determine consensus level
        const consensusLevel = this.determineSessionConsensus(session);
        // Calculate total token usage
        const totalTokens = allContributions.reduce((sum, c) => sum + c.tokenCount, 0);
        const tokensPerParticipant = {};
        allContributions.forEach(c => {
            const key = c.author.id;
            tokensPerParticipant[key] = (tokensPerParticipant[key] || 0) + c.tokenCount;
        });
        const tokensPerRound = {};
        session.rounds.forEach((round, index) => {
            tokensPerRound[index] = round.contributions.reduce((sum, c) => sum + c.tokenCount, 0);
        });
        return {
            sessionId: session.id,
            content: finalContent,
            sources: allContributions,
            rounds: session.rounds.map(r => r.roundOutput).filter((r) => r !== undefined),
            emergenceIndicators: this.calculateEmergenceIndicators(session),
            qualityScore,
            consensusLevel,
            synthesisLog: this.generateSynthesisLog(session),
            improvementMetrics: this.calculateImprovementMetrics(session),
            tokenUsage: {
                totalTokens,
                tokensPerParticipant,
                tokensPerRound,
                efficiency: totalTokens > 0 ? qualityScore / totalTokens * 1000 : 0, // Quality per 1000 tokens
                budgetUtilization: session.request.costBudget ? (totalTokens / session.request.costBudget) * 100 : 0,
                costEstimate: totalTokens * 0.002 // Rough estimate at $0.002 per token
            }
        };
    }
    updateSessionMetrics(session) {
        const endTime = session.endTime || new Date();
        session.metrics.totalDuration = endTime.getTime() - session.startTime.getTime();
        session.metrics.roundCount = session.rounds.length;
        session.metrics.contributionCount = session.rounds.reduce((sum, round) => sum + round.contributions.length, 0);
        session.metrics.consensusAchieved = session.status === 'consensus_reached';
        if (session.metrics.consensusAchieved && session.metrics.totalDuration > 0) {
            session.metrics.consensusTime = session.metrics.totalDuration;
        }
        // Calculate participant utilization
        const allContributions = session.rounds.flatMap(round => round.contributions);
        session.participants.forEach(participant => {
            const participantContributions = allContributions.filter(c => c.author.id === participant.id);
            session.metrics.participantUtilization[participant.id] =
                (participantContributions.length / Math.max(session.rounds.length, 1)) * 100;
        });
    }
    determineSessionConsensus(_session) {
        // Simple implementation - return based on session status
        // Note: _session parameter is unused but kept for future implementation
        return 'simple_majority';
    }
    calculateEmergenceIndicators(_session) {
        // Simple implementation - return empty array for now
        return [];
    }
    generateSynthesisLog(_session) {
        // Simple implementation - return empty array for now
        return [];
    }
    calculateImprovementMetrics(_session) {
        // Simple implementation - return empty array for now
        return [];
    }
    async storeSessionInVectorDB(session) {
        try {
            if (session.output) {
                const sessionSummary = `Collaborative session: ${session.request.prompt}\nResult: ${session.output.content.substring(0, 500)}...`;
                await this._vectorDB.addDocument(`session_${session.id}`, sessionSummary, {
                    type: 'collaboration_session',
                    sessionId: session.id,
                    qualityScore: session.output.qualityScore,
                    consensusLevel: session.output.consensusLevel,
                    participants: session.participants.map(p => p.provider),
                    timestamp: session.startTime.toISOString()
                });
            }
        }
        catch (error) {
            logger.warn(`Failed to store session ${session.id} in VectorDB:`, error);
            // Don't throw - this is not critical for session completion
        }
    }
    handleSessionWarning(sessionId, remaining) {
        logger.warn(`⚠️ Session ${sessionId} time warning: ${Math.round(remaining / 1000)}s remaining`);
        this.emitEvent('timeout_warning', sessionId, { remaining });
    }
    handleSessionTimeout(sessionId) {
        logger.warn(`⏰ Session ${sessionId} timeout - forcing completion`);
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'timeout';
            this.finalizeSession(session);
        }
    }
    handleRoundWarning(sessionId, roundId, remaining) {
        logger.warn(`⚠️ Round ${roundId} time warning: ${Math.round(remaining / 1000)}s remaining`);
    }
    handleRoundTimeout(sessionId, roundId) {
        logger.warn(`⏰ Round ${roundId} timeout`);
    }
    setupEventHandlers() {
        // Set up internal event handling
    }
    emitEvent(type, sessionId, data) {
        const event = {
            type,
            sessionId,
            timestamp: new Date(),
            data
        };
        this.emit(type, event);
    }
    /**
     * Get session by ID
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    /**
     * Get all active sessions
     */
    getActiveSessions() {
        return Array.from(this.sessions.values()).filter(s => s.status === 'active');
    }
    /**
     * Complete a session and return final results
     */
    async completeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new CollaborationError(`Session ${sessionId} not found`, 'SESSION_NOT_FOUND');
        }
        // Generate final synthesis and metrics
        const output = await this.generateCollaborativeOutput(session);
        // Update session status
        session.status = 'completed';
        session.endTime = new Date();
        // Store results in vector DB
        session.output = output; // Set the output first
        await this.storeSessionInVectorDB(session);
        logger.info(`✅ Completed collaborative session ${sessionId}`);
        this.emit('session_completed', { sessionId, output });
        return output;
    }
    /**
     * Manually execute rounds for a session (for testing)
     */
    async executeSessionRounds(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        await this.executeRounds(session);
    }
    /**
     * Dispose of the session manager
     */
    dispose() {
        this.timeManager.dispose();
        this.sessions.clear();
        this.removeAllListeners();
    }
}
//# sourceMappingURL=CollaborativeSessionManager.js.map